---
layout: post
date:   2021-05-30 22:00:00 +0200
categories: emulation
tags: [emuriscv, riscv, linux, emulation]
title: "Breaking and fixing the RISC-V Store-Conditional instructions"
image: lrsc.png
---

Trying to debug the Linux boot process on the `emuriscv` RISC-V emulator has lead me to discover another fun bug, one that appears when you don't read the specification as thoroughly as you should.

The bug manifested itself by an endless loop that began when the code was trying to return from the very first user-mode system call.

Whenever a program started by Linux kernel invokes a system call, the execution context (registers) is saved (see [_save_context](https://github.com/torvalds/linux/blob/v5.10/arch/riscv/kernel/entry.S#L32)), so it can be returned back to the state after the system call is finished. 

When resuming from this system call, the kernel (in version 5.10), does some cleanup in a symbol called [resume_userspace](https://github.com/torvalds/linux/blob/v5.10/arch/riscv/kernel/entry.S), that saves the kernel state (doing the system call in kernel mode), then proceeds to restore the registers from the stack, so they have the same state as was previously saved when the syscall was called - this is a subroutine called `restore_all` (below).

```c
resume_userspace:
	/* Interrupts must be disabled here so flags are checked atomically */
	lw	s0,0(tp) // REG_L s0, TASK_TI_FLAGS(tp) 
	andi s1, s0, _TIF_WORK_MASK
	bnez s1, work_pending

	/* Save unwound kernel stack pointer in thread_info */
	addi	s0,sp,144 //addi s0, sp, PT_SIZE_ON_STACK
	sw	s0,8(tp)	//REG_S s0, TASK_TI_KERNEL_SP(tp)

	/* Save TP into the scratch register , so we can find the kernel data */
	csrw CSR_SCRATCH, tp

restore_all:
	lw	a0,128(sp)	//REG_L a0, PT_STATUS(sp)
	/* ... here we clear any existing reservation  */
	lw	a2,0(sp)
	sc.w	zero,a2,(sp)

	csrw sstatus, a0
	csrw sepc, a2

	lw	ra,4(sp)	//REG_L x1,  PT_RA(sp)
	lw	gp,12(sp)	//REG_L x3,  PT_GP(sp) 
	lw	tp,16(sp)	//REG_L x4,  PT_TP(sp) 
	lw	t0,20(sp)	//REG_L x5,  PT_T0(sp) 
	...
	lw	t5,120(sp)  //REG_L x30, PT_T5(sp)
	lw	t6,124(sp)  //REG_L x31, PT_T6(sp)

	lw	sp,8(sp)    //REG_L x2,  PT_SP(sp)

	sret
```

### What happened (incorrectly):

As we encountered the `sc` instruction, the condition was not applied, the `a2` register was written to against the spec.

```c
sc.w	zero,a2,(sp) //rd, rs2, rs1
csrw sstatus, a0
csrw sepc, a2
...
sret
```

The subsequent `csrw sepc, a2` then stored this invalid value in `sepc`. As we also know from the [ecalls/syscalls post]({{<ref "2021-04-21-ecalls-and-syscalls">}}), kernel returns from the system call via the `sret` instruction to the address stored in the `sepc` register.

### What should have happened

If the code was to execute correctly, `sepc` would have pointed to the address just after the original `ecall` instruction as set [here in handle_syscall](https://github.com/torvalds/linux/blob/v5.10/arch/riscv/kernel/entry.S#L176).

A [comment](https://github.com/torvalds/linux/blob/v5.10/arch/riscv/kernel/entry.S#L267) in the kernel says something relevant:

>The current load reservation is effectively part of the processor's state, in the sense that load reservations cannot be shared between different hart contexts.  We can't actually save and restore a load reservation, so instead here we clear any existing reservation -- it's always legal for implementations to clear load reservations at any point (as long as the forward progress guarantee is kept, but we'll ignore that here).

### Load-reserved / Store-conditional

The [load-reserved/store-conditional](https://en.wikipedia.org/wiki/Load-link/store-conditional) (LR/SC) instructions are used in multithreading to achieve synchronization. They are used to implement an atomic read-modify-write operation.

LR loads a word from an address in the `rs1`, and registers a _reservation_ on that memory address. SC writes a word in
`rs2` to the address in `rs1`, if a valid reservation still exists on that address, and stores a success code to `rd`.

### What does the spec say?

The [specification](https://riscv.org/wp-content/uploads/2017/05/riscv-spec-v2.2.pdf) has a chapter **7.2 Load-Reserved/Store-Conditional Instructions**, that deal with complex atomic operations on a single memory word. 

Note that the spec also says:

_We restricted the length of LR/SC sequences to fit within
64 contiguous instruction bytes in the base ISA to avoid undue restrictions on instruction cache and TLB size and associativity_.

Some don't seem to implement this constraint, for example in QEMU ([trans_rva.c.inc](https://github.com/qemu/qemu/blob/3e9f48bcdabe57f8f90cf19f01bbbf3c86937267/target/riscv/insn_trans/trans_rva.c.inc)) doesn't clear `load_res`, but Spike (riscv-isa-sim) does so at some intervals in [sim.cc](https://github.com/riscv/riscv-isa-sim/blob/21684fd9b073cf9bd8f8d23cfc5f94ce361f170c/riscv/sim.cc#L200).

## Fixing the implementation

My initial version didn't include any of the conditional logic, and I was left with a pretty nondescript `//TODO LR/SC reservation` comment.

It was fixed by introducing a `load_reservation` state variable that is set by `lr` and checked (and cleared) by `sc` in this [emuriscv commit](https://github.com/jborza/emuriscv/commit/80b8e838c1658b77281defc0bde79247c2f74839). 

There's also a [LRSC test case](https://github.com/riscv/riscv-tests/blob/master/isa/rv64ua/lrsc.S) in the `riscv-tests` repository that goes through the individual test cases that's also worth checking out.

