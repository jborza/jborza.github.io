---
layout: post
published: true
date:   2021-04-03 20:00:00 +0200
categories: emulation
tags: [emuriscv, riscv, linux]
title: "Booting RISC-V on QEMU"
---

For reference, I wanted to check how `qemu` boots RISC-V Linux. Loosely following a [guide](https://risc-v-getting-started-guide.readthedocs.io/en/latest/linux-qemu.html), I describe how to build and boot a Linux environment targeting the 32-bit RISC-V architecture. 

There are three things we will need:
- [QEMU](https://www.qemu.org/) the emulator
- Linux kernel
- root filesystem with some binaries

I'm reusing a custom [riscv-gnu-toolchain](https://github.com/riscv/riscv-gnu-toolchain) I've built previously, targeting the RV32IMA architecure. For targeting the 64-bit machine, it's easier to  `riscv64-linux-gnu-` cross-compiler toolchain with the `gcc-riscv64-linux-gnu` Ubuntu package, in that case use a different `$CCPREFIX`. Unfortunately the 32-bit toolchain was not available in my package repositories.

We'll use [busybox](https://busybox.net/) as the set of binaries that will make up most of the root filesystem.  
Compiling attempts yields:
make[2]: /home/juraj/buildroot-2020.02/output/host/bin/riscv32-buildroot-linux-gnu-gcc: Command not found

### (optional) Toolchain

To build everything I'm using the [riscv-gnu-toolchain](https://github.com/riscv/riscv-gnu-toolchain) built with 

```sh
./configure --prefix=/opt/riscv32 --with-arch=rv32ima --with-abi=ilp32d
make linux
```

## Building QEMU

Because Ubuntu 20 comes with pretty old QEMU version (4.2.1 vs 5.2.0 stable), I built it from source with the following commands:

```
git clone --depth 1 --branch v5.2.0 https://github.com/qemu/qemu
cd qemu
./configure --target-list=riscv32-softmmu,riscv64-softmmu
make -j $(nproc)
sudo make install
```

After that, I ended up with `qemu-system-riscv32` and `qemu-system-riscv64` binaries

> Note: I had to install additional build dependencies `libglib2.0-dev libpixman-1-dev` on my system.

## Building kernel:

Building Linux kernel is almost the same as in the [previous post]({% post_url 2021-04-02-emuriscv-2021-refresh %}). If we omit the `vmlinux` target for `make`, the build results in additional file `arch/riscv/boot/Image` being built.

Build command:
```sh
git clone --depth 1 --branch v5.10 https://github.com/torvalds/linux.git linux-v5.10
export RISCV=/opt/riscv32
export PATH=$PATH:$RISCV/bin
export CCPREFIX=riscv32-unknown-linux-gnu-
make ARCH=riscv CROSS_COMPILE=$CCPREFIX defconfig
# configuration changes
make -j $(nproc) ARCH=riscv CROSS_COMPILE=$CCPREFIX
```

> Note: When playing around with 64-bit version and trying to come up with the most barebones kernel build, I've noticed that I cannot have a combination of no-FPU kernel and default busybox build, as Linux will then kill any process attempting to use FPU instructions [described in this issue](https://github.com/riscv/riscv-pk/issues/166).

## Root filesystem with busybox

To do something in the resulting system, we need an `init` script, a shell and some binaries to play with. Busybox is a great tool for embedded Linux, as it can fulfill these requirements.

### Building busybox

First, we cross-compile busybox to our `riscv32` target:

Busybox options:
```sh
export CCPREFIX=riscv32-unknown-linux-gnu-
CROSS_COMPILE=$CCPREFIX make defconfig
CROSS_COMPILE=$CCPREFIX make menuconfig
# here I enabled static binary in Settings->Build options
CROSS_COMPILE=$CCPREFIX make -j $(nproc)
```

### Making filesystem

We have two options: 
1. Build busybox image by hand and prepare an `ext2` image that we'll attach as a virtual hard drive
2. Build root filesystem with [buildroot](https://buildroot.org/) - see the [previous post]({% post_url 2021-04-02-emuriscv-2021-refresh %}) for more details.

To prepare ext2 filesystem by hand 
Built busybox image with:

```sh
dd if=/dev/zero of=busybox.bin bs=1M count=32
mkfs.ext2 -F busybox.bin
mkdir mnt
sudo mount -o loop busybox.bin mnt
cd mnt
sudo mkdir -p bin etc dev lib proc sbin tmp usr usr/bin usr/lib usr/sbin
sudo cp ~/busybox/busybox bin
sudo ln -s ../bin/busybox sbin/init
sudo ln -s ../bin/busybox bin/sh
cd ..
sudo umount mnt
```

> Note: this was the only thing that [didn't work](https://github.com/microsoft/WSL/issues/131) on my WSL box, so I fired up a Raspberry Pi as a dedicated image builder.

The filesystem looks like this:

```sh
$ tree
.
|-- bin
|   |-- busybox
|   `-- sh -> ../bin/busybox
|-- dev
|-- etc
|-- lib
|-- lost+found [error opening dir]
|-- proc
|-- sbin
|   `-- init -> ../bin/busybox
|-- tmp
`-- usr
    |-- bin
    |-- lib
    `-- sbin
```
## Running it

### Ext2 image
To start the `ext2` image version:

```sh
qemu-system-riscv32 -nographic \
    -machine virt \
    -kernel linux-v5.10/arch/riscv/boot/Image \
    -append "root=/dev/vda rw console=ttyS0 earlycon=sbi keep_bootcon bootmem_debug" \
    -drive file=busybox.bin,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0
```

In this case, finish busybox "installation" after boot with:

```sh
/bin/busybox --install -s
mount -t proc proc /proc
```

### Initramfs image
To start the `initramfs` version:

```sh
qemu-system-riscv32 -nographic \
    -machine virt \
    -kernel linux-v5.10/arch/riscv/boot/Image \
    -append "console=ttyS0 earlycon=sbi keep_bootcon bootmem_debug" \
```

To make the prompt nicer, use:
```sh
export PS1='$(whoami)@$(hostname):$(pwd)$ '
```

### The boot output
```
[    0.000000][    T0] Linux version 5.10.0 (juraj@DESKTOP-26O5AT9) (riscv32-unknown-linux-gnu-gcc (GCC) 10.2.0, GNU ld (GNU Binutils) 2.35) #9 Sat Apr 3 19:59:26 CEST 2021
[    0.000000][    T0] OF: fdt: Ignoring memory range 0x80000000 - 0x80400000
[    0.000000][    T0] earlycon: sbi0 at I/O port 0x0 (options '')
[    0.000000][    T0] printk: bootconsole [sbi0] enabled
[    0.000000][    T0] printk: debug: skip boot console de-registration.
[    0.000000][    T0] Zone ranges:
[    0.000000][    T0]   Normal   [mem 0x0000000080400000-0x0000000087ffffff]
[    0.000000][    T0] Movable zone start for each node
[    0.000000][    T0] Early memory node ranges
[    0.000000][    T0]   node   0: [mem 0x0000000080400000-0x0000000087ffffff]
[    0.000000][    T0] Initmem setup node 0 [mem 0x0000000080400000-0x0000000087ffffff]
[    0.000000][    T0] On node 0 totalpages: 31744
[    0.000000][    T0]   Normal zone: 248 pages used for memmap
[    0.000000][    T0]   Normal zone: 0 pages reserved
[    0.000000][    T0]   Normal zone: 31744 pages, LIFO batch:7
[    0.000000][    T0] SBI specification v0.2 detected
[    0.000000][    T0] SBI implementation ID=0x1 Version=0x9
[    0.000000][    T0] SBI v0.2 TIME extension detected
[    0.000000][    T0] SBI v0.2 IPI extension detected
[    0.000000][    T0] SBI v0.2 RFENCE extension detected
[    0.000000][    T0] riscv: ISA extensions acdfimsu
[    0.000000][    T0] riscv: ELF capabilities acdfim
[    0.000000][    T0] pcpu-alloc: s0 r0 d32768 u32768 alloc=1*32768
[    0.000000][    T0] pcpu-alloc: [0] 0
[    0.000000][    T0] Built 1 zonelists, mobility grouping on.  Total pages: 31496
[    0.000000][    T0] Kernel command line: root=/dev/vda rw console=ttyS0 earlycon=sbi keep_bootcon bootmem_debug
[    0.000000][    T0] Dentry cache hash table entries: 16384 (order: 4, 65536 bytes, linear)
[    0.000000][    T0] Inode-cache hash table entries: 8192 (order: 3, 32768 bytes, linear)
[    0.000000][    T0] Sorting __ex_table...
[    0.000000][    T0] mem auto-init: stack:off, heap alloc:off, heap free:off
[    0.000000][    T0] Memory: 104624K/126976K available (1769K kernel code, 8179K rwdata, 4096K rodata, 108K init, 196K bss, 22352K reserved, 0K cma-reserved)
...
[    0.000000][    T0] SLUB: HWalign=64, Order=0-3, MinObjects=0, CPUs=1, Nodes=1
[    0.000000][    T0] NR_IRQS: 64, nr_irqs: 64, preallocated irqs: 0
[    0.000000][    T0] riscv-intc: 32 local interrupts mapped
[    0.000000][    T0] plic: plic@c000000: mapped 53 interrupts with 1 handlers for 2 contexts.
[    0.000000][    T0] riscv_timer_init_dt: Registering clocksource cpuid [0] hartid [0]
[    0.000000][    T0] clocksource: riscv_clocksource: mask: 0xffffffffffffffff max_cycles: 0x24e6a1710, max_idle_ns: 440795202120 ns
[    0.000199][    T0] sched_clock: 64 bits at 10MHz, resolution 100ns, wraps every 4398046511100ns
[    0.013650][    T0] Console: colour dummy device 80x25
[    0.028871][    T0] Calibrating delay loop (skipped), value calculated using timer frequency.. 20.00 BogoMIPS (lpj=40000)
[    0.041540][    T0] pid_max: default: 32768 minimum: 301
[    0.048164][    T0] Mount-cache hash table entries: 1024 (order: 0, 4096 bytes, linear)
[    0.055777][    T0] Mountpoint-cache hash table entries: 1024 (order: 0, 4096 bytes, linear)
[    0.102432][    T1] devtmpfs: initialized
[    0.116366][    T1] random: get_random_u32 called from bucket_table_alloc.isra.0+0xf4/0x12c with crng_init=0
[    0.117545][    T1] clocksource: jiffies: mask: 0xffffffff max_cycles: 0xffffffff, max_idle_ns: 7645041785100000 ns
[    0.137281][    T1] futex hash table entries: 256 (order: 0, 7168 bytes, linear)
[    0.177595][    T1] clocksource: Switched to clocksource riscv_clocksource
[    0.454251][    T1] workingset: timestamp_bits=30 max_order=15 bucket_order=0
[    0.562703][    T1] Serial: 8250/16550 driver, 4 ports, IRQ sharing disabled
[    0.581022][    T1] printk: console [ttyS0] disabled
[    0.588014][    T1] 10000000.uart: ttyS0 at MMIO 0x10000000 (irq = 2, base_baud = 230400) is a 16550A
[    0.598528][    T1] printk: console [ttyS0] enabled
[    0.598528][    T1] printk: console [ttyS0] enabled
[    0.615181][    T1] goldfish_rtc 101000.rtc: registered as rtc0
[    0.615181][    T1] goldfish_rtc 101000.rtc: registered as rtc0
[    0.627517][    T1] goldfish_rtc 101000.rtc: setting system clock to 2021-04-03T18:01:21 UTC (1617472881)
[    0.627517][    T1] goldfish_rtc 101000.rtc: setting system clock to 2021-04-03T18:01:21 UTC (1617472881)
[    0.647673][    T1] syscon-poweroff soc:poweroff: pm_power_off already claimed (ptrval) sbi_shutdown
[    0.647673][    T1] syscon-poweroff soc:poweroff: pm_power_off already claimed (ptrval) sbi_shutdown
[    0.664166][    T1] syscon-poweroff: probe of soc:poweroff failed with error -16
[    0.664166][    T1] syscon-poweroff: probe of soc:poweroff failed with error -16
[    0.678325][    T1] debug_vm_pgtable: [debug_vm_pgtable         ]: Validating architecture page table helpers
[    0.678325][    T1] debug_vm_pgtable: [debug_vm_pgtable         ]: Validating architecture page table helpers
[    0.731573][    T1] Freeing unused kernel memory: 108K
[    0.731573][    T1] Freeing unused kernel memory: 108K
[    0.742780][    T1] Run /init as init process
[    0.742780][    T1] Run /init as init process
[    0.750353][    T1]   with arguments:
[    0.750353][    T1]   with arguments:
[    0.756067][    T1]     /init
[    0.756067][    T1]     /init
[    0.763349][    T1]     bootmem_debug
[    0.763349][    T1]     bootmem_debug
[    0.769977][    T1]   with environment:
[    0.769977][    T1]   with environment:
[    0.776713][    T1]     HOME=/
[    0.776713][    T1]     HOME=/
[    0.782869][    T1]     TERM=linux
[    0.782869][    T1]     TERM=linux
Starting syslogd: OK
Starting klogd: OK
Running sysctl: OK
Saving random seed: [    2.076275][   T47] random: dd: uninitialized urandom read (512 bytes read)
[    2.076275][   T47] random: dd: uninitialized urandom read (512 bytes read)
OK
Starting network: ip: socket: Function not implemented
ip: socket: Function not implemented
FAIL

Welcome to Buildroot
buildroot login: root
buildroot login: root
login[116]: root login on 'console'
# uname -a
Linux buildroot 5.10.0 #10 Sat Apr 3 20:29:29 CEST 2021 riscv32 GNU/Linux
# cat /proc/cpuinfo
processor       : 0
hart            : 0
isa             : rv32imafdcsu
mmu             : sv32
```

### Running a real Linux distribution

QEMU documentation for its RISC-V platform has [an example](https://wiki.qemu.org/Documentation/Platforms/RISCV) on running Fedora Linux.

First, you need to download the images, then run:


```sh
  qemu-system-riscv64 \
   -nographic \
   -machine virt \
   -smp 4 \
   -m 2G \
   -kernel Fedora-Minimal-Rawhide-*-fw_payload-uboot-qemu-virt-smode.elf \
   -bios none \
   -object rng-random,filename=/dev/urandom,id=rng0 \
   -device virtio-rng-device,rng=rng0 \
   -device virtio-blk-device,drive=hd0 \
   -drive file=Fedora-Minimal-Rawhide-20200108.n.0-sda.raw,format=raw,id=hd0 \
   -device virtio-net-device,netdev=usernet \
   -netdev user,id=usernet,hostfwd=tcp::10000-:22
```
It takes about a minute and a half to boot to login prompt on my i5 6300U.

> Login with the user 'riscv' with password 'fedora_rocks!'.



### I like buildroot more

With buildroot it's definitely easier to get up to speed with a working system. I've built other tools such as `micropython` to be able to play with the end result a bit more. The workflow of building the entire system into a ramdisk is also quite straightforward.  