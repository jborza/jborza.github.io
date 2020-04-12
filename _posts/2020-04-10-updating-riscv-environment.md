---
layout: post
title:  "Updating the RISC-V Linux environment"
date:   2020-04-12 10:00:00 +0200
categories: emulation
tags: [emulation, riscv, linux]
---

As I planned to work some more on the **emuriscv** RISC-V emulator, I wanted to upgrade from Linux 4.15 and buildroot from 2018 to something more recent. Buildroot-2020-02 supports compiling the image against Linux 5.x headers, while the 5.x kernel should have better support for RISC-V.

## Preparations

Cloned the linux kernel source at the 5.3 tag - https://github.com/torvalds/linux/tree/v5.3.

Prepared the defconfig with `make ARCH=riscv CROSS_COMPILE=$CCPREFIX defconfig`

### Kernel configuration

Base ISA: RV32I, no compressed instrictions, no SMP, no FPU support.
Networking support can also be off.

The important devices were:
- RISC-V SBI console support (in Device drivers->Character devices)
- SiFive Platform-Level Interrupt Controller 

Including the buildroot initramfs filesystem is done via the General setup -> Initial RAM filesystem and RAM disk support - point to a `rootfs.cpio` or `rootfs.cpio.gz` file system image built by buildroot in its `output/images` folder.

#### Debug information

A nice-to-have for diagnosing the boot process is enabling "Show timing information on printks", "Enable dynamic printk() support", and setting the highest log levels in the "printk and dmesg options" section.

Also don't forget to check "early printk" option for writing the kernel log output to our "serial device" (using SBI ecalls).

Compiling the kernel with debug info (Kernel hacking) section allows us to generate disassembly intertwined with the C source code.

We definitely need to enable CONFIG_EARLY_PRINTK somehow.

I added EARLY_PRINTK option back to `arch/riscv/Kconfig` manually, as I haven't figured out which option turns it on.

```
menu "Kernel hacking"

config EARLY_PRINTK
	def_bool y
    
endmenu
```

#### Saving the configuration

The official way is to use `make ARCH=riscv CROSS_COMPILE=$CCPREFIX savedefconfig`, that will produce a defconfig file. This can be then copied to the configs with
`cp defconfig arch/riscv/configs/emuriscv_defconfig`.

Other than that, just copy the `.config` file.

### Buildroot setup

Downloaded buildroot-2020-02  from [the official site](https://buildroot.org/download.html), unpacked, compiled

Set the default configuration

```
make defconfig
```

Set up the configuration

```
make menuconfig
```

Configuration options:



## Building:

```console
make ARCH=riscv CROSS_COMPILE=$CCPREFIX vmlinux`
riscv32-unknown-linux-gnu-objcopy -O binary vmlinux vmlinux.bin`
```

## Getting console output

As I wanted to diagnose early events, I used an early console (see )

```c
static void debug_sbi_console_write(const char *buf,
			      unsigned int n)
{
	int i;

	for (i = 0; i < n; ++i) {
        if(buf[i] == '\0')
            return;
		if (buf[i] == '\n')
			sbi_console_putchar('\r');
		sbi_console_putchar(buf[i]);
	}
}
```

The real SBI console is implemented in `drivers/tty/serial/earlycon-riscv-sbi.c`, which declares it as 

```
EARLYCON_DECLARE(sbi, early_sbi_setup);
```

Untangling this macro takes a bit of time.
it seems I need these options enabled: `CONFIG_SERIAL_EARLYCON` and `CONFIG_SERIAL_EARLYCON_RISCV_SBI` (Device drivers->Character devices->Serial drivers).

Adding those allowed the output to proceed further, I got the following:

```
[    4.181377] Run /init as init process
[    4.185611] Failed to execute /init (error -8)
[    4.186325] Run /sbin/init as init process
[    4.188972] Starting init: /sbin/init exists but couldn't execute it (error -8)
[    4.189962] Run /etc/init as init process
[    4.193150] Run /bin/init as init process
[    4.196160] Run /bin/sh as init process
[    4.200680] Starting init: /bin/sh exists but couldn't execute it (error -8)
[    4.203886] Kernel panic - not syncing: No working init found.  Try passing init= option to kernel. See Linux Documentation/admin-guide/init.rst for guidance.
```

If these binaries exist, but couldn't execute them, it may indicate some error with the binary format.
The file is indeed there:

```
tar -tvf rootfs.tar ./ | grep sbin/init
lrwxrwxrwx 0/0               0 2020-04-08 21:22 ./sbin/init -> ../bin/busybox
```

`include/uapi/asm-generic/errno-base.h` defines:

```c
#define	ENOEXEC		 8	/* Exec format error */
```

So we may have built an incorrect format. To verify, we check the format according to the helpful [init.rst](https://github.com/torvalds/linux/blob/master/Documentation/admin-guide/init.rst) guide, especially the step _make sure the binary's architecture matches your hardware_.

To verify that we can use the `file` command.

```
# in the buildroot folder
cd output/images
tar xvf rootfs.tar
riscv32-unknown-linux-gnu-readelf -a bin/busybox
readelf: Error: Not an ELF file - it has the wrong magic bytes at the start
file busybox
busybox: BFLT executable - version 4 ram
```

While the correct format should be:

```
file busybox
busybox: setuid ELF 32-bit LSB executable, UCB RISC-V, version 1 (SYSV), dynamically linked, interpreter /lib/ld-, for GNU/Linux 4.15.0, stripped
```

Turns out I somehow managed to load a buildroot built for ARM - oops.

#### After building the correct RISC-V binaries...

The boot process continues all the way to the `init` command, where it dies on a page fault exception (see the `0xcccccccc` address).

```
[   34.609754] BUG: scheduling while atomic: init/1/0xcccccccc
[   34.612844] CPU: 0 PID: -858993460 Comm: (efault) Tainted: G        W         5.3.0-dirty #11
[   34.617833] Call Trace:
[   34.620565] [<c053d1f8>] walk_stackframe+0x0/0xf8
[   34.623495] [<c053d4d0>] show_stack+0x3c/0x50
[   34.626423] [<c06d0714>] dump_stack+0x2c/0x3c
[   34.629303] [<c055d674>] __schedule_bug+0x50/0x70
[   34.632204] [<c06eaf84>] __schedule+0x54/0x308
[   34.635073] [<c06eb2ac>] schedule+0x40/0x78
[   34.637929] [<c053bf10>] ret_from_exception+0x0/0x10
```

While debugging I managed to get a clue - hitting the SRET instruction on a breakpoint. I also found that I haven't really implemented the `SRET` instruction :/

See https://www.sifive.com/blog/all-aboard-part-7-entering-and-exiting-the-linux-kernel-on-risc-v for more information about the supervisor mode.


```c
void sret(State * state, word * instruction) {
	PRINT_DEBUG("sret\n");
}
```

Disassembly says pc is at c092efb4, 

```
c092ef0c <resume_userspace>:
resume_userspace: 
...
	sret
c092efb0:	10200073          	sret

c092efb4 <work_pending>:
	j need_resched
```