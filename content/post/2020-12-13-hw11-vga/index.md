---
layout: post
title:  "FPGA VGA serial display"
date:   2020-12-13 19:00:00 +0200
categories: hardware
tags: [verilog, serial, vga, hardware, fpga]
image: 20201213-vga-test-pattern.jpg
published: true
---

# VGA on an FPGA

In the previous articles I've mainly interfaced with LCD displays. I thought it would be nice a produce a VGA output from my FPGA board. I've already had a working framebuffer-based display controller that can be written to through a serial port, so this was a matter of developing a bitmapped VGA controller.

### Target resolution - 320x240 over 640x480

Why 320x240? Because my development board only 276.5 kbits of memory. To fit a 1-bit 640x480 framebuffer I would need 307.2 kbits.

However, 320x240 is not a standard VGA resolution, but can be easily achieved using a 640x480 resolution and doubling each pixel.

## VGA controller

There are two main modules to the VGA output - the timing and sychronization signal generator and a pixel generator, connected to the framebuffer.

![diagram](20201213-vga-diagram.png)

`hvsync_generator` generates timing and synchronization signals
- `hsync` and `vsync` are sent to the monitor, decoded from internal counters
- `pixel_x` and `pixel_y` specify the location of the current pixel
- `video_on` genrated to enable or disable the display (e.g. in display area)

### Horizontal and vertical synchronization

The timings are much better described elsewhere, for example [here](https://projectf.io/posts/video-timings-vga-720p-1080p/), [here](http://martin.hinner.info/vga/vga.html) and on [stackexchange](https://electronics.stackexchange.com/questions/201011/what-is-front-porch-and-back-porch-of-a-video-signal-in-crt-display).

Very briefly, in addition to the active 640x480 drawing area, there are also borders / porches that relate to the analog (CRT) monitor internals - electron beams, sawtooth generators and such that needed to be driven by these and the hsync and vsync signals.

This makes up to an effective resolution of 800x525, adding the display area, all porches and the sync rows/columns.

![timing diagram](20201213-vga-timing-diagram.png)

### The pixel clock

As the entire area contains 800 "pixels"/line * 525 lines/frame. To achieve 60 frames per second as per the specification, we arrive at 

`800 pixels/line * 525 lines/frame * 60 frames/second = 25.175 MHz`.

I was lazy again and divided the internal 50 MHz clock by two to get 25 MHz clock, which is off by 0.7%. Technically this is deviating from the standard, as it allows 0.5% difference, but all of my monitors handled the signal fine.

### Framebuffer / Memory layout

I initially started with a simplistic 320*240=76800-bit memory, indexed from 0 to 76799

```verilog
localparam RESOLUTION_X = 320;
localparam RESOLUTION_Y = 240;

reg mem [0:RESOLUTION_X*RESOLUTION_Y-1];
```

This lead to a simplistic pixel generator that just reduced the 640x480 resolution to 320x240 by dividing each coordinate by two:

```verilog
module pixel_generator (input clk, input [9:0] pixel_x, input [9:0] pixel_y, output [2:0] rgb);

wire [16:0] current_address = (pixel_y[9:1] * MAX_X) + pixel_x[9:1];

always @(posedge clk) begin
    ...
    address_out <= current_address;
    rgb <= {data_in, data_in, data_in};
```

### 1-bit vs 8-bit framebuffer

Although this makes it very practical to read a particular display value in a single clock, but impractical to interact with in terms of interfaces - the current serial interface that sends bytes over UART or a future 8-bit soft-CPU, dealing with bytes is nicer than dealing with bits.

To move from this convenient 1-bit interface to 8-bit interface I had to redefine the memory to: 

```verilog
reg [7:0] mem[0:(320*240/8-1)];
```

To cover 320x240 bits we split the framebuffer memory into 9600 words of 8-bits. That also means that one word will cover 8 contiguous pixels.

### Divide and conquer

In the spirit of dividing responsibilities into modules I implemented a `m640_to_320` module that produces the `byte` and `bit` part of the framebuffer. We can extract the `bit` part easily as it's just the remainder of (`x` / 2) and 8, then inverted as we store pixel bits in "little endian" ordering. 

```verilog
module m640_to_320 (
	input wire [9:0] pixel_x, //0 to 640
	input wire [9:0] pixel_y, //0 to 480	
	output wire [13:0] address_byte,
	output wire [2:0] address_bit
);
//row_bytes := 320 / 8
//address_byte := pixel_y / 2 * row_bytes
assign address_byte = pixel_y[9:1] * 40 + pixel_x[9:4];
//address_bit := 	~(pixel_x / 2)
assign address_bit = ~pixel_x[3:1];

endmodule
```

The pixel generator then obtains the `address_byte` and `address_bit` from this module. 
As using the block RAM introduces a single clock delay we need to store the value of `address_bit` into a register to be available on the next clock cycle when the memory value actually arrives.

so on every clock cycle the pixel generator module:
-  fetches the correct byte from memory 
-  draws the correct color from currently retrieved byte with the **previous value** of `address_bit`

> Note: I spent some time chasing down a bug where some 8-th pixel had incorrect colors as I didn't immediately realize that I needed the 1-clock delay.
> 
> ![bug](20201213-vga-bug.jpg)

After fixing that, the display worked well - here's a sample of a how a text mode would look like: (the bitmap that was sent to the FPGA was generated on my computer with 8x8 font).

![pic](20201213-vga-text.jpg)
_Sending some text over the serial interface_

## Serial interface

It's unchanged from my previous [LCD serial display post]({{<ref "2020-11-24-hw10-serial-display" >}}) - just the framebuffer is now larger. 

### Sending 1-bit PNG

I have a small [Python script](https://github.com/jborza/vga_serial_display/blob/master/magic_bin_maker_8bit.py) that reads a 320x240@1-bit PNG picture, converts the pixel values into bits that one can redirect into the serial port from command line.

### Screen-to-serial capture

To have a bit more fun with the display, I wrote a little utility in C# that captures the screen, performs dithering and sends the bits over the serial port.

> This is all possible using the standard APIs - we can capture the screen with the `Graphics.FromScreen`, then resize the picture into 320x240, do the dithering by fiddling with the Bitmap's pixels, then write to `System.IO.Ports.SerialPort`.

Although modern computers are fast, there's a limit to what we can achieve with naive codea approach. As this was single-core heavy, reducing the desktop resolution to 800x600 helped increase the performance of the bitmap scaling part. Using 3 MBaud bitrate allowed me to transmit around 15 frames per second to the FPGA board.

**I think this qualifies as a crude external video card :)**

### A test pattern

I hooked the board to a smallish 7" LCD screen with HDMI, composite video an VGA.

![image](20201213-vga-test-pattern.jpg)

_[BBC Test card E](https://en.wikipedia.org/wiki/List_of_BBC_test_cards) on the display_

### Code

Code available on GitHub: [https://github.com/jborza/vga_serial_display](https://github.com/jborza/vga_serial_display)