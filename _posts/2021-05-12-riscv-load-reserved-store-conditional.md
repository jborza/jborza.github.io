---
layout: post
published: true
date:   2021-05-12 06:00:00 +0200
categories: emulation
tags: [emuriscv, riscv, linux]
title: "Misunderstanding the RISC-V specification on LR/SC instuctions"
---

TODO split into articles:
✔️ - misunderstanding ecalls and fixing the output once again (SBI 0.2, UART), MISA identifier
- **Misreading the spec on Store-Conditional instructions (and fixing emuriscv)** entering user mode from supervisor mode, fixing sc and l (and into the spec, as I misunderstood how long do a reservation last, that we only need to keep 1 address)

Debugging the Linux boot process on the `emuriscv` RISC-V emulator has lead me to discover another fun bug that appears when you don't read the specification as thoroughly as you should.

The problem appeared when the code was trying to return from the first user-mode system call, as the emulator entered an endless loop.

### What does the spec say?

The [specification](https://riscv.org/wp-content/uploads/2017/05/riscv-spec-v2.2.pdf) has a chapter **7.2 Load-Reserved/Store-Conditional Instructions**, that deal with complex atomic operations on a single memory word

I have misunderstood how long the *reservation* is supposed to last. 

Whenever a program started by Linux kernel invokes a system call, the execution context is saved, so it can be returned back to the state after the system call is finished. 

The kernel (in version 5.10) does some cleanup in a symbol called [`resume_userspace`](https://github.com/torvalds/linux/blob/v5.10/arch/riscv/kernel/entry.S), that saves kernel state, then proceeds to restore the registers from the stack, so they have the same state as was previously saved when the syscall was called.


```c
resume_userspace:
	/* Interrupts must be disabled here so flags are checked atomically */
	REG_L s0, TASK_TI_FLAGS(tp) /* current_thread_info->flags */
	andi s1, s0, _TIF_WORK_MASK
	bnez s1, work_pending

	/* Save unwound kernel stack pointer in thread_info */
	addi s0, sp, PT_SIZE_ON_STACK
	REG_S s0, TASK_TI_KERNEL_SP(tp)

	/* Save TP into the scratch register , so we can find the kernel data */
	csrw CSR_SCRATCH, tp

restore_all:
	REG_L a0, PT_STATUS(sp)
	/*
	 * The current load reservation is effectively part of the processor's
	 * state, ....  We can't actually save and restore a load
	 * reservation, so instead here we clear any existing reservation  */
	REG_L  a2, PT_EPC(sp)
	REG_SC x0, a2, PT_EPC(sp)

	csrw CSR_STATUS, a0
	csrw CSR_EPC, a2

	REG_L x1,  PT_RA(sp)
	REG_L x3,  PT_GP(sp)
	REG_L x4,  PT_TP(sp)
	REG_L x5,  PT_T0(sp)
	...
	REG_L x30, PT_T5(sp)
	REG_L x31, PT_T6(sp)

	REG_L x2,  PT_SP(sp)

	sret
```

## What actually happens:


```nasm
# Save TP into the scratch register , so we can find the kernel data structures again
csrw CSR_SCRATCH, tp
# CSR_SSCRATCH was set to 0xc2024000

#This section is interesting:
# REG_L  a2, PT_EPC(sp)
lw	a2,0(sp)
# REG_SC x0, a2, PT_EPC(sp)
sc.w	zero,a2,(sp)
```

csrw CSR_STATUS, a0
csrw CSR_EPC, a2

I realized I'm not entirely sure I've tested the `sc.w` instruction. It should be a **conditional** store, and it wasn't.

Something's going on at this address:
~lr.w~ lr: c21f8050
~sc.w~ lr: c21f8050
!!!!~~c0401010:  00012603
c0401014:  18C1202F
~sc.w~ lr: c21f8050

c0401010:  00012603
c0401014:  18C1202F
sc x0,x12,(x2)
~sc.w~ lr: c21f8050 addr: c2029f70 value:7da80a00
dest value: 7da80a00


Items from PC stack:

```
# kernel_execve
...
# return retval; 
c04ae674:	01c12083          	lw	ra,28(sp)
c04ae678:	01812403          	lw	s0,24(sp)
c04ae67c:	01012903          	lw	s2,16(sp)
c04ae680:	00c12983          	lw	s3,12(sp)
c04ae684:	00812a03          	lw	s4,8(sp)
c04ae688:	00412a83          	lw	s5,4(sp)
c04ae68c:	00048513          	mv	a0,s1
c04ae690:	01412483          	lw	s1,20(sp)
c04ae694:	02010113          	addi	sp,sp,32
c04ae698:	00008067          	ret
# run_init_process
# return kernel_execve(...)
c05b2378:	01c12083          	lw	ra,28(sp)
c05b237c:	01812403          	lw	s0,24(sp)
c05b2380:	01412483          	lw	s1,20(sp)
c05b2384:	01012903          	lw	s2,16(sp)
c05b2388:	00c12983          	lw	s3,12(sp)
c05b238c:	02010113          	addi	sp,sp,32
c05b2390:	00008067          	ret
# void rodata_test(void)
c05b5158:	00050613          	mv	a2,a0
c05b515c:	08050663          	beqz	a0,c05b51e8 <kernel_init+0x10c>
c05b51e8:	00c12083          	lw	ra,12(sp)
c05b51ec:	00812403          	lw	s0,8(sp)
c05b51f0:	00412483          	lw	s1,4(sp)
c05b51f4:	00000513          	li	a0,0
c05b51f8:	01010113          	addi	sp,sp,16
c05b51fc:	00008067          	ret
# ret_from_exception()
C0400FE4  08012403          	lw	s0,128(sp)
C0400FE8 # c0400fe8
C0400FEC # 10047413          	andi	s0,s0,256
C0400FF0 # 00041e63          	bnez	s0,c040100c <restore_all>
C0400FF4 # 00022403          	lw	s0,0(tp) # 0 <PECOFF_FILE_ALIGNMENT-0x200>
C0400FF8 # 00e47493          	andi	s1,s0,14
C0400FFC # 0a049263          	bnez	s1,c04010a0 <work_pending>
C0401000 # 09010413          	addi	s0,sp,144
C0401004 # 00822423          	sw	s0,8(tp) # 8 <PECOFF_FILE_ALIGNMENT-0x1f8>
C0401008 # 14021073          	csrw	sscratch,tp
C040100C # 08012503          	lw	a0,128(sp)
C0401010 # 00012603          	lw	a2,0(sp)
C0401014 # 18c1202f          	sc.w	zero,a2,(sp)
C0401018 # 10051073          	csrw	sstatus,a0
C040101C
C0401020
C0401024
```


!!!! 

according to instruction dump it's an `ebreak` being called in the debugger within `debug_vm_pgtable` 

c05b3f08:  00C12083 __munlock_isolate_lru_page
c05b3f0c:  00812403 __munlock_isolate_lru_page
c05b3f10:  00992023 __munlock_isolate_lru_page
c05b3f14:  00412483 __munlock_isolate_lru_page
c05b3f18:  00012903 __munlock_isolation_failed
c05b3f1c:  01010113 __munlock_isolation_failed
c05b3f20:  00008067 __munlock_isolation_failed
c000e008:  FFB00793 init_devpts_fs
c000e00c:  60F4A02F init_devpts_fs
c000e010:  0004A783 init_devpts_fs
c000e014:  0047F793 init_devpts_fs
c000e018:  00078463 init_devpts_fs
c000e020:  00000793 init_devpts_fs
c000e024:  0EF4A7AF init_devpts_fs
c000e028:  0004A783 init_devpts_fs
c000e02c:  00078463 init_devpts_fs
c000e030:  00100073 init_devpts_fs

code corresponding to it:
c000e008:	ffb00793          	li	a5,-5
c000e00c:	60f4a02f          	amoand.w	zero,a5,(s1)
c000e010:	0004a783          	lw	a5,0(s1)
	return pte_val(pte) & _PAGE_WRITE;
c000e014:	0047f793          	andi	a5,a5,4
	WARN_ON(pte_write(pte));
c000e018:	00078463          	beqz	a5,c000e020 <debug_vm_pgtable+0x208>
c000e01c:	00100073          	ebreak
#define ATOMIC_OPS()							\
	ATOMIC_OP(int,   , 4)						\
	ATOMIC_OP(s64, 64, 8)
#endif

ATOMIC_OPS()
c000e020:	00000793          	li	a5,0
c000e024:	0ef4a7af          	amoswap.w.aqrl	a5,a5,(s1)
c000e028:	0004a783          	lw	a5,0(s1)
	WARN_ON(!pte_none(pte));
c000e02c:	00078463          	beqz	a5,c000e034 <debug_vm_pgtable+0x21c>
c000e030:	00100073          	ebreak

the 0ef4a7af          	(amoswap.w.aqrl	a5,a5,(s1)) is very suspicious


## The SEPC destination address

so why is SEPC calling `0x7da80a00`? I don't have any memory maped at that region. 

This then results in a page fault. Our operation is fetch, so it should yield CAUSE_FETCH_PAGE_FAULT
and set state->pending_exception to CAUSE_FETCH_PAGE_FAULT and state->pending_tval = 0x7da80a00 (offending virtual address)

Then we move to raise_exception and should be handled by raise_exception. However, since raise_exception DOES NOT handle privilege U (priv_U), its implementation is wrong.



See Bellard's raise_exception2. or take_trap in spike: https://github.com/riscv/riscv-isa-sim/blob/2e60b8b06174771e1155f2dfe693cc49f8958def/riscv/processor.cc#L453

CSR_STVEC was pointing to: 0xc0400e50. instruction is: 0x01ecee90
it's read CSR 0x140 with some arguments. (CSR_SSCRATCH)

The corresponding code is:

```
c0400e50 <handle_exception>:
	/*
	 * If coming from userspace, preserve the user thread pointer and load
	 * the kernel thread pointer.  If we came from the kernel, the scratch
	 * register will contain 0, and we should continue on the current TP.
	 */
	csrrw tp, CSR_SCRATCH, tp
c0400e50:	14021273          	csrrw	tp,sscratch,tp
	bnez tp, _save_context
c0400e54:	00021663          	bnez	tp,c0400e60 <_save_context>
```


What happened (TODO describe in more detail) is that we wanted to execute something located at virtual memory `0x7da80a00`, the MMU raised a page fault, it was handled by the kernel and now hopefully we should have the page table populated. Then we're restoring back from the supervisor mode and back to where we started.
New status is 0x000000a0

For some reason when I try to implement the trap right, (using the delegation bit), it breaks the boot from BBL to Linux. 

For the very first trap we need to 


If I fix the traps a bit, I get here:

This is with the dynamically linked `busybox`, it might be causing trouble.
status: 00000020 badaddr: cccccccc cause: 0000000c
This seems as an access violation trying to access address 0xcccccccc

```
[    4.661152][    T1] Run /init as init process
[    4.662543][    T1]   with arguments:
[    4.663826][    T1]     /init
[    4.664988][    T1]     bootmem_debug
[    4.668992][    T1]   with environment:
[    4.673043][    T1]     HOME=/
[    4.676950][    T1]     TERM=linux
[    4.691265][    T1] init[1]: unhandled signal 11 code 0x1 at 0xcccccccc
[    4.696352][    T1] CPU: 0 PID: 1 Comm: init Not tainted 5.10.0 #24
[    4.701098][    T1] epc: cccccccc ra : 000b4cd0 sp : 9d420de0
[    4.705710][    T1]  gp : 001a7830 tp : c1c24000 t0 : 00000000
[    4.710299][    T1]  t1 : 00000000 t2 : 00000000 s0 : 000b5244
[    4.714923][    T1]  s1 : 000b531c a0 : 9d420ef0 a1 : 00000000
[    4.719526][    T1]  a2 : 00000000 a3 : 00177adc a4 : 0000001e
[    4.724154][    T1]  a5 : cccccccc a6 : 001a5fd0 a7 : 00000000
[    4.728722][    T1]  s2 : 00000000 s3 : 00000000 s4 : 00000000
[    4.733325][    T1]  s5 : 00000000 s6 : 00000000 s7 : cccccccc
[    4.737927][    T1]  s8 : 00000000 s9 : cccccccc s10: 00000000
[    4.742530][    T1]  s11: cccccccc t3 : 00000000 t4 : 00000000
[    4.747068][    T1]  t5 : 001a6000 t6 : 00000000
[    4.751455][    T1] status: 00000020 badaddr: cccccccc cause: 0000000c
[    4.757164][    T1] Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000000b
[    4.765105][    T1] CPU: 0 PID: 1 Comm: init Not tainted 5.10.0 #24
[    4.769613][    T1] Call Trace:
[    4.773936][    T1] [<c040234c>] walk_stackframe+0x0/0xf4
[    4.778652][    T1] [<c05b2514>] show_stack+0x44/0x58
[    4.783340][    T1] [<c05b4e68>] dump_stack+0x30/0x40
[    4.787991][    T1] [<c05b26b8>] panic+0x12c/0x31c
[    4.792570][    T1] [<c04096ac>] do_exit+0x13c/0x6e4
[    4.797175][    T1] [<c0409d50>] sys_exit_group+0x0/0x24
[    4.801854][    T1] [<c04137e0>] get_signal+0x530/0x590
[    4.806560][    T1] [<c0401a08>] do_notify_resume+0x40/0x2c4
[    4.811309][    T1] [<c0400fe4>] ret_from_exception+0x0/0x10
[    4.816082][    T1] ---[ end Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000000b ]---
```


### load / store faults
Another note to self: Should be probably handling another kind of page faults. Right now we only handle fetch page faults properly, but should be doing load/store page faults. Implemented a naive solution with state->has_pending_exception set in here:

```c
int get_memory_target(State* state, word virtual_address, enum access_type access_type, MemoryTarget* target) {
	word physical_address;
	int result = translate_address(state, virtual_address, access_type, &physical_address);
	if (result == PAGE_FAULT) {
		if (access_type == LOAD)
			state->pending_exception = CAUSE_LOAD_PAGE_FAULT;
		else if (access_type == STORE)
			state->pending_exception = CAUSE_STORE_PAGE_FAULT;
		else //fetch
			state->pending_exception = CAUSE_FETCH_PAGE_FAULT;
		state->pending_tval = virtual_address;
		state->has_pending_exception = 1;
		return result;
	}
	return get_memory_target_physical(state, physical_address, target);
}
```

TODO check if csrrw is implemented correctly - whether it writes stuff to the correct register - see riscv_isa_sim implementation in csrrw.h, it uses something called `old` and uses it in different order.

```c
int csr = validate_csr(insn.csr(), true);
reg_t old = p->get_csr(csr, insn, true);
p->set_csr(csr, RS1);
WRITE_RD(sext_xlen(old));
serialize();
```


Now busybox crashes at:
pc=0x001800bc
target address=0x001f3fe0
instruction=0x0007a783 //   1800bc:	0007a783          	lw	a5,0(a5)

I need a breakpoint at `lw` when state->pc==0x001800c0 (post-incremented already)

BUG in my LW

Now I see it in the debugger.
The instruction `lw	a5,0(a5)` first attempted to read value pointed to by `a5` into `a5`. 
The incorrect implementation overwrote the destination register with a dummy value returned by memory read, which also triggered a page fault.
By the time the page was fetched and the control returned back to the binary, the `rd` register, which was the same `a5` as the `rs1` register 
now contained a dummy value instead of the desired address.


Related fixes: 
[github commit](https://github.com/jborza/emuriscv/commit/80b8e838c1658b77281defc0bde79247c2f74839)