---
layout: post
title:  "Adventures in hardware, part 5 - another calculator"
date:   2020-08-20 20:00:00 +0200
categories: hardware
tags: [vhdl, calculator]
# TODO image: /assets/hardware-adventures-5-
published: false
---

# Making a better calculator in hardware

https://appcodelabs.com/read-matrix-keypad-using-arduino

The principle is straightforward: you put a signal on one of the columns and proceed to read all of the rows in turn. If the signal appears on any of the rows then you know that rows is connected to the column you put the signal on, so the key at the intersection of that row and column must be pressed. If there was no signal, try the next column, and so on, until you’ve tried all the columns.

This process is called a matrix scan. TODO describe

TODO picture of the keypad

We also need to enable builtin [pull-down resistors](TODO Wikipedia link) on the row pins in order to ensure a known state (logical zero) when a button is not pressed.

TOOD keypad modularization

TODO state machine in VHDL
TODO state machine picture TODO convert to png - see [dotfile](../assets/hardware-adventures-5-keypad-state-machine.dot)

TODO clock divider as a component

TODO design of the top module so far

## Entering multiple digits

How do we know that the user has pressed and released a button? By using a signal that indicates if anything is pressed.
Then whenever a new `OutputReady` (TODO rename) signal comes in, we can read it.
However, we also have to think about timing issues - maybe we have to "clear" the keypad input so don't read the button multiple times if the user keeps holding a button for multiple scanning periods.

TODO link state machine for reading the digits

I think the best way is to have a binary internal representation. This will need to be updated after every keypress to do 
reg_arg*=10; reg_arg+=N. We could avoid multiplication by doing `reg_arg * 8 + reg_arg * 2`, which can be implemented by binary shift. But as my FPGA has a few hardware multipliers, let's just do multiplication in VHDL.

then convert to BCD for display on the 7-seg display.

3-digit BCD to binary: 
- take digit 1 and resolve to 1,2,3,...
- take digit 2 and resolve to 10,20,30,...
- take digit 3 and resolve to 100,200,300,...
- add results together

We need `ceil(log2(pow(10, N)))` bits to represent N digits. If we want to represent signed numbers, we need one bit more to be safe. In our case with 3 digits, `ceil(log2(pow(10, 3))) = 10`, so we need 10 bits for unsigned 3-digit number (range 0-1023).

### Timing stuff

http://www.tkt.cs.tut.fi/kurssit/1426/S12/Ex/ex3/ex3.html

Button debounce: from StackOverlow: https://stackoverflow.com/questions/32589963/vhdl-button-debounce-inside-a-mealy-state-machine/32590732#32590732

### Stupid errors

> I forgot again to connect a top module input to a pin. This will produce a cryptic message.

Note: keypad now doesn't read zero!! we need a flag that will distinguish legitimate zero from a non-press.