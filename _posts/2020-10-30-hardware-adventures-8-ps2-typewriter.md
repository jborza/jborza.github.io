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

It was a bit of a nuisance to try to capture the PS2 clock on oscilloscope. Again, reading the specs more correctly could have left me less surprised.

### PS2 protocol

The transmitting device (keyboard or mouse) triggers the clock at range 10-16.7 kHz, then these bits come over the data pin, on the each falling edge of the PS2 clock:
- 1 start bit
- 8 data bits
- 1 parity bit
- 1 stop bit

This [assignment](https://students.iitk.ac.in/eclub/assets/tutorials/keyboard.pdf) describes a simple approach to collecting the data, triggered by the `@negedge clk` and just collecting 8 data bits and ignoring others in an 11-state state machine.

![oscilloscope with PS2](/assets/hw8-scope-ps2.jpg)

_PS2 clock pin waveform captured on an oscilloscope_

### PS2 receiver

If we want to play nice with the rest of the system, we should encapsulate the protocol into a PS2 receiver module with the following interface (as per this [article](http://www.zaphinath.com/ps2-receiver-module-for-vhdl/)):

```verilog
module ps2_rx (
	input wire clk, reset,
	input wire ps2d, //PS2 data
	input wire ps2c, //PS2 clock
	input wire rx_en, //receiver enable
	output reg rx_done_tick, //signal that data is available
	output wire [7:0] dout //PS2 scancode
);
```

We can then connect this to the rest of the module by using the `rx_done_tick` pin. In this case I directly move the received ASCII code (converted from the scancode by the following [Verilog module](https://github.com/jborza/fpga-ps2-typewriter/blob/master/key2ascii.v)) into the display RAM, which is later shown on screen.

This is what happened when I typed "hello" on the keyboard:

![TODO](/assets/hw8-hello.jpg)

Hm, not really what I expected. Looking at PS2 protocol again, it operates with a concept of make/break codes, so a scancode for `H` is sent first when it's pushed, then another when it's released.

### What did I learn

Check if your reset button is active-low or active-high logic (https://en.wikipedia.org/wiki/Logic_level#Active_state).
I have spent an hour looking at code, debugging various signals only to realize my reset button sends logical one if not pressed.

