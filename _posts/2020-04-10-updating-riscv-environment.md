---
layout: post
title:  "Updating the RISC-V Linux environment"
date:   2020-04-10 10:00:00 +0200
categories: emulation
---

I wanted to upgrade from Linux 4.15 to something more recent. Buildroot-2020-02 supports compiling the image against Linux 5.3 headers, so I cloned 


### Kernel configuration

Base ISA: RV32I, no compressed instrictions, no SMP, no FPU support.
Networking support can also be off.

The important devices were:
- RISC-V SBI console support (in Device drivers->Character devices)
- SiFive Platform-Level Interrupt Controller 

A nice-to-have for diagnosing the boot process is enabling "Show timing information on printks", "Enable dynamic printk() support", and setting the highest log levels in the "printk and dmesg options" section.

Also don't forget to check "early printk" option for writing the kernel log output to our "serial device" (using SBI ecalls).

Including the buildroot initramfs filesystem is done via the General setup -> Initial RAM filesystem and RAM disk support - point to a `rootfs.cpio` or `rootfs.cpio.gz` file system image built by buildroot in its `output/images` folder.

TODO: how do I get my CONFIG_EARLY_PRINTK back?

Building:

`make ARCH=riscv CROSS_COMPILE=$CCPREFIX vmlinux`