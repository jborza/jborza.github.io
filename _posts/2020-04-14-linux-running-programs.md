---
layout: post
title:  "How Linux runs programs"
date:   2020-04-14 10:00:00 +0200
categories: linux
tags: [riscv, linux]
---

# How programs get run in Linux

I was attempting to boot Linux on my RISC-V emulator  **emuriscv**.
Somehow the init process didn't start properly and was dying on a strange instruction I wasn't really expecting.

Digging into an issue deeper revealed that the `init` process probably isn't starting properly.

Wikipedia has an article on the [Linux startup process](https://en.wikipedia.org/wiki/Linux_startup_process).

I have successfully got through the startup of the machine itself, 

Paraphrasing the overview of the process on the RISC-V platform:
1. The BIOS performs startup tasks specific to the actual hardware platform. Once the hardware is enumerated and the hardware which is necessary for boot is initialized correctly, the BIOS loads and executes the boot code from the configured boot device.
2. The boot loader often presents the user with a menu of possible boot options and has a default option, which is selected after some time passes.  Once the selection is made, the boot loader loads the kernel into memory, supplies it with some parameters and gives it control.
3. The kernel, if compressed, will decompress itself. It then sets up system functions such as essential hardware and memory paging, and calls start_kernel() which performs the majority of system setup (interrupts, the rest of memory management, device and driver initialization, etc.). It then starts up, separately, the idle process, scheduler, and the init process, which is executed in user space.
4. The init either consists of scripts that are executed by the shell (sysv, bsd, runit) or configuration files that are executed by the binary components (systemd, upstart). Init has specific levels (sysv, bsd) or targets (systemd), each of which consists of specific set of services (daemons). These provide various non-operating system services and structures and form the user environment. A typical server environment starts a web server, database services, and networking.

Once the kernel has started, it starts the init process. 

Describing more: 
https://lwn.net/Articles/630727/

Looking into which handler was actually used:

```
[    4.296337][    T1] Run /init as init process
[    4.297240][    T1] __do_execve_file fd:ffffff9c
[    4.298116][    T1] __do_execve_file filename:/init
[    4.300947][    T1] fs/exec.c before exec_binprm
[    4.302644][    T1] exec_binprm calling search_binary_handler
[    4.305692][    T1] fs/exec.c search_binary_handler filename: /init
[    4.308795][    T1] search_binary_handler for each fmt: fmt->module->name
[    4.311958][    T1] search_binary_handler fmt: fmt->module->name got module
[    4.316022][    T1] fs/exec.c search_binary_handler filename: /init
[    4.319125][    T1] search_binary_handler for each fmt: fmt->module->name
[    4.322288][    T1] search_binary_handler fmt: fmt->module->name got module
[    4.325517][    T1] search_binary_handler fmt: fmt->module->name load binary result -8:
[    4.330794][    T1] search_binary_handler for each fmt: fmt->module->name
[    4.333956][    T1] search_binary_handler fmt: fmt->module->name got module
[    4.340729][    T1] search_binary_handler fmt: fmt->module->name load binary result 0:
[    4.346048][    T1] search_binary_handler fmt: fmt->module->name load binary result 0:
[    4.351280][    T1] exec_binprm returned: 0
[    4.354055][    T1] execve succeeded
```

It's correctly picked up as the ELF format.

```
[    4.438890][    T1] fs/binfmt_elf.c load_elf_binary filename:/sbin/init interp:/sbin/init start_thread elf_entry=0x35400ad0
[    4.444573][    T1] arch/riscv/kernel/process.c start_thread pc:0x35400ad0 sp:0x9f8e0f00
```

Starting a process from the RISC-V tree: [riscv/kernel/process.c](https://github.com/torvalds/linux/blob/8f3d9f354286745c751374f5f1fcafee6b3f3136/arch/riscv/kernel/process.c#L67)

```c
//arch/riscv/kernel/process.c
void start_thread(struct pt_regs *regs, unsigned long pc,
	unsigned long sp)
{
	regs->sstatus = SR_SPIE; ///* User mode, irqs on */
    ... //no fpu support
	regs->sepc = pc;  //Supervisor Exception Program Counter
	regs->sp = sp;    //stack pointer
	set_fs(USER_DS); //current_thread_info()->addr_limit = (TASK_SIZE) //The maximum size of a user process in bytes.
}
```

This should play along with the SRET instruction, that should resume execution from the sepc register.

What is SPIE?
The SPIE bit indicates whether interrupts were enabled before entering supervisor mode. 

```c
//arch/riscv/include/asm/csr.h
/* Status register flags */
#define SR_SIE	_AC(0x00000002, UL) /* Supervisor Interrupt Enable */
#define SR_SPIE	_AC(0x00000020, UL) /* Previous Supervisor IE */
```

https://www.sifive.com/blog/all-aboard-part-7-entering-and-exiting-the-linux-kernel-on-risc-v says:

> Just like entering the kernel via a single trap entry point, the only way to leave the kernel is by executing the sret instruction. This mirrors taking a trap: all that happens is the privilege mode is changed and the PC is reset to the exception PC CSR's value. Again, the supervisor software is expected to provide a transparent implementation of the userspace ABI.