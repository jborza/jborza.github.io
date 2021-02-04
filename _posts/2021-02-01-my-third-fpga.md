---
layout: post
title:  "FPGA board for 10 €"
date:   2021-01-31 21:00:00 +0200
categories: hardware
tags: [fpga, sipeed, tang]
image: #TODO
published: false
---
## Sipeed Tang Nano

I like FPGA development boards and I'm excited that there are products that exist outside of the Xilinx / Intel duopoly. The Chinese semiconductor industry is 

It would be great if they supported open-source toolchain such as [Symbiflow](https://symbiflow.readthedocs.io/en/latest/toolchain-desc.html).

TODO link https://tangnano.sipeed.com/en/



The onboard chip is **GW1N-LV1QN48C6/I5**, equipped with 1152 LUT4 logic resources, 1 PLL and 4 Block RAM (72 kbit total). There's also 64 Mbit PSRAM, which I'm not really sure how to use.

The development board also features a 40-pin connector [800x480 LCD display](https://www.seeedstudio.com/5-Inch-Display-for-Sipeed-Tang-Nanno-p-4301.html), the display itself is available separately for around $25 including shipping. 

1152 LUTs is about the same capacity as the smallest Xilinx / Intel chips, but it should be sufficient for small projects.

Also: https://xess.com/tang_nano_user/docs/_site/getting_started/

TODO price
TODO tutorial

http://tangnano.sipeed.com/en/examples/1_led.html

TODO pinout 
https://tangnano.sipeed.com/assets/tang_nano_pinout_v1.0.0_w5676_h4000_large.png
+ attribution!

Also: https://xess.com/tang_nano_user/docs/_site/nano_pinout/

TODO screenshot of GOWIN

The first project I built was the traditional 'blinky' - blinking the built-in RGB LED. I tried to follow the [official tutorial](http://tangnano.sipeed.com/en/examples/1_led.html), but its quality was fairly low. I found [a community guide](https://xess.com/tang_nano_user/docs/_site/testing_it_out/) more useful.

I highly recommend [Nano board pinout](https://xess.com/tang_nano_user/docs/_site/nano_pinout/) spreadsheet on [xess.com](https://xess.com/tang_nano_user/docs/_site/index.html) as it breaks down the pins nicely.

TODO gif of blinky

IP cores available in the tool - test i2c slave?

There are also several IP cores available 

The tool supports both Verilog and VHDL.

### A slightly more advanced project

I built a metronome by wiring a buzzer to the board. You can control the tempo with two built-in pushbuttons

TODO picture or video

> I'm still wondering what's a really good FPGA project for beginners.

### Pros and cons

+ super fast synthesis for simple projects
+ HTML reports
+ USB-3 connector
- weird license acquisition process 
- modest hardware resources
- no hardware multipliers
- documentation compared to big vendors
- almost nonexistent support