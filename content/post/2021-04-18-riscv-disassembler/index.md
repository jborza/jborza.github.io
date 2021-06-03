---
layout: post
published: true
date:   2021-04-18 09:00:00 +0200
categories: emulation
tags: [riscv, assembly, interactive]
image: 2021-04-18-riscvdasm.png 
title: "Online RISC-V disassembler"
---

# Making a nicer disassembler

I've had a rudimentary disassembler in the `emuriscv` emulator, but compared to other disassemblers out there it was not very refined. Debugging and fixing the emulator required me to read a lot of disassembled code, which I generated with GNU `objdump`, but the problem was that my tool printed out a slightly different output format compared to `objdump`. Having two separate disassembly listing formats to keep in my head was confusing enough, so I set out to achieve a comparable output to the reference tool. 

Also, I kind of like the idea of doing web development in C.

After extracting the disassembly code from the emulator into a separate C project and implementing the improvements discussed below, I've also also converted it into a web tool, which you can try out below, as it's embedded into this blog post:

{{% include-html file="2021-04-18-riscvdasm_embed.html" %}}

> ℹ️ You can download the sample binaries from the list just above this text and try it out! 

## The "making of" the tool

The initial version was quite utilitarian, formatting all registers as `x0`..`x31` and operands as 8-digit hexadecimal number. I was quite happy with the output of GNU `objdump`, which included a couple of quality-of-life improvements:
- register renaming (e.g. `x2` to `sp`)
- CSR register naming (e.g. `0x340` to `mscratch`) 
- pseudo-ops (e.g. `jal x0, 0x200` to `j 0x200`)

Let's start by comparing the output of the initial and improved version of a disassembly of the same binary - the first 48 bytes of the [BBL boot loader](https://github.com/riscv/riscv-pk/blob/master/machine/mentry.S#L36), starting from the reset vector, showing the code of the trap vector starting at 0x4.

#### Initial version
```nasm
       0:       2000006F        jal x0,0x00000200
       4:       34011173        csrrw x2,x2,0x00000340
       8:       1A010C63        beq x2,x0,0x000001b8
       C:       02A12423        sw x10,40(x2)
      10:       02B12623        sw x11,44(x2)
      14:       342025F3        csrrs x11,x0,0x00000342
      18:       0805D263        bge x11,x0,0x00000084
      1C:       00159593        slli x11,x11,0x00000001
      20:       00E00513        addi x10,x0,0x0000000e
      24:       02B51263        bne x10,x11,0x00000024
      28:       08000513        addi x10,x0,0x00000080
      2C:       30453073        csrrc x0,x10,0x00000304
```

#### Current version

```nasm
       0:	2000006f		j	0x200
       4:	34011173		csrrw	sp,mscratch,sp
       8:	1a010c63		beqz	sp,0x1c0
       c:	02a12423		sw	a0,40(sp)
      10:	02b12623		sw	a1,44(sp)
      14:	342025f3		csrr	a1,mcause
      18:	0805d263		bgez	a1,0x9c
      1c:	00159593		slli	a1,a1,0x1
      20:	00e00513		li	a0,14
      24:	02b51263		bne	a0,a1,0x48
      28:	08000513		li	a0,128
      2c:	30453073		csrc	mie,a0
```

## Decoding the instructions

Here's how an instruction gets decoded and printed out, along with an example of a pseudo-op decoding:

```c
void jal(State* state, word* instruction) {
	sword offset = get_j_imm(*instruction);
	int rd = GET_RD(*instruction);
	if(rd == 0)
		PRINT_DEBUG("j\t0x%X\n", offset+state->pc);
	else
		PRINT_DEBUG("jal\t%s,0x%X\n", register_name[rd], offset+state->pc);
}
```

The `jal` stands for `jump and link register`, and by linking it's supposed to stores the address of the instruction following the jump (pc+4) into the `rd` register in case we'd want to return back sometime after the jump. 

However, if `rd` points to the `zero` register, it's a straightforward jump, so jumps that don't need to return back  can also be specified as `j 0x200` in RISC-V assembly.

> The `PRINT_DEBUG` macro is an alias for `printf`.

But how do we decode `0x2000006f` to the `jal` opcode?

The [tooling](https://github.com/riscv/riscv-opcodes) can generate C headers with a set of definitions for each opcode: 

```c
#define MATCH_JAL 0x6f
#define MASK_JAL  0x7f
```

and using that I have a big [if statement](https://github.com/jborza/riscvdasm/blob/master/disassembler.c#L470) that does the matching:

```c
else if ((*instruction & MATCH_JAL) == MASK_JAL) { jal(state, instruction);	}
```

### Register renaming

Implementing the register renaming was straightforward, as it's just a matter of using an array with the mnemonic names instead of the old `"x%d"` format string.

```c
const char* register_name[] = {
  "zero", "ra", "sp", "gp", "tp", "t0", "t1", 
  ... };
  //which could also be
  //"x0", "x1", "x2", "x3", "x4", "x5", "x6",
```

then looking the name up as: `register_name[GET_RD(*instruction)]`. `GET_RD` is just a macro that's used to get the destination register. Because of the RISC-V instruction formats overlap, the source and destination registers always get encoded in the same place, making a disassembler's job easier.

```c
#define GET_RD(x) ((x >> 7) & 0x1F)
```

> In retrospect, I wish I had used inline functions instead of the macros as the former can also be used in a debugger. 

### CSR register renaming

A similar logic applies to CSR (control and status) registers. However, instead of using a large array and indexing it by the CSR register number, I generate a function that returns the CSR name. I've copied this bit of idiomatic C code from the [SPIKE RISC-V simulator](https://github.com/riscv/riscv-isa-sim/blob/21684fd9b073cf9bd8f8d23cfc5f94ce361f170c/disasm/regnames.cc#L26) as otherwise I would have probably generated the code in Python :). 

By redefining what does the macro does before including the header file we can generate various different handlers.

```c
// csr_names.h
DECLARE_CSR(mstatus, CSR_MSTATUS)
DECLARE_CSR(misa, CSR_MISA)
DECLARE_CSR(medeleg, CSR_MEDELEG)
DECLARE_CSR(mideleg, CSR_MIDELEG)

//register.c
const char* csr_name(int csr) {
  switch (csr) {
    #define DECLARE_CSR(name, number)  case number: return #name;
    #include "csr_names.h"
    #undef DECLARE_CSR
  }
  return "unknown-csr";
}

```

## Web version

These days it's relatively straightforward to reuse a native code in C on the web by compiling it into WebAssembly and embedding on a web page. To do that, I used the [emscripten](https://emscripten.org/) toolchain. 

I compiled it with the following options in order to get embedded into this blog post without loading additional javascript or wasm resources:

```sh
emcc ../*.c -O3 -o auto_em.js --pre-js=pre.js --memory-init-file 0 -s "EXPORTED_FUNCTIONS=['_disassemble_file']" -s "EXTRA_EXPORTED_RUNTIME_METHODS=['ccall']" -s FORCE_FILESYSTEM=1 -s WASM=0;
```

In a typical setting, I'd omit the `--memory-init-file 0 -s WASM=0` flags to get a separate .wasm file.

The binary file selected by the user comes from a regular `<input type="file">`, which gets written into the emscripten's virtual file system, and then we invoke the disassembly function with the name of the (new) file as an argument.
 
### What's still missing

Floating point and compressed instruction support. First, I'm not entirely on board with the variable-length instruction set idea, as it lead to practically a new ISA (ARM vs ARM Thumb). The "C" extension on the RISC-V side is not that different from the regular 32-bit instructions, but the it does introduce 8 new instruction formats and a different scaling of immediate values (for load and store instructions). 

The "F" extension for single-point precision floating point adds 32 more registers, a new `fscr` status register, various rounding modes and flags. This, along with the compressed instruction extension seemed unnecessary to implement in both the emulator and disassembler, as I can compile my own code. 

Reading [ELF](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format) formatted binaries headers would also be nice, with the ability of extracting just the `code` section. However, one can still strip binaries with `objcopy -b binary` and disassemble flat binaries.

And finally, 64-bit support as the 64-bit toolchain seems to be more widespread.

### Links

- [RISC-V Assembly Programmer's Manual](https://github.com/riscv/riscv-asm-manual/blob/master/riscv-asm.md)
- [riscvdasm repository](https://github.com/jborza/riscvdasm)
- [a standalone version](https://jborza.com/riscvdasm)