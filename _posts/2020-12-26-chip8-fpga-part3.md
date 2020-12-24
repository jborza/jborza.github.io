---
layout: post
title:  "CHIP-8 in hardware - part 2"
date:   2020-12-24 20:00:00 +0200
categories: hardware
tags: [emulation, console, fpga, verilog, chip8]
#image: TODO
published: false
---

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


## VGA driver

As the CHIP-8 specifications reserves the address `0x000 - 0x1FF` for the interpreter use, we can designate the `0x100 - 0x1FF` region as the internal framebuffer. The VGA driver is split into two modules:

**Horizontal/vertical sync generator** (hvsync) and **pixel generator**.

To make my life a bit simpler, the hvsync generator, which normally generates VGA pixel coordinates (640x480) also generates CHIP-8 pixel coordinates (64x32) along the way, so we can know exactly where in the RAM the pixel values are located.

The pixel generator reads the byte of the memory on every "pixel tick", looks at the bit that corresponds to the CHIP-8 x/y coordinates and outputs black or white color on the VGA interface.

> Note: It seems inefficient to read the memory for every pixel as we really need a new byt every 800 pixels (as we scale both `x` and `y` dimension by a factor of 10), but this module has nothing better to do anyway.

### TODO - memory bus

### TODO - keypad

## What's next

We still need some user input (from a keypad), prepare some kind of bus to transfer data between memories, think about how to implement the buzzer.