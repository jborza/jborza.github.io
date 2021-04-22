---
layout: post
published: true
date:   2021-04-18 18:00:00 +0200
categories: emulation
tags: [emuriscv, riscv, linux]
title: "Misunderstanding RISC-V ecalls"
---

# (Mis)understanding RISC-V ecalls and syscalls

After spending some time with [`emuriscv`](https://github.com/jborza/emuriscv) an attempting to boot Linux into a shell I realized that I'm doing something really wrong regarding system calls.

RISC-V offers an `ecall` (Environment Call) instruction to implement system calls. These are basically requests made by a lower privileged code (user mode) to execute higher privileged code (kernel). Or, in some other case, the kernel itself can be the lower privileged code and it would invoke the machine mode code with an `ecall`.

On the RISC-V platform this call can also act as a convenient way of providing input/output, either from bare metal code or the kernel. 

### Enter the SBI for console output

According to the SBI (supervisor binary interface), which I take for a BIOS equivalent in the RISC-V world, there's is a legacy ["console" interface](https://github.com/riscv/riscv-sbi-doc/blob/master/riscv-sbi.adoc#legacy-extensions-eids-0x00-0x0f) with two functions:

```c
void sbi_console_putchar(int ch)
int sbi_console_getchar(void)
```

This getchar/putchar pair interacts with a debug console. Linux happens to provide a RISC-V [SBI console driver](https://github.com/torvalds/linux/blob/master/drivers/tty/hvc/hvc_riscv_sbi.c), that's enabled with the `HVC_RISCV_SBI` configuration option and calls into functions implemented [in sbi.c](https://github.com/torvalds/linux/blob/master/arch/riscv/kernel/sbi.c). 

The implementation calls a function named `sbi_ecall`, that generates the assembly code invoking the `ecall` and collects the return code (if any).

```c
void sbi_console_putchar(int ch)
{
	sbi_ecall(SBI_EXT_0_1_CONSOLE_PUTCHAR, 0, ch, 0, 0, 0, 0, 0);
}
```

which gets compiled into the following assembly:

```nasm
li a7, 1
li a0, ch
ecall
```

## Doing it the wrong way

I misunderstood this and implemented an `ecall` handler in my emulator that did capture the arguments and printed out the parameter into the standard output:

```c
//ecall_callback
	if (state->x[SYSCALL_REG] == SBI_CONSOLE_PUTCHAR) {
		char c = (char)state->x[SBI_ARG0_REG];
		fprintf(stdout, "%c", c);
		state->x[SBI_RETURN_REG] = SBI_SUCCESS;
	}
    else if (state->x[SYSCALL_REG] == SBI_CONSOLE_GETCHAR) {
		//write invalid return value in the register a0
		state->x[SBI_RETURN_REG] = -1;
	}
```

While this **technically did work** and I got the Linux boot console output, I realized quite late that the same `ecall` instruction is also used for something else than printing out characters to the screen. The reason it took so long was that I discarded all the other `ecall` invocations in my implementation.  

As `ecall` is also used by the user-mode programs to call into the kernel, it also meant that **no system calls whatsoever** would get through to the kernel. 

## Doing it the right way

RISC-V defines the following mechanism for actually handling the ecalls - they should be an atomic jump to a controlled location, handled by an exception handler. 

![image](/assets/2021-04-21-ecall-diagram.png)

There are the following _exception causes_ that correspond to bits that can be set in the `CSR_MEDELEG` register. If the delegation bit at the specified index is set, then exception gets delegated to S mode, otherwise it's handled in M mode.

| name | code |
|------|------|
CAUSE_USER_ECALL | 0x8
CAUSE_SUPERVISOR_ECALL | 0x9
CAUSE_HYPERVISOR_ECALL | 0xa
CAUSE_MACHINE_ECALL | 0xb


Now, if we have a simple binary that contains these instructions:

```nasm
addi    a0, x0, 0   # Return code 0
addi    a7, x0, 93  # Syscall 93 terminates
ecall               # Call OS to terminate the program
```

The `ecall` raises an exception with the `CAUSE_USER_ECALL`, which gets trapped by the kernel trap handler and handled properly.

### Interactive MEDELEG CSR decoder

Enter the `medeleg` value to see which exception bits it contains.

{% include 2021-04-22-riscv-medeleg-decoder.html %}

### MISA CSR register and platform capabilities identification

To allow BBL/OpenSBI to set up trap handlers we should tell it which extensions we support by setting up the CSR_MISA register as follows, as it queries `supports_extension('S')` before setting up supervisor mode traps:

```c
//RV32 IMAS  -> bits 0, 8, 12, 18, XLEN32 (bit 30)
state->csr[CSR_MISA] = 1 << 0 | 1 << 8 | 1 << 12 | 1 << 18 | 1 << 30;
```

### Now we have syscalls, but no console again :(

## Getting console back, which output driver to support?

As the `ecall` is now properly handled either by the OS or the OpenSBI, we need some way to produce output again.

The `sbi_console_putchar` call from kernel is now **trapped** by OpenSBI/BBL by its [sbi_console](https://github.com/riscv/opensbi/blob/master/lib/sbi/sbi_console.c) module, that dispatches the character into a specific console driver.

As I am using both BBL and OpenSBI I was looking for something that's easy to implement and available in both loaders.

| Driver | BBL | OpenSBI
|-|-|-|
| SiFive UART| ✔️ | ✔️
| 8250/16550 UART | ✔️ | ✔️
| [LiteX](https://github.com/enjoy-digital/litex) UART | ✔️ | ❌
| HTIF | ✔️ | ✔️
| Shakti UART | ❌ | ✔️

Because HTIF is not really supported on 32-bit (RV32) architecture, it's out. SiFive UART seemed simpler than the 8250/16550 UART, with a couple of FIFO registers and flags. 

### Implementing SiFive UART in emuriscv

There are two parts to a virtual device - its implementation and making it discoverable.

The standard RISC-V mechanism of hardware discovery is via the **device tree**, so I had to create an entry for this new UART device:

```r
uart@10000000 {
    compatible = "sifive,uart0";
    reg = <0x00 0x10000000 0x00 0x100>;
};
```

> ℹ️ We can turn binary FDT into a text-based representation by `dtc -I dtb -O dts binary_fdt.dtb`

This tells the OpenSBI/BBL to initialize the SiFive UART driver, pointing to the address `0x10000000`. The counterpart on the emulator side is a memory-mapped device, which has a following write handler:

```c
int32_t uart_reg[7];
#define UART_REG_TXFIFO		0
#define UART_REG_RXFIFO		1
...
static void uart_write(void* opaque, uint32_t offset, uint32_t val,
	int size_log2)
{
	int offset_words = offset >> 2;
	uart_reg[offset_words] = val;
	if (offset_words == UART_REG_TXFIFO) {
		if(val != 0) //skip null characters
			fputc(val, stderr);
	}
}
```

There's a similar `uart_read()` function that just returns whatever is inside the UART registers.

I liked this memory-mapped device mechanism from [Bellard's TinyEmu](https://bellard.org/tinyemu/) and could not think of anything more reasonable. 


### How about console input?

I've not implemented it yet as I'm still stuck in a phase where I didn't get usermode code to print out a single character. However, a reasonable implementation would send a character from the standard input of the emulator with something like `getch()`.

I'm still not sure whether this is all that's needed as I see many calls to `sbi_console_getchar` around the boot time, which could be just polling for input. I'm also getting a lot of `@^@^@^` sequences, which could actually mean something - an escape sequence that a terminal is supposed to respond to, I'm not exactly sure at this point in time.