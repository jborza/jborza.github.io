---
layout: post
title:  "MCPU emulator (and ATTiny85 port)"
date:   2020-09-05 22:00:00 +0200
categories: emulation
tags: [c, minimal, arduino]
published: true
---

## mcpu-emu : an emulator for MCPU

MCPU is a neat minimal 8-bit CPU (CPU design by Tim Boescke in 2001, cpldcpu@opencores.org) - see its [opencores project file](https://opencores.org/projects/mcpu) and [GitHub repo](https://github.com/cpldcpu/MCPU). It fits into 32 macrocells on a CPLD and can operate on 64 bytes of RAM.

Being a minimal CPU it supports only four 8-bit instructions, that consist of 2 bit opcode and 6 bit address/immediate field.

It has two registers - an 8-bit accumulator and 6-bit program counter. MCPU supports 64 bytes of RAM shared between program and data.

The instruction set is:

| mnemonic | opcode | description
| -- | -- | --
| NOR | 00AAAAAA | Acc = Acc NOR mem\[AAAAAA\]
| ADD | 01AAAAAA | Acc = Acc +  mem\[AAAAAA\], update carry
| STA | 10AAAAAA | mem\[AAAAAA\] = Acc
| JCC | 11AAAAAA | PC = AAAAAA if carry = 0, clear carry

I've also added an "OUT" instruction according to Jean-Claude Wippler's [TFoC - A minimal computer](https://jeelabs.org/2017/11/tfoc---a-minimal-computer/) article, with the opcode of 0xFF that prints the accumulator to the standard output.

## The emulator

```c
typedef struct mcpu_state {
	uint8_t accu : 8;
	uint8_t carry : 1;
	uint8_t pc : 6;
	uint8_t memory[MEM_SIZE];
} mcpu_state;
```

Then the emulation loop dispatches to instruction handlers based on the first two bits of the opcode.

I decided to represent the state of the CPU with a bitfield structure:

```c
//Acc = Acc NOR mem[AAAAAA]
void nor(mcpu_state* state, uint8_t opcode) {
	state->accu = (state->accu | state->memory[opcode]) ^ 0xFF;
}

//Acc = Acc +  mem[AAAAAA], update carry
void add(mcpu_state* state, uint8_t opcode) {
	uint8_t immediate = opcode & 0x3f;
	//update carry first
	uint16_t result = (state->accu + state->memory[immediate]);
	state->carry = result >> 8;
	state->accu = result;
}

//mem[AAAAAA] = Acc
void sta(mcpu_state* state, uint8_t opcode) {
	uint8_t immediate = opcode & 0x3f;
	state->memory[immediate] = state->accu;

}

//PC = AAAAAA if carry = 0, clear carry
void jcc(mcpu_state* state, uint8_t opcode) {
	uint8_t immediate = opcode & 0x3f;
	if (opcode == 0xFF) //output pseudo-instruction 0xFF
		printf("%d\n", state->accu);
	else if (state->carry == 0) {
		state->pc = immediate;
	}
	state->carry = 0;
}
```

One can optionally print out the currently executed instruction with a small disassembler:

```c
void disassemble(mcpu_state *state, char* str) {
	uint8_t opcode = state->memory[state->pc];
	uint8_t immediate = opcode & 0x3f;
	switch (opcode >> 6) {
	case MATCH_NOR:
		sprintf(str, "NOR $%2X [%2X]", immediate, state->memory[immediate]);
		break;
	case MATCH_ADD:
		sprintf(str, "ADD $%2X [%2X]", immediate, state->memory[immediate]);
		break;
	case MATCH_STA:
		sprintf(str, "STA $%2X", immediate);
		break;
	case MATCH_JCC:
		sprintf(str, "JCC $%2X", immediate);
		break;
	}
}
```

### Getting some test programs

The [TFoC - A minimal computer](https://jeelabs.org/2017/11/tfoc---a-minimal-computer/) article comes with two code examples, with the code formatted as a hexdump

```
3E 45 7F C2 C4 FA 00 00 00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00 00 00 00 00 FF 01
```

I converted this to a binary file (easier to consume by the C emulator)  with a following bash script that replaces the newlines with spaces, then gets rid of double spaces left by \r\n conversion and finally uses `xxd` to perform a "reverse hexdump":

```bash
#/!bin/bash
cat $1 | tr '\r\n' ' '  | sed -e 's/[[:blank:]]\+/ /g' | xxd -r -p > $2
```

Using a disassembler and tweaking the output a bit  yields the following code

```nasm
 0:     3E      NOR $3E    ; acc = 0    (from address 3E)
 1:     45      ADD $ 5    ; acc += 250 (from address 5)
 2:     7F      ADD $3F    ; acc += 1   (from address 3F)
 3:     C2      JCC $ 2    ; if carry occurred, jump to line 2
 4:     C4      JCC $ 4    ; endless loop, jump to itself
 5:     FA      -------    ; literal 250
...
3E:     FF      -------    ; literal 255
3F:      1      -------    ; literal 1
```

Notice that there are no immediate values, one can only work with what's already in the memory, hence the literals 1, 250 and 255 need to exist somewhere within the RAM.

Stepping through the program shows it behaves as expected:

```
NOR $3E [FF]          A:00 C:0 PC:01
ADD $05 [FA]          A:FA C:0 PC:02
ADD $3F [01]          A:FB C:0 PC:03
JCC $02               A:FB C:0 PC:02
ADD $3F [01]          A:FC C:0 PC:03
JCC $02               A:FC C:0 PC:02
ADD $3F [01]          A:FD C:0 PC:03
JCC $02               A:FD C:0 PC:02
ADD $3F [01]          A:FE C:0 PC:03
JCC $02               A:FE C:0 PC:02
ADD $3F [01]          A:FF C:0 PC:03
JCC $02               A:FF C:0 PC:02
ADD $3F [01]          A:00 C:1 PC:03
JCC $02               A:00 C:0 PC:04
JCC $04               A:00 C:0 PC:04
JCC $04               A:00 C:0 PC:04
.. [JCC $04 repeats in an endless loop]
```

It seemed it would be a useful thing to add a simple infinite loop detection - if the JCC instruction is jumping to its own address, there is no escape from this state as it won't change the carry flag.

A second example - printing out prime numbers that fit into 8-bit number (up to 251) is more complex. It also required adding the special output opcode as mentioned earlier to see the results. 

### Porting to a ~~potato~~ microcontroller

What's the best way to appreciate an emulator for a minimal chip published almost 20 years ago? Porting and running it on the smallest CPU I have at home - an ATTiny85 chip, which has 512 bytes of RAM and runs at 16 MHz.

There are two things that won't work straightforward - there's no filesystem to read the RAM/ROM binary from and  and there's also no standard output.

#### Loading the binaries

We can solve the first problem by including the emulated image to the source as a C array, `hexdump` can help producing the 0x-encoded bytes we need from the binary file:

```bash
$ hexdump -ve '1/1 "0x%.2x,"' prog_test.bin
0x3e,0x45,0x7f,0xc2,0xc4,...
```

This way we can directly use a byte array as the ROM/RAM image.

#### Output

We can solve the second problem by exploiting the fact that the DigiStump with ATTiny85 can act as an USB keyboard - so we just let it type out the output to the text editor of our choice.

```c
//using this instead of printf() or Serial.print()
DigiKeyboard.println("NOR");
```

A 3-second delay after initializing the board helped get me ready to switch to a different text editor to capture the output instead of overwriting the source code :).

#### Code golfing to trim the binary size

The code also required some golfing as the maximum binary size for my ATTiny board is 6 kb. The tricks I used to slim down the compiled version included:
- inlining some functions
- simplifying the disassembler
- loading only the non-zero part of the binary

Slimming the disassembler down:

```c
char* mnemonics[] = {"N","A","S","J"};

void disassemble(mcpu_state* state, char* str) {
  uint8_t opcode = state->memory[state->pc];
  uint8_t immediate = opcode & 0x3f;
  sprintf(str, "%s $%02X [%02X]", mnemonics[opcode >> 6], immediate, state->memory[immediate]);
}
```

##### Random code golfing tidbits:

- Printing the newline as a part of string and using `DigiKeyboard.print` instead of `DigiKeyboard.println` saves 14 bytes
- using `#define` instead of variables saves bytes
- replacing `sprintf()` with a series of `DigiKeyboard.print` calls saved 1.4 kb of the binary size!
- replacing `sprinf()`
- loading the binary as a sequence of `state->memory[0] = 0x3e;` calls is shorter than initializing an array, and copying to CPU memory by a for loop in case of short binaries (8 bytes)

That meant I had enough space to add blinking a LED and making a "tick" sound on a buzzer on every clock cycle! 
I ended up with a final binary size of **4498 bytes** for the prime-calculating binary with just the number as the output and **4858 bytes** with disassembler and status information in.

It's also painfully slow - the delay between the first few and the last prime numbers is noticeable and it takes around 300 ms to calculate and print the very last primes (up to 255).

### Sources

[mcpu-emu on GitHub](https://github.com/jborza/mcpu-emu)

[ATTiny85 / Arduino port](https://github.com/jborza/mcpu-emu/tree/master/mcpu-digistump) 