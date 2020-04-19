---
layout: post
title:  "Writing a monitor console for emuriscv"
date:   2020-04-12 10:00:00 +0200
categories: emulation
tags: [riscv, emulation, 6502]
---

As a follow up to the previous post [Debugging things running in your emulator]({% post_url 2020-04-11-debugging-in-an-emulator %}) I thought it would be nice to write an emulator console for the **emuriscv** RISC-V emulator.

I was very much inspired by the [QEMU Monitor](https://en.wikibooks.org/wiki/QEMU/Monitor) in the matter of commands.

## Monitor in action
The help command shows what it can do:

```
(emuriscv) help
help:
regs - dump registers
reg $reg - dump one register $reg (format: x7 or t0)
x $addr [n] - dump n words from virtual address $addr
xp $addr [n] - dump n words from physical address $addr
p $reg [n] - dump n words from virtual address pointed to by $reg
pp $reg [n] - dump n words from physical address pointed to by $reg
q - quit
```

Showing the register values during debugging:

```
(emuriscv) regs
 zero ( x0) : 0x00000000    ra ( x1) : 0x00000000    sp ( x2) : 0x00000000    gp ( x3) : 0x00000000
   tp ( x4) : 0x00000000    t0 ( x5) : 0x00000000    t1 ( x6) : 0x00000000    t2 ( x7) : 0x00000000
   s0 ( x8) : 0x00000000    s1 ( x9) : 0x00000000    a0 (x10) : 0x0000002a    a1 (x11) : 0x00000000
   a2 (x12) : 0x00000000    a3 (x13) : 0x00000000    a4 (x14) : 0x00000000    a5 (x15) : 0x00000000
   a6 (x16) : 0x00000000    a7 (x17) : 0x0000005d    s2 (x18) : 0x00000000    s3 (x19) : 0x00000000
   s4 (x20) : 0x00000000    s5 (x21) : 0x00000000    s6 (x22) : 0x00000000    s7 (x23) : 0x00000000
   s8 (x24) : 0x00000000    s9 (x25) : 0x00000000   s10 (x26) : 0x00000000   s11 (x27) : 0x00000000
   t3 (x28) : 0x00000000    t4 (x29) : 0x00000000    t5 (x30) : 0x00000000    t6 (x31) : 0x00000000
pc: 00000028 priv: U cycles: 6
```

We can examine the value of an individual register with the `reg` command:
```
(emuriscv) reg a7
   a7 (x17): 0000005d | 93 |
(emuriscv) reg x10
   a0 (x10): 0000002a | 42 |
(emuriscv) reg pc
pc: 00000028 | 40 |
```

We can display an individual word in memory either by an address or an address from a register: (the 0x prefix with addresses is optional)

```
(emuriscv) p pc
0x0000000c: ffdff06f | -2101137 |  ▀≡o╠╠╠╠╨⌠┌èÿ±╝
(emuriscv) x 0x16
0x00000016: 007305d0 | 7538128 |
(emuriscv) x 16
0x00000016: 007305d0 | 7538128 |
```

We can also display a memory range:

```
(emuriscv) x 0x10 6
0x00000010: 00000513 | 1299 |
0x00000014: 05d00893 | 97519763 | ô╠╠╠╠√.ëÄ4⌠Γ»C
0x00000018: 00000073 | 115 |
0x0000001c: 02a00513 | 44041491 | á╠╠╠╠√.ëÄ4⌠Γ»C
0x00000020: 05d00893 | 97519763 | ô╠╠╠╠√.ëÄ4⌠Γ»C
0x00000024: 00000073 | 115 |
```

### Virtual and physical memory
Both the `p` and `x` commands have their `pp` and `xp` counterparts that peek into the physical memory.

A dump of binary being debugged, for the reference:

``` nasm
0000000000000000 <.data>:
   0:	00c0006f          	j	0xc
   4:	00000013          	nop
   8:	0140006f          	j	0x1c
   c:	ffdff06f          	j	0x8
  10:	00000513          	li	a0,0
  14:	05d00893          	li	a7,93
  18:	00000073          	ecall
  1c:	02a00513          	li	a0,42
  20:	05d00893          	li	a7,93
  24:	00000073          	ecall   
```

## Implementation

Today I learned how to use `strtok` to tokenize a string

```c
    char* line; //input line
    ...
	size_t token_count = 0;
	for (token_count = 0; token_count < 10; token_count++) {
		char* arg = token_count == 0 ? line : NULL;
		tokens[token_count] = strtok(arg, " ");
		if (tokens[token_count] == NULL)
			break;
	}
```

Then use `strcmp` to check the command and pass the parameters to the functions actually dumping the data.

```c
else if (strcmp(tokens[0], "reg") == 0) {
		if (token_count > 1)
			dump_register(state, tokens[1]);
	}
```

## Missing features

It would be quite useful to implement disassembly of the memory regions and support more display formats (8-bit and 16-bit values). 

Setting breakpoints and variable watches would make the debugging from inside the emulator easier. 