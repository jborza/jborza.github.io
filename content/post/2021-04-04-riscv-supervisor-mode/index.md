---
layout: post
published: true
date:   2021-04-04 16:00:00 +0200
categories: emulation
tags: [emuriscv, riscv, linux, emulation, interactive]
title: "RISC-V supervisor mode"
image: mstatus.png
---

RISC-V features multiple privilege levels (machine, hypervisor, supervisor and user mode). The cores (harts) power up in **machine mode**, which is mandatory in all RISC-V implementations. Operating system kernel is typically loaded in **supervisor mode**. This mode offers MMU and virtual memory. User mode should be the one where user-level code (applications) gets executed. 

There was something shady about emuriscv's handling of supervisor mode as I've made some changes to the code and could no longer move from the bootloader to kernel.

To see what's going on, let's take a look at the [BBL bootloader](https://github.com/riscv/riscv-pk/tree/master/bbl)
It's being done by the bootloader:

### Entering the supervisor mode

The RISC-V MRET, HRET, SRET, or URET instructions are used to return from traps in M-mode, H-mode, S-mode, or U-mode respectively. When executing an xRET instruction, supposing xPP holds the value y, yIE is set to xPIE; the privilege mode is changed to y; xPIE is set to 1; and xPP is set to U.

Typically the trap handlers will save the current state

```
PC              MEPC
Priv   ->       MPP
MIE             MPIE
```

and restore the state on the MRET instruction:

```
MEPC            PC
MPP     ->      Priv
MPIE            MIE
```

The `mstatus` register contains the following relevant flags:

- M/S/U IE - Global interrupt enable
- M/S/U PIE - state of interrupt enables prior to an interrupt
- M/S PP - privilege level prior tithe previous interrupt

The xPP/XPIE bits can also be written to in order to enter a lower privilege mode when executing xRET, which is exactly what BBL does to enter supervisor mode from the machine mode.

Along with the privilege level constants:

Privilege levels | value
-|-
M | 3
S | 1
U | 0

For more information, refer to the [RISC-V Interrupts](https://riscv.org/wp-content/uploads/2016/07/Tue0900_RISCV-20160712-Interrupts.pdf) presentation by Krste Asanović.

### BBL implementation

Here are the extracted lines of [bbl code](https://github.com/riscv/riscv-pk/blob/66d7fcb56d6a4cd4879922f184bb2274918ac3cd/bbl/bbl.c) that happen when the bootloader is finished and is about to hand over control to kernel:

```c
entry_point = kernel_start ? kernel_start : PAYLOAD_START;
...
const void* entry = entry_point;
hartid = 0;
...
enter_supervisor_mode(entry, hartid, dtb_output());
```

The commented version of the BBL `enter_supervisor_mode()` function (compare with the [original](https://github.com/riscv/riscv-pk/blob/66d7fcb56d6a4cd4879922f184bb2274918ac3cd/machine/minit.c#L222)):


 ```c
void enter_supervisor_mode(void (*fn)(uintptr_t), uintptr_t arg0, uintptr_t arg1)
{
  setup_pmp();
  //read back mstatus
  uintptr_t mstatus = read_csr(mstatus);
  //set supervisor privilege PRV_S as the "previous" privilege
  mstatus = INSERT_FIELD(mstatus, MSTATUS_MPP, PRV_S);
  //unset previous iterrupt enable
  mstatus = INSERT_FIELD(mstatus, MSTATUS_MPIE, 0);
  //write back mstatus
  write_csr(mstatus, mstatus);
  write_csr(mscratch, MACHINE_STACK_TOP() - MENTRY_FRAME_SIZE);
#ifndef __riscv_flen
  uintptr_t *p_fcsr = MACHINE_STACK_TOP() - MENTRY_FRAME_SIZE; // the x0's save slot
  *p_fcsr = 0;
#endif
  //set up virtual address of the target function in mepc
  write_csr(mepc, fn);

  //return from machine code trap
  register uintptr_t a0 asm ("a0") = arg0;
  register uintptr_t a1 asm ("a1") = arg1;
  asm volatile ("mret" : : "r" (a0), "r" (a1));
  //the execution is now away
  __builtin_unreachable();
}
```

The relevant bits of the code disassembled:

 ```nasm
 80004300 <enter_supervisor_mode>:

void enter_supervisor_mode(void (*fn)(uintptr_t), uintptr_t arg0, uintptr_t arg1)
{
...
  write_csr(mepc, fn);
800043a4:	fdc42783          	lw	a5,-36(s0)
800043a8:	34179073          	csrw	mepc,a5

  register uintptr_t a0 asm ("a0") = arg0;
800043ac:	fd842503          	lw	a0,-40(s0)
  register uintptr_t a1 asm ("a1") = arg1;
800043b0:	fd442583          	lw	a1,-44(s0)
  asm volatile ("mret" : : "r" (a0), "r" (a1));
800043b4:	30200073          	mret

800043b8 <enter_machine_mode>:
  __builtin_unreachable();
}
```

This means that by setting up the MSTATUS_MPP, MSTATUS_MPIE fields 

For comparison, the `enter_machine_mode` counterpart is simpler as the bootloader code is _already_ running in the machine mode:

```c
void enter_machine_mode(void (*fn)(uintptr_t, uintptr_t), uintptr_t arg0, uintptr_t arg1)
{
  uintptr_t mstatus = read_csr(mstatus);
  mstatus = INSERT_FIELD(mstatus, MSTATUS_MPIE, 0);
  write_csr(mstatus, mstatus);
  write_csr(mscratch, MACHINE_STACK_TOP() - MENTRY_FRAME_SIZE);

  /* Jump to the payload's entry point */
  fn(arg0, arg1);

  __builtin_unreachable();
}
```

### Emulator implementation

Implementing the `MRET` instruction is straightforward, as per the official Spike [riscv-isa-sim](https://github.com/riscv/riscv-isa-sim/blob/2e60b8b06174771e1155f2dfe693cc49f8958def/riscv/insns/mret.h):

```c
require_privilege(PRV_M);
set_pc_and_serialize(p->get_state()->mepc);
reg_t s = STATE.mstatus;
reg_t prev_prv = get_field(s, MSTATUS_MPP);
s = set_field(s, MSTATUS_MIE, get_field(s, MSTATUS_MPIE));
s = set_field(s, MSTATUS_MPIE, 1);
s = set_field(s, MSTATUS_MPP, PRV_U);
p->set_privilege(prev_prv);
p->set_csr(CSR_MSTATUS, s);
```

### RISC-V RV32 mstatus CSR decoder

To aid debugging I wrote an interactive `mstatus` register decoder:


{{% include-html file="2021-04-04-riscv-mstatus-decoder.html" %}}

#### Further reading:

- See the blog on RISC-V interrupts: [https://five-embeddev.com/quickref/interrupts.html](https://five-embeddev.com/quickref/interrupts.html)
- RISC-V Architecture Presentation: [https://cdn2.hubspot.net/hubfs/3020607/An%20Introduction%20to%20the%20RISC-V%20Architecture.pdf](https://cdn2.hubspot.net/hubfs/3020607/An%20Introduction%20to%20the%20RISC-V%20Architecture.pdf)