---
layout: post
title:  "Adventures in hardware, part 9 - another calculator"
date:   2020-11-21 20:00:00 +0200
categories: hardware
tags: [vhdl, calculator]
# TODO image: /assets/hardware-adventures-5-
published: false
---

# Making a better calculator in hardware

As a follow up to one of my first FPGA projects [Adventures in hardware, part 3 - display and a calculator]({% post_url 2020-08-04-hardware-adventures-3 %}) I wanted to implement a more useful calculator.

I'm still using the three digit seven-segment display as an output - so it can work on numbers from 0 to 999, but this time I wanted to operate it through a 4x4 keypad. 

TODO picture of the entire thing with a number on the display.

> I've been stuck on how to properly read the keypad for quite some time - this was planned to be titled `Hardware Adventures 5`, not `9`, after all.

## The calculator architecture

The main calculator logic is implemented by a state machine with a few registers:

- RESULT holding the intermediate result
- ARG holding the currently 
- DISPLAY holding whatever needs to be displayed on the LCD screen
- OPERATOR holding the previously entered operator (`+-*/`)



```verilog
	state_read_digit = 4'd0,
	state_digit_pressed = 4'd1,
	state_plus_pressed = 4'd2,
	state_minus_pressed = 4'd3,	
	state_multiply_pressed = 4'd4,
	state_display_arg = 4'd5,
	state_calculate = 4'd6,
	state_display_result = 4'd7,
	state_clear = 4'd8,
	state_dividing = 4'd9,
	state_divide_pressed = 4'd10;
```

TODO diagram

## Reading a keypad

In a 4x4 [matrix keypad](https://en.wikipedia.org/wiki/Keyboard_matrix_circuit) the key switches are connected by a grid of wires arranged in 4 columns and 4 rows. 
To determine what button is pressed we need to scanning the crossings of the rows and columns by activating each column one at a time and read back the status of the rows. 
There are [several](https://appcodelabs.com/read-matrix-keypad-using-arduino) [articles](https://www.circuitstoday.com/interfacing-hex-keypad-to-arduino) that go more in depth on the topic. 

Using this information we can write a [module](https://github.com/jborza/fpga_calculator/blob/master/keypad_encoder.v) that encodes a set of 4-bit row and column pins into a hexadecimal keycode. 

```
Keypad layout:

 1 2 3 A          
 4 5 6 B    
 7 8 9 C    
 * 0 # D	
```
> I decided to encode the * and # keys as 0xE and 0xF.


As I wanted to use this for a calculator, I've repurposed the C key for "Clear", 



TODO picture of the keypad (with some keys relabeled)

> We also need to enable builtin [pull-down resistors]([TODO Wikipedia link](https://en.wikipedia.org/wiki/Pull-up_resistor)) on the row pins in order to ensure a known state (logical zero) when a button is not pressed instead of a floating input.

TOOD keypad modularization

TODO state machine in VHDL
TODO state machine picture TODO convert to png - see [dotfile](../assets/hardware-adventures-5-keypad-state-machine.dot)

TODO clock divider as a component

TODO design of the top module so far



## Entering multiple digits and displaying the number

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

A common algorithm for binary to BCD conversion is [Double dabble](https://en.wikipedia.org/wiki/Double_dabble) and I've adapted a Verilog single-clock implementation into a [10-bit version](https://github.com/jborza/fpga_calculator/blob/master/bin2bcd_10bit.vhd).

### Decoding the keypad

### Reading the keypad

Although I've found multiple descriptions for a single button debouncer, I didn't understand how to do it over multiple possible columns that we scan and I attempted to insert some kind of debounce circuit running at a lower frequency *after* the keypad decoder, hoping it would settle on a decoded number - somehow it didn't.

What finally helped was this [assignment](http://www.tkt.cs.tut.fi/kurssit/1426/S12/Ex/ex3/ex3.html) from a Tampere University that described the key poller and debouncer for the students. It describes an algorithm that probes the column successively, and for each column it waits for an input.

I could make the wait and hold times configurable, so it can be tuned to a specific keypad.


Button debounce: from StackOverlow: https://stackoverflow.com/questions/32589963/vhdl-button-debounce-inside-a-mealy-state-machine/32590732#32590732

### The calculator state machine

TODO link to the diagram rendering

### Multiplication

TODO Added multiplication. Why not division? Because I'm lazy to integrate a pipelined divider - all of my other logic operates in a single clock cycle.

### Division
https://stackoverflow.com/questions/40312206/algorithm-for-divison

The simplest algorithm of all is [division by repeated subtraction](https://en.wikipedia.org/wiki/Division_algorithm#Division_by_repeated_subtraction):

```
while N = D do
  N := N - D
  Q := Q + 1
end
R := N
return (Q,R)
```

This translates to a fairly simple verilog.

Integrating divider

As it will run for a various number of clocks, we need to signal the parent module somehow that the division is completed:

We assign the divider inputs, signal it to `start` and transition into a waiting state:
```
end else begin //OP_DIVIDE
	divider_start <= 1'b1;
	numerator <= reg_result;
	denominator <= reg_arg;
	state <= state_dividing;
end
```

Then we continuously poll the `done` signal. If it's asserted, we move over to the common display result state.

```
state_dividing:
begin
    divider_start <= 1'b0;
    if(divider_done)
    begin
        reg_result <= quotient;
        state <= state_display_result;
    end
end
```

TODO simulator output



### Stupid errors

> I forgot again to connect a top module input to a pin. This will produce a cryptic message.

Note: keypad now doesn't read zero!! we need a flag that will distinguish legitimate zero from a non-press.

#### boo
Verilog doesn't tell you when you make a typo and wire a module to something nonexistent.  IO_P4_ROW as IO_DP4_ROW

#### clock
Work on one clock, not multiples due to clock domain - TODO add some explanation