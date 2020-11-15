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

## Dithering



There are two dithering algorithms I considered and implemented both:

### Ordered dithering

[Ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering) is a simple algorithm that produces a characteristic crosshatch pattern. It works by applying a threshold map to the pixels displayed, causing pixels from the map to change color based on the distance from the original color to black and white.

![ordered dithering](/assets/doom-ordered-4x4-matrix.png)

TODO image of 320x200 by Ordered

Dithering patterns:
TODO image - Ordered_4x4_Bayer_matrix_dithering.png 


### Floyd-Steinberg dithering

[Floyd-Steinberg dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering) operates using error diffusion and is characterized by its grainy or speckled appearance.

TODO image of 320x200 by FS

I like the lower-tech ordered dithering more, as it's less jumpy on the screen.

### Wrong turn #2

I realized looking at the screenshots from various buffers that I've been dithering the wrong display buffer (the 320x200 display buffer), then downscaled in SDL to 240x150.

The correct way was to scale the display buffer to 240x150, then dither, then send this over the wire. 

!TODO attach screenshots of the process (make in DOOM engine)




At a loss of some fidelity I could probably be more successful by rendering it internally as 320x200, then scaling at the output stage (SDL).


```c
// Given an RGB value, find the closest matching palette index.
int I_GetPaletteIndex(int r, int g, int b)
```

That we could change in order to render in black and white.

SDL dithering:
https://gist.github.com/catastropher/bd8182d0547e7f5e8184


https://upload.wikimedia.org/wikipedia/commons/e/e5/Ordered_4x4_Bayer_matrix_dithering.png


For best results, we could do Floyd-Steinberg or Bayer dithering. 
Or random: each pixel randomly chooses the nearest lighter or darker color similar to the original pixel color.

First I reduced the palette to 16 colors (see i_video.c commit)

Then I'd like to apply some kind of dithering.

// The screen buffer; this is modified to draw things to the screen
pixel_t *I_VideoBuffer = NULL;

There is some rendering near the end of I_FinishUpdate:

    SDL_SetRenderTarget(renderer, texture_upscaled);
    SDL_RenderCopy(renderer, texture, NULL, NULL);

I could render to another texture and apply dithering to it.

Another way would be to recreate the way screenshots are made.

    WritePNGfile(lbmname, I_VideoBuffer,
                 SCREENWIDTH, SCREENHEIGHT,
                 W_CacheLumpName (DEH_String("PLAYPAL"), PU_CACHE));

there we can access the palette: know exactly a byte looks like:

```c
for (i = 0; i < 256; i++)
    {
        pcolor[i].red   = *(palette + 3 * i);
        pcolor[i].green = *(palette + 3 * i + 1);
        pcolor[i].blue  = *(palette + 3 * i + 2);
    }
```
and use the data from 8-bit I_VideoBuffer to target the dithering algorithm.


Then I remembered there were tables for gamma correction (can be toggled with F11 in Chocolate Doom).

This is how it looks with maximum gamma:
TODO image/gif

How to run in the resolution I want:
chocolate-doom -iwad ../DOOM1.WAD -width 128 -height 64


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

## Getting it faster

### Wrong turn #3 - going multi-core on the ESP32

I thought I could leverage the second core on the ESP32 and have the watch run two tasks - one that processes the serial data and another that decodes it and sends to the display.

I implemented a proof of concept serial display that uses the [FreeRTOS Task notification API](https://www.freertos.org/RTOS-task-notifications.html) to communicate between the task using notifications.

It used two buffers - one to receive the serial data which got copied to the display task and the notifications were supposed to let the tasks know that they can touch the shared buffer. 

The source lives in the [`multithreaded` branch](https://github.com/jborza/watch-doom-receiver/blob/multithreaded/watch-doom-receiver.ino) - but it didn't really work faster, which lead me to the next attempt:

### Using DMA for the speed

What helped in the end was using Direct Memory Access (DMA) transfer using `  tft->pushPixelsDMA(lineBuffer, DISPLAY_LINE_LENGTH);`. It's basically "fire and forget" data transfer - the controller will move the data from the RAM to the display and practically allow the microcontroller to execute other code as opposed to operating the SPI bus.

Now I could increase the baudrate to 921600 and practically double the framerate. 

#### Vertical Synchronization

If we just dump the data to the screen without some kind of synchronization or alignment, the device wouldn't know where the boundary between the frame data lies. 

It also means we would need to be lucky to start the transmission in sync with the watch displaying the first row of the frame data.

To fix this, I added a simple VSYNC message that the watch sends to the PC over the serial port when it starts drawing the first row. Upon receiving VSYNC, the PC should start abandon the current frame and start sending another frame from the beginning.

## Serial port


## Dual-core part 2

https://www.freertos.org/xTaskNotifyGive.html

ulTaskN



### Potential improvements

I've added [`zlib`](https://zlib.net/) compression to the Doom engine to compress the frames. An uncompressed 240x150 frame fits in 4500 bytes, with the fastest zlib compression it usually shrank into 2800 bytes, which is a saving of around 37%. That means that I could trade some the CPU time on the ESP32 (currently spent on receiving data) from the serial port for the decompression, I could potentially increase the frame rate.

#### Sound

There's also a possibility of transmitting **sound** data, in theory. Chocolate Doom supports PC speaker output, which operates on playing back tones (see [source](https://github.com/chocolate-doom/chocolate-doom/blob/master/src/i_pcsound.c#L88) or [doom wiki page](https://doomwiki.org/wiki/PC_speaker_sound_effects)). To implement this over serial, one would need to mix the tones in with frame data and implement a player thread that plays back the tones over the i2s interface to the watch speaker.


### Running Doom on the watch directly

There's a port of DOOM by [unlimitedbacon](https://hackaday.io/unlimitedbacon) to the watch: https://github.com/unlimitedbacon/TTGO-DOOM that actually runs on the watch.

### Source

https://github.com/jborza/chocolate-doom -> My Chocolate Doom fork with the dithering and serial output. For serial port configuration see [`src/i_serial.h`](https://github.com/jborza/chocolate-doom/blob/master/src/i_serial.h.)

https://github.com/jborza/watch-doom-receiver -> The serial display tool for the watch.
