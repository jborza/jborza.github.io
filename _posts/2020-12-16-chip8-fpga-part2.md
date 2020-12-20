---
layout: post
title:  "CHIP-8 in hardware - part 2"
date:   2020-12-20 20:00:00 +0200
categories: hardware
tags: [console, fpga, verilog, chip8]
#image: TODO
published: false
---

# CHIP-8 in hardware - VGA, instruction decoder, CPU states

As described in the previous part (TODO link), we:
- fetch instruction (2 bytes) from the memory into an 16-bit `opcode` register
- decode the instruction 
- execute the instruction

## CPU opcodes

I can now divide the CPU opcodes into two groups - single-clock cycle *simple* operations and those that would require multiple clock cycles to execute.

**Multi-clock** operations:
- DXYN (draw)
- FX33 (binary to BCD)
- FX55 (dump registers V0 to Vx - needs multiple memory stores)
- FX65 (load registers V0 to Vx - needs multiple memory loads)

**Simple operations** are probably all the others.

The multi-clock operations would require additional state on the state machine that the *execute* state will transition to.

Some operations need to write back the value to the Vx (or V0) registers, so 

We can start enhancing the CPU state machine by adding states:

![states](/assets/chip8-cpu-states300.png)

## Instruction decoder

We fetch the opcode into `reg [15:0] opcode` register. It can be divided into four nibbles `[15:12],[11:8],[7:4],[3:0]` that we use to extract the helper values - such as `x`,`y`,`NNN` that are used by various opcodes. As my CHIP-8 design features a standalone ALU, we also prepare ALU operands.

We also map the 0,E and F instructions to **secondary operations** 0-B.

| code | last byte |
|-|-|
|**0XXX:**|
|0| E0
|1| EE
|**EXXX:**
|2| 9E
|3| A1
|**FXXX:**
|4| 07
|5| 0A
|6| 15
|7| 18
|8| 1E
|9| 29
|A| 33
|B| 65

I've encoded these into a Verilog header that's included both by the instruction decoder and the CPU.

## VGA driver

As the CHIP-8 specifications reserves the address `0x000 - 0x1FF` for the interpreter use, we can designate the `0x100 - 0x1FF` region as the internal framebuffer. The VGA driver is split into two modules:

**Horizontal/vertical sync generator** (hvsync) and **pixel generator**.

To make my life a bit simpler, the hvsync generator, which normally generates VGA pixel coordinates (640x480) also generates CHIP-8 pixel coordinates (64x32) along the way, so we can know exactly where in the RAM the pixel values are located.

The pixel generator reads the byte of the memory on every "pixel tick", looks at the bit that corresponds to the CHIP-8 x/y coordinates and outputs black or white color on the VGA interface.

> Note: It seems inefficient to read the memory for every pixel as we really need a new byt every 800 pixels (as we scale both `x` and `y` dimension by a factor of 10), but this module has nothing better to do anyway.

### RAM converter

As a quick shortcut I dumped the CHIP-8 RAM contents from my C emulator and converted them to the RAM `.txt` initialization format using a following Python script that reads each byte and outputs it as 8 bits on every line:

```python
import sys
with open(sys.argv[1],"rb") as f:
    bytes_read = f.read()
for byte in bytes_read:
    print(f'{byte:08b}')
```

> Note: I could build with the font ROM and game ROM separately - check how it's done in Quartus.

Maybe I should memory map the display memory to some region (100-1FF) - would make it easier than a separate display memory

I've also converted the registers to a register file module
Maybe convert the registers to a nicer register file so the implementation isn't so awful?