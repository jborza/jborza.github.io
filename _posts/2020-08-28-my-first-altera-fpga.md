---
layout: post
title:  "My First Altera FPGA"
date:   2020-08-29 20:00:00 +0200
categories: hardware
tags: [vhdl, calculator]
# TODO image: /assets/altera-cyclone-...
published: false
---

Today I got an Altera Cyclone IV board from a local seller. It's marked as A-C4E6E10, and features:
- Altera Cyclone IV EP4CE6E22 FPGA chip with 6272 logic elements, 270 Kbits of memory
- 8-digit seven-segment LCD display
- 8 position DIP switch
- VGA output
- PS/2 input port
- buzzer
- a couple of push buttons
- a handful of IO pins, some of which can be used as a connector for a 1602/12864 display and 22 miscellaneous pins

It also came packaged with a programming thingy called USB Blaster that looks very shabby.

The PS/2 port comes in handy as I wanted to try out keyboard processing on FPGA. I'd also like to buy a 12864 display (the name comes from its resolution of 128x64 pixels) as it looks like a neat attachment, as I have misplaced my 1602 display I got a couple of years earlier. 

## Software installation

I have registered on Intel download center and downloaded and installed [Quartus 20.1 Prime Lite](https://fpgasoftware.intel.com/20.1/?edition=lite&platform=windows) along with ModelSim and Cyclone IV device support.

I've also downloaded a support package specific to this board from an [AliExpress seller's page](https://www.aliexpress.com/item/32813736111.html) that's selling the same device. It's also a good idea to archive such pages and the software packages as they'll likely disappear forever eventually. The documentation consists mostly of huge Word documents with photos, it doesn't look very professional, but it's better than nothing.

The package from seller also contains several sample `.sof` files, which is a binary format used by the board programmer. I wanted to load them on the device, one needs to use Quartus Prime Programmer to do that, with the USB blaster connected between the computer and the board. The board obviously needs to be powered on by a separate micro USB cable.

## Driver installation

After installing the drivers the blaster shows up as "Altera USB-Blaster" on my computer. That's nice, but the Quartus Programmer doesn't see the USB blaster in the devices list. I wasn't able to get this working on Windows 10 at all, so I tried installing the same under Linux (Ubuntu 20) and there the USB Blaster installed almost on its own. The programmer was still complaining about a broken JTAG chain, which can be confirmed by a command line tool `jtagconfig -d` - found in the Quartus `bin` directory. Following advice online, I had to link a different version of the `libudev` library with `ln -s /lib64/libudev.so.1 to /lib64/libudev.so.0`

After that I was able to upload the testing `.sof` files to the board and was greeted by blinking lights - so yes, it works. As opposed to my [Elbert V2 Xilinx dev board]({% post_url 2020-08-02-hardware-adventures-2-fpga %}), uploading the configuration to the FPGA chip and the on-board flash chip are two distinct operations, so I'm yet to find a way on how to make my changes persist through the Altera board being powered off. 

> The FPGA boards usually contain a flash chip to store the configuration for the chip that loads from this flash memory on powerup. During development, one can reconfigure the FPGA chip through the JTAG interface, bypassing a need to rewrite the flash memory and power cycle the board.

## Blinking some LEDs on my own

