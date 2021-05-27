---
layout: post
title:  "Adventures in hardware, part 4 - digital circuit design"
date:   2020-08-06 20:00:00 +0200
categories: hardware
tags: [logic, circuit, nand2tetris]
# TODO image: /assets/hardware-adventures-3-
published: false
---

# Digital circuit design with Deeds

> Disclaimer:
> I'm no electrical or hardware engineer. Things written in this blog post may be inaccurate or false.

I've found an awesome software for toy digital circuit design - [Deeds](https://www.digitalelectronicsdeeds.com/index.html), created by Giuliano Donzellini from University of Genoa. 

It's been really nice to complement the design sessions from the Nand2Tetris course with actually laying out the circuits in Deeds. 

Some caveats in comparison to Nand2Tetris, as the HDL of Nand2Tetris is simplified:

Registers have CL, Ck, E pins. It seems that E stands for Enable, Ck is clock signal and CL is the inverted clear bit. (probably signified by the dash above CL).

(TODO find unicode upper dash?)

RAM chips have CK, WE, CS pins. CK is clock, WE seems to be write enable (set it to high to enable), CS may be chip select? When CS is set to low, the RAM chips output zeroes.

I've also found it handy to route a clear signal to the registers and RAMS during a start of a simulation session.

I can also make my own reusable circuit element. They are done by switching to a new Deeds mode - File->New Block. Instead of using regular inputs/outputs you just use block inputs/outputs. You can also develop the component in the Circuit mode and copy/paste to the Block mode.

It took me a bit of time to figure out how to load it - it's Circuit->Components->Custom Components->Circuit Block Element (CBE) and then pick a CBE file you created in a previous step.

note: This is also similar to structural mode of VHDL - connecting things by the pins.

TODO screenshots of design vs HDL (vs VHDL)
Deeds can also generate VHDL from your design, 