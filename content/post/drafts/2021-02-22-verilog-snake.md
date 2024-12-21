---
layout: post
title:  "Verilog snake TODO"
date:   2021-01-11 23:59:00 +0200
categories: hardware
tags: [verilog, snake]
image: #/assets/2020-01-04-chip8-vga-out.jpg
published: false
---
- what could it be? Ignore displays and 
- Does UART to USB work out of the box?


maybe https://www.instructables.com/Breakout-Game/ ?

Composite video? https://jeelabs.org/2016/11/composite-video-from-fpga/

Three I/O pin definitions, one 470 Ω and one 1 kΩ resistor, an optional 1 nF filtering cap between output and ground, 

Also: https://excamera.com/sphinx/fpga-ntsc.html

I could do a 16x16 snake in Verilog, although I'm not sure how to "grow" the snake and represent a linked list.
Random could be done by the LFSR. 

- 16x16 1 bit display buffer
- 4 button input (use the keypad)
- resistors for the composite out
- build a composite out connector? :/ or just stick some jumper wires in?
- prototype in C/C#

If we ignore linked list, we can prepare an array, snake will have max length of 64 (for example) and there will be 'length' register.
The code to check if the snake bit is on or off?

Or: ring buffer, bake the snake body into the display buffer, so the drawing algorithm is quick, then whenever the snake moves we unset the snake pixel (if it doesn't happen to be the food pixel).

Keep track of the head and tail position (achieved by the ring buffer).

Maybe we can draw directly to the 

The update state increments/decrements the head position

Then checks if the head is supposed to hit the right wall, left wall, top or bottom. (previous state + direction - a couple of comparisons)

Prototype on the Quartus board on VGA / LCD ??

Keypad with or without debouncer?

So - FPGA snake or Pong?
Pong is easier due to no circular buffers

see https://esrd2014.blogspot.com/p/first-in-first-out-buffer.html

Lo-Fi VGA? 

3.3V HSYNC, VSYNC
0.7V R,G,B
GND -> GND

