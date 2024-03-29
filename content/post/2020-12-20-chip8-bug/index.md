---
layout: post
title:  "CHIP-8 emulators inconsistent behavior"
date:   2020-12-23 21:00:00 +0200
categories: emulation
tags: [chip8]
image: 2020-12-23-chip8-poo-demo.gif
published: true
---

# CHIP-8 arithmetic behavior and VF variable

I've been fiddling with CHIP-8 and writing a sample program in [Octo](http://johnearnest.github.io/Octo/) - a CHIP-8 IDE/assembler with a nicer scripting language than raw opcodes.

I wanted to make a demo to try out various opcodes and while doing that found a bug in my CHIP-8 emulator within the arithmetic operations.

![](2020-12-23-chip8-poo-demo.gif)

_The demo ([and its source code](https://github.com/jborza/emuchip8/blob/master/roms/demo-poo.8o))_

### VF as a destination

I've encountered a different behavior between my emulator _emuchip8_ and Octo (which I use as a reference) and got somewhat. Octo implements the >= pseudo-operation as by using the subtraction instructions -= and =- and querying vf - this was broken on my emulator.

Given the following program:

    6008
    6F20
    8F07

What should be the value of vf after the 8F07 opcode executes? (so vf = v0 - vf; vf = 0x08 - 0x20 = 0xe8).

I think it should it be 0 because the borrow flag has a priority over the subtraction result, but [several](https://github.com/starrhorne/chip8-rust/blob/master/src/processor.rs#L296) [emulators](https://github.com/taniarascia/chip8/blob/master/classes/CPU.js#L271) [online](https://code.austinmorlan.com/austin/chip8-emulator/src/branch/master/Source/Chip8.cpp#L331) seem to take the opposite priority (in comparison to [Octo)](https://github.com/JohnEarnest/Octo/blob/gh-pages/js/emulator.js#L325). 

The original documentation  [COSMAC\_VIP\_Instruction\_Manual\_1978.pdf (archive.org)](https://ia803208.us.archive.org/29/items/bitsavers_rcacosmacCManual1978_6956559/COSMAC_VIP_Instruction_Manual_1978.pdf) says the VF is used for overflow in the arithmetic operations, but I didn't get around to disassembling the original interpreter :).

![](2020-12-23-chip8-manual-2.png)

**So the result should be saved in VX first, then the flag in VF.**

### VF when vx == vy

In addition, the VF subtraction behavior seems to be wrong in one other edge case as well in these open-source emulators - the original docs say that (for 8XY5): VX = VX - VY (VF= 0 if vx < vx; VF = 1 if vx >= vy).

Again, found [emulators](https://github.com/taniarascia/chip8/blob/master/classes/CPU.js#L256) [online](https://github.com/loktar00/chip8/blob/a5137c2a8af2ddc812b35c1a836a6edeac476feb/chip8.js#L228) that implements it as:

```c
vf = vx > vy ? 1 : 0;
```

The code above yields incorrect result in the case when `vx equals vy`.

If `vx == vy` the result in VF **should be 1** according to RCA COSMAC VIP manual. Wikipedia is right as well, specifying that VF is set to 0 when there's a borrow, and 1 when there isn't.  - there is no borrow when you do 9-9, so it's not wrong either.

![](2020-12-23-chip8-manual-1.png)

This can be tested with the [following ROM](https://github.com/jborza/emuchip8/blob/master/roms/test-overflow.ch8):

```sh
0x6004   # v0 := 4
0x8005   # v0 -= v0
0xFF29   # set i to sprite 0 or 1 based on the value of vf
0xD005   # should draw sprite of 1
```