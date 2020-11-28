---
layout: post
title:  "Adventures in hardware, part 10 - FPGA serial display"
date:   2020-11-28 13:00:00 +0200
categories: hardware
tags: [verilog, serial, doom, lcd]
image: /assets/hw10-doom-fpga-screen-640.jpg 
published: true
---

## Doom on a screen, again

Recently I've been playing with displaying DOOM on various devices (a smart watch and a smallish IoT stick), and previously I also played with a [128x64px LCD screen]({% post_url 2020-10-16-hardware-adventures-6-12864 %}) connected to my FPGA board. 

After an afternoon of tinkering I got DOOM to display on my LCD screen, see the result for yourself:

{% video /assets/hw10-doom-fpga-dithered.mp4 controls 386px 320px preload:auto %}

## Modding DOOM 

I already had a DOOM port with serial output handy from the [previous article]({% post_url 2020-11-20-doom-on-a-watch %}).
The only required changes were adjusting the output framebuffer size to `1024 (128 * 64 bits)` bits and experimenting with the baud rate until the frame rate was high enough. 



## The FPGA serial receiver

This time I didn't roll my own, but I used an implementation from [an article by sudonull](https://sudonull.com/post/90602-Implementation-of-a-stable-UART-with-a-speed-of-921600-baud-and-more-in-Verilog-language-under-FPGA). It works fine with baudrates up to 3 MBaud, which seems to be the maximum supported data rate for the CH340G USB-to-serial chip on my board.

The UART receiver emits a signal `rxReady` when a byte (`rxData`) is ready to be consumed, which needs to be cleared with `rxReset`. I added a simple state machine around this reset mechanism.

Then I extended the memory-mapped LCD controller I already prepared previously (for a text-mode) to have a larger buffer and use the graphic mode commands. The final thing remaining was to wire the UART receiver's signals and continuously write to the dualported RAM, which gets read by my controller and fed to the display's ST7920 chip.

I wanted 

![diagram](/assets/hw10-diagram.png)

### Baud rate and display timing

I got an acceptable result when using 1 MBaud transmit rate. This should allow for around 100 frames per second (of 128*64 bits framebuffer).
 
If my math is correct, the code is producing using 41 µs display operation time (`50,000,000 MHz clock rate / 2048 divider per tick = 24,414 Hz ~= 41 µs`). Because an entire row requires 18 operations (_set vertical address, set horizontal address, 16 times: write 16 pixels_), and we display 64 rows per frame, a frame should take 64\*18\*41 µs =~ 47 ms, yielding around 21 fps

### Notes and limitations

- There's no vertical synchronization, so I just restarted the board whenever I wanted to start a new stream. 

- I know that this setup is impractical in the real world, as I could get easier code and better performance talking to the ST7920 display controller directly, but I wanted to do it via the framebuffer as an abstraction layer, as I would like to swap the tiny LCD screen for a VGA display next.

#### Serial port setup on Windows

To set up the baud rate of the serial port on Windows for redirection, use

```
mode COM4: BAUD=115200 PARITY=N DATA=8 STOP=1
```

(use `mode` without arguments to find out the serial port the device is connected to)

#### Serial port setup on Linux

I had to enable the usbserial module with `sudo modprobe usbserial` (worked out of the box on my other computers)

To set up port speed:

`stty -F /dev/ttyUSB0 115200`

### What's next?

I'm finally looking forward to implementing a VGA controller (with a RAM-based framebuffer), so ideally I could get this running on a larger display :)

![doom](/assets/hw10-doom-fpga-screen-640.jpg)
