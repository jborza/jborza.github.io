---
layout: post
title:  "DOOM on a watch"
date:   2020-11-15 20:00:00 +0200
categories: games
tags: [esp32, arduino, c, doom]
image: /assets/????
published: false
---

# Does it run DOOM? 

I was trying to find a good use case for my [LILIGO TTGO T-Watch](https://www.banggood.com/LILYGO-TTGO-T-Watch-2020-ESP32-Main-Chip-1_54-Inch-Touch-Display-Programmable-Wearable-Environmental-Interaction-Watch-p-1671427.html). It's a programmable smart watch featuring the amazing ESP32 chip and a 240x240 color LCD screen. 

I keep hearing about Doom running on this and that, sometimes directly and sometimes using the device as an exotic external screen. My project falls into the latter category, but it was a lot of fun to implement!

TODO GIF of the final version

As this was mostly a learning experience, I took several wrong turns and mention them in this writeup.

## Building steps

### Getting the video signal across

There are a couple of ways to transmit data from a computer to the ESP32-based watch. Wi-Fi, Bluetooth and a serial port. 

Serial port seemed promising - I initially targeted 120x120 picture, which can be represented by 14400 bits or 1800 bytes. Targeting 115200 bauds I could achieve around 7 fps (115200 / 16200 bauds per frame).

> The default serial configuration is 8 data bits, no parity and one stop bit, hence 9 bauds per byte.

With the goal was of displaying DOOM on the smart watch in mind, I thought. I decided to divide this into three phases:
- Scale the image down to the resolution of the watch
- Implement a proof of concept serial display on the T-Watch
- Optimize until it works better

## Scaling Doom

I started with finding a suitable Doom source port. I discovered  [Chocolate Doom](https://www.chocolate-doom.org), which accurately reproduces the game as it was played in the 1990s. 

Building it on Ubuntu is straightforward, so I dived straight into the code and started poking around.

### Wrong turn #1 - modifying Doom internal resolution

The first thing I did was try to find how a resolution gets set.

At first I tried to change the internal resolution of the renderer - there was a `#define`
for `SCREEN_WIDTH 320` and `SCREEN_HEIGHT 200` in `i_video.h`.

Changing this to 120x75 made the game crash. I attached a debugger to see where exactly and the game was attempting to render some things at locations beyond 120x75. Scaling all coordinates by 0.5x helped get the menu to display, but it crashed again as soon as I started the game.

### Scaling and dithering

After studying the Chocolate Doom source port some more I realized it has a series of buffers and textures that represent stages of the rendering pipeline. 



i_video.c
TODO

### Wrong turn #2

I realized looking at the screenshots from various buffers that I've been dithering the wrong display buffer (the 320x200 display buffer), then downscaled in SDL to 240x150, which caused artifacts and didn't look as good.

The correct way was to scale the display buffer to 240x150, then dither, then send this over the wire. 

## Dithering

After a little research on 1-bit graphics I realized there are two commonly used dithering algorithms - I implemented both:

### Ordered dithering

[Ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering) is a simple algorithm that produces a characteristic crosshatch pattern. 

It works by applying a threshold map to the pixels displayed, causing pixels from the map to change color based on the distance from the original color to black and white.

![ordered dithering](/assets/doom-ordered-4x4-matrix.png)

_Ordered dithering patterns_

### Floyd-Steinberg dithering

[Floyd-Steinberg dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering) operates using error diffusion and is characterized by its grainy or speckled appearance.

Because Floyd-Steinberg works by pushing the quantization error from a pixel to its neighboring pixels, a slight change in the scene can propagate over the entire screen. I found that aesthetically less pleasing than the more predictable ordered dithering, as it was simply less jumpy.

![doom dithered](/assets/doom-dither-240x150.png)

_Floyd-Steinberg dithering above, ordered dithering below_

### Grayscale and gamma

In both dithering algorithms we convert the color to grayscale with the following algorithm:

```c
//get r,g,b color values
uint8_t r, g, b;
uint32_t pix = getpixel(s, x, y);
SDL_GetRGB(pix, s->format, &r, &g, &b);
      
// Convert the pixel value to grayscale / intensity
grayscale = .299f * r + .587f * g + .114f * b;
```

Doom is quite dark, so it's hard to see anything in the default _gamma_ setting. Fortunately the engine also features gamma correction, that can be toggled with the `F11` key in game.

![gamma](/assets/doom-gamma.png)

_Gamma settings 1, 3, 5 going from unusable in monochrome to pretty bright_


## Watch as an external display

To make data transfer a bit less intensive I decided to transmit in 120x120 resolution and then double the pixels to 240x240 on the device.

Initially I programmed my watch to be a simple single-core serial display.
It reads one row of pixels from the serial port as 120 bits that represent black or white pixels, then expands each bit onto a 16-bit array value. 

#### Transfer rate
When transmitting 120x120 pixels at around 16 FPS we produce around 15 * 9 (data + stop bit) * 120 (rows) * 16 (fps) = 259 kbits of data per second.

The algorihm for 
```c
char rxBuffer[RECEIVE_LINE_BYTES];
uint32_t lineBuffer[DISPLAY_LINE_LENGTH];
...
Serial.readBytes(rxBuffer, RECEIVE_LINE_BYTES);
tft->setAddrWindow(0, y, DISPLAY_LINE_LENGTH, 2);
convertPixelsBetweenBuffers();
tft->startWrite();
tft->pushPixels(lineBuffer, DISPLAY_LINE_LENGTH);
tft->pushPixels(lineBuffer, DISPLAY_LINE_LENGTH);
tft->endWrite();
```

The pixel conversion does the horizontal pixel doubling and prepares it to the  converts input (a 120 bits field) to the display line (240 16-bit pixels, stored in a 120 32-bit array). It iterates bit by bit .
We can display data on the TTGO T-Watch using the [TFT_eSPI library](https://github.com/Bodmer/TFT_eSPI). It includes a `pushPixels` function that expects a buffer of 16-bit pixel colors.

I wrote a [supporting tool](https://github.com/jborza/watch-doom-receiver/blob/master/util/sender.py) to feed the watch some pixels in Python. The bits are sent using the `pyserial` library in a loop. 

## Connecting the Watch and Doom

Python is not very helpful in the Chocolate Doom port, so I had to write the serial frame transmitter in C. 
I've adapted the [first code snippet I found](https://stackoverflow.com/a/38318768/72746) I found on Stack Overflow, credit goes to [sawdust](https://stackoverflow.com/users/1599004/sawdust). 


Still working in the 120x120 pixel resolution, this is how the intermediate result looked:

![first attempt](/assets/doom-120x120-watch.jpg)

> It's incredibly low-res. Also, because I was lazy, the last row of pixels of the status bar is leaking all the way down the screen as I just repeated rows 75 up to 120 in the output stream :-)

I eventually bumped the resolution to 240x150.

There's nothing special about the serial output module, there's a function that takes an `SDL_Surface` assuming its dimensions being 240x150, loops over the RGB values and for every row of 240 pixels (bits) spits out 30 bytes.

```c
uint8_t bit = 7;
for(y = 0; y < SERIAL_BUFFER_HEIGHT; ++y) {
    memset(buf, 0, SERIAL_BUFFER_BYTES);     
    for(x = 0; x < SERIAL_BUFFER_WIDTH; ++x) {
        pix = getpixel(s, x, y);
        if(g == 255)
            buf[x >> 3] |= (1 << bit);

        if(bit-- == 0)
            bit = 7;
    }
```

## Getting it faster

Straightforward increase of the baudrate to 500,000 caused some screen tearing, it seemed that the _serial receiver_ code on the watch was having hard time keeping up. After optimizing the bit conversion loop it could handle stable 500,000 bauds, leading to high enough framerate to consider increasing the resolution to 240x240.

### Wrong turn #3 - going multi-core on the ESP32

I thought I could leverage the second core on the ESP32 and have the watch run two tasks - one that processes the serial data and another that decodes it and sends to the display.

I implemented a proof of concept serial display that uses the [FreeRTOS Task notification API](https://www.freertos.org/RTOS-task-notifications.html) to communicate between the task using notifications.

It used two buffers - one to receive the serial data which got copied to the display task and the notifications were supposed to let the tasks know that they can touch the shared buffer. 

The source lives in the [`multithreaded` branch](https://github.com/jborza/watch-doom-receiver/blob/multithreaded/watch-doom-receiver.ino) - but it didn't really work faster, which lead me to the next attempt:

### Using DMA for the speed

What helped in the end was using Direct Memory Access (DMA) transfer using `  tft->pushPixelsDMA(lineBuffer, DISPLAY_LINE_LENGTH);`. It's basically "fire and forget" data transfer - the controller will move the data from the RAM to the display and practically allow the microcontroller to execute other code as opposed to operating the SPI bus.

Now I could increase the baudrate to 921600 and practically double the framerate. 

#### Vertical Synchronization?

If we just dump the data to the screen without some kind of synchronization or alignment, the device wouldn't know where the boundary between the frame data lies. 

It also means we would need to be lucky to start the transmission in sync with the watch displaying the first row of the frame data.

To fix this, I added a simple VSYNC message that the watch sends to the PC over the serial port when it starts drawing the first row. Upon receiving VSYNC, the PC should start abandon the current frame and start sending another frame from the beginning. I've added a handler for this to the python support tools, but decided not to for Doom as it was easier to just reset the line currently being drawn if no data has come for a while across the serial port.

## Finishing touches

A series of color schemes livens up the 1-bit color depth - just black and white is kind of boring. This has a straightforward implementation on the T-Watch side, reacting to the touch of the touchscreen with `digitalRead(...)`

![colors](/assets/doom-colors-320.jpg)

_Various color schemes, pictures taken of the actual T-Watch_

## That's all - here are some gifs in action

TODO gifs

## Potential improvements

#### Frame compression

As an experiment, I've added [`zlib`](https://zlib.net/) compression to the Doom engine to compress the frames. An uncompressed 240x150 frame fits in 4500 bytes, with the fastest zlib compression it usually shrank into 2800 bytes, which is a saving of around 37%. That means that I could trade some the CPU time on the ESP32 (currently spent on receiving data) from the serial port for the decompression, I could potentially increase the frame rate or send some other data along with video.

#### Sound

There's also a possibility of transmitting **sound** data, in theory. Chocolate Doom supports PC speaker output, which operates on playing back tones (see [source](https://github.com/chocolate-doom/chocolate-doom/blob/master/src/i_pcsound.c#L88) or [doom wiki page](https://doomwiki.org/wiki/PC_speaker_sound_effects)). To implement this over serial, one would need to mix the tones in with frame data and implement a player thread that plays back the tones over the i2s interface to the watch speaker.

The simplest way to make this work would probably be something inspired by the [Windows port behavior](https://github.com/chocolate-doom/chocolate-doom/blob/master/pcsound/pcsound_win32.c#L38) that either produces a beep for a specified duration or stays silent.

### Running Doom on the watch directly

There's a port of DOOM by [unlimitedbacon](https://hackaday.io/unlimitedbacon) to the watch: https://github.com/unlimitedbacon/TTGO-DOOM that actually runs on the watch.

### Source and build instructions

https://github.com/jborza/chocolate-doom -> My Chocolate Doom fork with the dithering and serial output. For serial port configuration see [`src/i_serial.h`](https://github.com/jborza/chocolate-doom/blob/master/src/i_serial.h), for video tweaks see the definitions on top of  [`src/i_video.c`](https://github.com/jborza/chocolate-doom/blob/master/src/i_video.c#L53).

[Build instractions](https://www.chocolate-doom.org/wiki/index.php/Building_Chocolate_Doom_on_Debian) for Chocolate Doom on Debian/Ubuntu.

https://github.com/jborza/watch-doom-receiver -> The serial display tool for the watch. Required libraries: ESP32 support, [TTGO T-Watch library](https://github.com/Xinyuan-LilyGO/TTGO_TWatch_Library)

After Doom is built, the watch software is up and running, the PC and the watch is connected with a USB cable, run

`chocolate-doom -iwad doom2.wad -width 960 -height 600`, keep looking at the watch and play!