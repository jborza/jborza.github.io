---
layout: post
title:  "Adventures in hardware, part 3 - displays"
date:   2020-08-02 17:00:00 +0200
categories: hardware
tags: [development, vhdl, fpga]
# TODO image: /assets/hardware-adventures-3-
published: false
---

# Let's do a calculator

Let's make a very simplistic 3-bit calculator that will:
- add or subtract number A and B
- number A is entered by DIP switches 1,2,3
- number B is entered by DIP switches 4,5,6
- operation (+/-) is defined by DIP switch 8

| number | DIP | LED |
| -- | -- | -- |
| A | 1,2,3 | 1 |
| B | 4,5,6 | 2 |
| A+B / A-B | 8 | 3 |

To do that, we would need two instances of a "number display" that would display each of our 3-bit numbers (A, B) on their respective displays. Then we would need some logic performs arithmetics on the numbers resulting in a 4-bit number (result) that would be displayed on the third display in hexadecimal format.

### Making a small display

The Seven-segment display configuration on Elbert v2 is wired as follows:

```
        1    
      ____
   6 |    | 2
     |_7__| 
   5 |    | 3
     |____| .0
       4
```

It actually contains eight segments - seven for the number and eigth for the decimal point.

To display a 3-bit input `Number`, I've used the VHDL `with ... select` statement and just listed the combinations of the active segments. Note that the display uses an active-low configuration, so the segments that are sent digital 0 are turned on (contrary to what I expected).

```vhdl
    Port ( SevenSegment : out  STD_LOGIC_VECTOR (7 downto 0);
           Number : in  STD_LOGIC_VECTOR (2 downto 0));
...
	with Number select
		SevenSegment(7 downto 1) <=
			"0000001" when "000", --0
			"1001111" when "001", --1
			"0010010" when "010", --2
			"0000110" when "011", --3
			"1001100" when "100", --4
			"0100100" when "101", --5
			"0100000" when "110", --6
			"0001111" when others; --7
		SevenSegment(0) <= '1'; --decimal point
```

> The `others` keyword is similar to a `default` case in switch in C or Java.

We can make a 4-bit display module similarly by extending the patterns to go from 8 to F.

### Driving the display

Because the "data" for the entire display is connected by 8 wires (one for each segment), and there are 3 display numbers, we need to toggle between them using the `Enable` signal. We can do this by introducing a "driver" component, that will receive 
- clock signal
- three 8-bit seven-segment inputs (for numbers 1,2,3)

And we expect it to display the number 1 on a first clock cycle, number 2 on a second clock cycle, number 3 on the third cycle, and repeat.


### Simulating the driver / multiplexer

TODO - describe creating VHDL test bench
     - describe running the test
     - describe looking at the ISim test output


The simulator is set up as:

```vhdl
signal A : std_logic_vector(7 downto 0) := "11111111";
signal B : std_logic_vector(7 downto 0) := "00000000";
signal C : std_logic_vector(7 downto 0) := "10101010";   
```

and we'd expect this to happen on the clock cycles:

| output |tick | tick | tick | tick | tick | tick |
| -- | -- | -- | -- | -- | -- | -- | -- |
| SSeg   | 11111111 | 00000000 | 10101010   | 11111111 | 00000000 | 10101010   | 
| Enable | 011      | 101      | 110        |  011      | 101      | 110        |

And we can see the same happening in the ISim simulator:

![simulator output](/assets/hardware-adventures-3-sseg-isim.png)

TODO Testing the driver on the hardware

## TODO Adding the numbers

## TODO Conclusion