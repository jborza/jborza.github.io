---
layout: post
title:  "Adventures in hardware, part 7 - PS2 typewriter"
date:   2020-10-30 16:30:00 +0200
categories: hardware
tags: [fpga, verilog, lcd, ps2]
TODO image: /assets/hw8-.jpg
published: false
---

Notes:
- recycled PS2 scancode to ascii verilog module
- recycled display controller + ram 
- ps2 receiver

I again ran into a problem of the synthesizer optimized most of my logic away. While looking for the root cause, this warning helped:

> Warning (12241): 1 hierarchies have connectivity warnings - see the Connectivity Checks report folder

Connectivity checks was useful - it told me which port I missed in a module and it was stuck on GND.

I would really appreciate a nicer autocomplete when wiring Verilog modules.

It was a bit of a nuisance to try to capture the PS2 clock on oscilloscope 

Lesson learned:
Check if your reset button is positive or negative logic (TODO check for technical term).
I have spent an hour looking at code, debugging various signals only to realize my reset button sends logical one if not pressed.