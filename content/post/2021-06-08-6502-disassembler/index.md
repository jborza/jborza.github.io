---
draft: true
date:   2021-06-08 18:00:00 +0200
title: Online 6502 disassembler
tags: [6502, assembly, interactive]
---

I've already visited the wonderful [MOS 6502](https://en.wikipedia.org/wiki/MOS_Technology_6502) architecture in a post titled [Fantasy console on a console]({{<ref "2019-10-20-fantasy-console-on-a-console">}}) where I ported my 6502 emulator to the Gameboy Advance. 

Keeping in the spirit of implementing web applications in C, I've extracted and refactored a disassembler out of the [emu6502](https://github.com/jborza/emu6502) emulator. It's usable in the box below:

{{% include-html file="6502dasm_embed.html" %}}

## Making of this tool

The 6502 instruction set is quite simplistic, compared to RISC-V. Decoding of the instructions is very straightforward, basically working our way through a table of instructions and their arguments. The first step is to compile a list of opcodes (instructions with the various addressing modes) into one header:

```c
#define NOP 0xea
#define LDA_IMM 0xa9
#define LDA_ZP 0xa5
#define LDA_ABS 0xad
#define LDA_ABSX 0xbd
#define LDA_INDX 0xa1
```

That is accompanied by a giant switch statement where we map the opcodes to the output

```c
uint8_t* code = (uint8_t*)&buffer[pc];
uint8_t bytes = 1;
char op[32] = "";
switch (*code) {
case NOP: sprintf(op, "NOP"); break;
case LDA_IMM: sprintf(op, "LDA #$%02X", code[1]); bytes = 2; break;
case LDA_ZP: sprintf(op, "LDA $%02X", code[1]); bytes = 2; break;
case LDA_ABS: sprintf(op, "LDA $%02X%02X", code[2], code[1]); bytes = 3; break;
case LDA_ABSX: sprintf(op, "LDA $%02X%02X,X", code[2], code[1]); bytes = 3; break;
case LDA_INDX: sprintf(op, "LDA ($%02X,X)", code[1]); bytes = 2; break;
...
```
Because of the **variable-length instructions**, we need to keep a track of how many `bytes` the disassembler consumed. 
Then we do another hop to print out the value of the opcode arguments, and we end up with code listing as follows:

```gas
   0:           A5 FE           LDA $FE
   2:           85 00           STA $00
   4:           A5 FE           LDA $FE
   6:           29 03           AND #$03
   8:           18              CLC
   9:           69 02           ADC #$02
   B:           85 01           STA $01
   D:           A5 FE           LDA $FE
   F:           A0 00           LDY #$00
  11:           91 00           STA ($00),Y
  13:           4C 00 06        JMP $0600
```

Finally any unknown opcode is turned into a `dcb` directive that instructs assembler to put bytes directly in the binary (used for initial data and such).

The web version is compiled into WebAssembly with [emscripten](https://emscripten.org/) and then embedded into this blog post.

### Source

Sources on GitHub: https://github.com/jborza/6502dasm

> Note: I've taken the liberty of including a couple of examples from 6502asm.com (by Stian Soreng) along with my unfinished brick breaker game as I'm a crummy 6502 programmer. Please also see the interactive [Easy 6502](https://skilldrick.github.io/easy6502/) ebook by Nick Morgan.