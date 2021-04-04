---
layout: post
published: true
date:   2021-04-02 20:00:00 +0200
categories: emulation
tags: [emuriscv, riscv, linux]
title: "Revisiting RISC-V emulator in 2021"
---

# emuriscv 2021 RISC-V and Linux refresh

This week I've revisited my RISC-V emulator project `emuriscv` - [https://github.com/jborza/emuriscv](https://github.com/jborza/emuriscv), as I'm still intrigued by the idea of booting Linux on my own CPU emulator.

I've worked on and off on this project since 2019, it initially implemented a smaller subset of the architecture, but it's slowly been expanded with a memory management unit, privileged mode and such. However, it still didn't completely boot Linux as I messed up somewhere.  

Now it's as good time as any to get it running with the latest kernel and progress a bit. This blog post also serves as a reference point for my next attempt in the future :).

After cloning a couple of Git repositories on my new laptop I set out to find whether it still builds and where does the boot process fail this time.

**See previous entries in this series:**

- Part 1: [Building up RISC-V Linux with Buildroot]({% post_url 2020-04-08-riscv-environment %})

- Part 2: [Updating the RISC-V Linux environment]({% post_url 2020-05-03-beginning-forth %})

### Project setup

I've cloned:
- [emuriscv](https://github.com/jborza/emuriscv)
- Linux [kernel](https://github.com/torvalds/linux/tree/v5.10) at `linux-v5.10` 
- [buildroot 2021.02](https://buildroot.org/downloads/buildroot-2021.02.tar.gz) 

### Toolchain

To build everything I'm using the [riscv-gnu-toolchain](https://github.com/riscv/riscv-gnu-toolchain) built with 

```sh
./configure --prefix=/opt/riscv32 --with-arch=rv32ima --with-abi=ilp32d
make linux
```

### Command line options

We also specify the command line as 
`debug keep_bootcon bootmem_debug earlycon=sbi` - which, broken down, enables
- Kernel debug mode
- `keep_bootcon` [retains the boot console](https://sparclinux.vger.kernel.narkive.com/m2PbzJp8/patch-debug-allow-to-retain-boot-console-via-boot-option-keep-bootcon), which we use with the `printk` debug statements
- `bootmem_debug` makes the [bootmem](https://www.kernel.org/doc/html/v4.19/core-api/boot-time-mm.html) boot-time memory allocator and configurator print [more debug](https://elixir.bootlin.com/linux/v4.4/ident/bootmem_debug) statements, which is very helpful with getting the virtual memory system working
- `earlycon=sbi` sets up [SBI (Supervisor Binary Interface)](https://github.com/riscv/riscv-sbi-doc/blob/master/riscv-sbi.adoc) console as the _early_ console for `printk` statements

### Building Linux 5.10

```
git clone --depth 1 --branch v5.10 https://github.com/torvalds/linux.git linux-v5.10
```

set the CCPREFIX to 
make ARCH=riscv CROSS_COMPILE=$CCPREFIX defconfig

#### Build instructions

0. clone the repository
1. set up environment variables
- `export RISCV=/opt/riscv32`
- `export PATH=$PATH:$RISCV/bin`
- `export CCPREFIX=riscv32-unknown-linux-gnu-`
2. prepare the kernel configuration
- `make ARCH=riscv CROSS_COMPILE=$CCPREFIX defconfig`
- `make ARCH=riscv CROSS_COMPILE=$CCPREFIX nconfig`
3. build
- `make ARCH=riscv CROSS_COMPILE=$CCPREFIX vmlinux`

### Kernel configuration options

Here I'm trying to set up as barebones kernel as possible. We'll also try booting it in qemu to see whether it works.

List of changes:

```
Platform type:
Base ISA: RV32I
Disabled compressed instructions
Boot options: disabled UEFI
Disabled loadable module support
Disabled everything in the Memory Management section
Disabled networking support
Devices: Disabled PCI, USB, MMC/SD/SDIO, HID, I2C, SPI, mouse, gpu, virtio drivers
Disabled Cryptographic APIs
Disabled everything in Security options
Disabled membarrier() system call
Disabled bpf() system call
Enabled kernel hacking->printk->Show caller information on printks
Enabled compile kernel with debug info
```

> I hope to revisit virtio and framebuffer later when adding support for more devices once this stage boots

Note: There's an intriguing no-mmu option when targeting RV64I. It would also mean I'd need to add 64-bit support to `emuriscv`, but it may be easier to implement than pretending how to properly implement the MMU stuff :)

> Building the kernel took 5:36 minutes on my i5 6300U.

### Post-build tasks

After building the kernel we need to turn it into raw binary and generate debugging metadata with the following commands:

```sh
riscv32-unknown-linux-gnu-objcopy -O binary vmlinux vmlinux.bin
#symbols
riscv32-unknown-linux-gnu-objdump -t vmlinux > vmlinux-symbol-5.10.s
#disassembly
riscv32-unknown-linux-gnu-objdump -D vmlinux > vmlinux-5.10.s
```

### Buildroot options

```
Target architecture: RISC-V
Target architecture size: 32-bit
Target ABI: ilp32
Filesystem images: CPIO the filesystem
CPIO compression method: gzip
Disabled Remount root file system read-only
```

Here we have two options - we can reuse the previously built toolchain and use it as an _external_ toolchain or let buildroot build its own one.

To build the default toolchain use:

```
make defconfig
make nconfig
make -j $(nproc)
```

To configure the external toolchain, follow the steps above until the `nconfig` target, then set it as follows:

- Toolchain type: External toolchain
- path: /opt/riscv32
- prefix: $(ARCH)-unknown-linux-gnu
- kernel headers series: (5.0.x)
- C library: (glibc/eglibc) 

```

 /home/juraj/buildroot-mytoolchain/.config - Buildroot 2021.02 Configuration
 ┌── Toolchain ────────────────────────────────────────────────────────────┐
 │                                                                         │
 │          Toolchain type (External toolchain)  --->                      │
 │          *** Toolchain External Options ***                             │
 │          Toolchain (Custom toolchain)  --->                             │
 │          Toolchain origin (Pre-installed toolchain)  --->               │
 │          (/opt/riscv32) Toolchain path                                  │
 │          ($(ARCH)-unknown-linux-gnu) Toolchain prefix                   │
 │          External toolchain gcc version (10.x)  --->                    │
 │          External toolchain kernel headers series (5.0.x)  --->         │
 │          External toolchain C library (glibc/eglibc)  --->              │
 │      [*] Toolchain has SSP support?                                     │
 │      [*] Toolchain has RPC support?                                     │
 │      [ ] Toolchain has C++ support?                                     │
 ```

and build with `make`.

## emuriscv tidbits

### Boot console

The boot console is implemented by an SBI call `SBI_CONSOLE_PUTCHAR`, which works by setting up the argument (character to be printed) in the `A0` register, then setting the `A7` register to `SBI_CONSOLE_PUTCHAR` (1) and calling the `ecall` instruction.

It's then forwarded to the standard error as:

```c
if (state->x[SBI_WHICH] == SBI_CONSOLE_PUTCHAR) {
    char c = (char)state->x[SBI_ARG0_REG];
    fprintf(stderr, "%c", c);
}
```

### Device tree

One of the parts of the puzzle during Linux boot is a Flattened [Device Tree](https://www.kernel.org/doc/html/latest/devicetree/usage-model.html) that describes the hardware configuration. 

I've stolen most of the FDT implementation (and other bits such as clint, htif) from Bellard's JSLinux, stripping it down to the devices I support.

## Onwards to boot again!

Now we got reasonably far in the boot process, only to get stopped by an unknown instruction error.

```
[    0.000000][    T0] Linux version 5.10.0 (juraj@DESKTOP-26O5AT9) (riscv32-unknown-linux-gnu-gcc (GCC) 10.2.0, GNU ld (GNU Binutils) 2.35) #1 Fri Apr 2 14:45:33 CEST 2021
[    0.000000][    T0] OF: fdt: Ignoring memory range 0x80000000 - 0x80400000
[    0.000000][    T0] printk: debug: skip boot console de-registration.
[    0.000000][    T0] earlycon: sbi0 at I/O port 0x0 (options '')
[    0.000000][    T0] printk: bootconsole [sbi0] enabled
[    0.000000][    T0] Zone ranges:
[    0.000000][    T0]   Normal   [mem 0x0000000080400000-0x0000000085ffffff]
[    0.000000][    T0] Movable zone start for each node
[    0.000000][    T0] Early memory node ranges
[    0.000000][    T0]   node   0: [mem 0x0000000080400000-0x0000000085ffffff]
[    0.000000][    T0] Initmem setup node 0 [mem 0x0000000080400000-0x0000000085ffffff]
[    0.000000][    T0] On node 0 totalpages: 23552
[    0.000000][    T0]   Normal zone: 184 pages used for memmap
[    0.000000][    T0]   Normal zone: 0 pages reserved
[    0.000000][    T0]   Normal zone: 23552 pages, LIFO batch:3
[    0.000000][    T0] SBI specification v0.1 detected
[    0.000000][    T0] riscv: ISA extensions i
[    0.000000][    T0] riscv: ELF capabilities i
[    0.000000][    T0] pcpu-alloc: s0 r0 d32768 u32768 alloc=1*32768
[    0.000000][    T0] pcpu-alloc: [0] 0
[    0.000000][    T0] Built 1 zonelists, mobility grouping on.  Total pages: 23368
[    0.000000][    T0] Kernel command line: debug keep_bootcon bootmem_debug earlycon=sbi
[    0.000000][    T0] Dentry cache hash table entries: 16384 (order: 4, 65536 bytes, linear)
[    0.000000][    T0] Inode-cache hash table entries: 8192 (order: 3, 32768 bytes, linear)
[    0.000000][    T0] Sorting __ex_table...
[    0.000000][    T0] mem auto-init: stack:off, heap alloc:off, heap free:off
[    0.000000][    T0] Memory: 76180K/94208K available (2649K kernel code, 6065K rwdata, 4096K rodata, 120K init, 210K bss, 18028K reserved, 0K cma-reserved)
[    0.000000][    T0] Virtual kernel memory layout:
[    0.000000][    T0]       fixmap : 0x9dc00000 - 0x9e000000   (4096 kB)
[    0.000000][    T0]       pci io : 0x9e000000 - 0x9f000000   (  16 MB)
[    0.000000][    T0]      vmemmap : 0x9f000000 - 0x9fffffff   (  15 MB)
[    0.000000][    T0]      vmalloc : 0xa0000000 - 0xbfffffff   ( 511 MB)
[    0.000000][    T0]       lowmem : 0xc0000000 - 0xc5c00000   (  92 MB)
[    0.000000][    T0] SLUB: HWalign=64, Order=0-3, MinObjects=0, CPUs=1, Nodes=1
[    0.000000][    T0] NR_IRQS: 64, nr_irqs: 64, preallocated irqs: 0
[    0.000000][    T0] riscv-intc: 32 local interrupts mapped
[    0.000000][    T0] riscv_timer_init_dt: Registering clocksource cpuid [0] hartid [0]
[    0.000000][    T0] clocksource: riscv_clocksource: mask: 0xffffffffffffffff max_cycles: 0x24e6a1710, max_idle_ns: 440795202120 ns
[    0.000412][    T0] sched_clock: 64 bits at 10MHz, resolution 100ns, wraps every 4398046511100ns
[    0.007400][    T0] Console: colour dummy device 80x25
[    0.008590][    T0] printk: console [tty0] enabled
```


In my debugger I see that the instruction in question is `0x100f`. The program counter is at `0xc0404568`, which is, according to the disassembly below, the `fence.i` opcode.

```s
c0404564:	00079463          	bnez	a5,c040456c <flush_icache_pte+0x44>
c0404568:	0000100f          	fence.i    # <-----------------------------
c040456c:	00c12403          	lw	s0,12(sp)
c0404570:	01010113          	addi	sp,sp,16
c0404574:	00008067          	ret
```

This is a bit surprising, as I thought `emuriscv` handled this opcode already. 

Looking around the source I discovered a typo:

```c
// original
INS_MATCH(MASK_FENCE_I, MASK_FENCE_I, fencei)
// corrected 
INS_MATCH(MASK_FENCE_I, MATCH_FENCE_I, fencei)
```

Again, due to my laziness, I skipped doing unit tests for the `fence/fence.i` instructions, which would have caught this bug earlier.

This made the boot process advance two statements further with:

```
[    2.714060][    T1] Serial: 8250/16550 driver, 4 ports, IRQ sharing disabled
[    2.766974][    T1] debug_vm_pgtable: [debug_vm_pgtable         ]: Validating architecture page table helpers
```

That means we're back on track with the messed up page table, where I was almost a year ago. I strongly suspect it has to do with my messy implementation of private/machine mode switching (`mret`/`sret`/`uret`) or nonexistent exception handling (`CSR_SEPC`/`CSR_MEPC` registers).

As usual, rereading the spec followed by implementing some unit tests should help.