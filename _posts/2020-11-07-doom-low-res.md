Low res doom

I wanted to run doom on my 128x64 LCD screen.

Working through an intermediate resolution of 160x100 as it's quarter the original 320x200 size.

At first I tried to change the internal resolution of the renderer - there was a #define
for SCREEN_WIDTH and SCREEN_HEIGHT.

```c
i_video.h
#define SCREENWIDTH  320
#define SCREENHEIGHT 200
```

Obviously this didn't work, as the menus etc contain sprites that 
get rendered at a specific location (e.g. 200, 130). I thought about 
scaling all coordinates by 2, but that would be too large of a change.

At a loss of some fidelity I could probably be more successful by rendering it internally as 320x200,
then scaling at the output stage (SDL).

## Resizing

The screen size lives in `window_height` and `window_width` variables in `i_video.c`.

int window_width = SCREENWIDTH * 2;
int window_height = SCREENHEIGHT_4_3 * 2;

Also i_video.c for the scale factor:

static void SetScaleFactor(int factor)
{
    // Pick 320x200 or 320x240, depending on aspect ratio correct
    if(factor == 0){
        window_width = 160;
        window_height = 120;
        fullscreen = false;
    }
    else{
        window_width = factor * SCREENWIDTH;
        window_height = factor * actualheight;
        fullscreen = false;
    }
}

Let's just force this to 160x120 and see where it leads next.

The rendering gets set in `SetVideoMode` in `i_video.c`

The height was overriden in `AdjustWindowSize`, where it was set to at least SCREENWIDTH.

Then this last bit of code:
```

    if (aspect_ratio_correct)
    {
        actualheight = SCREENHEIGHT_4_3;
    }
    else
    {
        actualheight = SCREENHEIGHT;
    }
```
I had to comment out as it was also forcing screen height to mininum 200.

Drawing less colors:

ChocolateDoom seems to render to a 8-bit palette.

There's a function 

```c
// Given an RGB value, find the closest matching palette index.
int I_GetPaletteIndex(int r, int g, int b)
```

That we could change in order to render in black and white.

SDL dithering:
https://gist.github.com/catastropher/bd8182d0547e7f5e8184

Dithering patterns:
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

See https://en.wikipedia.org/wiki/Ordered_dithering

Then I remembered there were tables for gamma correction (can be toggled with F11 in Chocolate Doom).

This is how it looks with maximum gamma:
TODO image/gif

How to run in the resolution I want:
chocolate-doom -iwad ../DOOM1.WAD -width 128 -height 64

## Getting display ready

TTGO T-Watch is a nice ESP32 based programmable watch with a 240x240 LCD screen t

To make data transfer a bit less intensive I decided to transmit in 120x120 resolution and then double the pixels to 240x240 on the device.

I programmed my watch to be a simple single-core serial display.
It reads one row of pixels from the serial port as 120 bits that represent black or white pixels, then expands each bit onto a 16-bit array value. 

#### Transfer rate
When transmitting 120x120 pixels at around 16 FPS we produce around 15 * 9 (data + stop bit) * 120 (rows) * 16 (fps) = 259 kbits of data per second.

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

### Vertical Synchronization

If we just dump the data to the screen without some kind of synchronization or alignment, the device wouldn't know where the boundary between the frame data lies. 

It also means we would need to be lucky to start the transmission in sync with the watch displaying the first row of the frame data.

To fix this, I added a simple VSYNC message that the watch sends to the PC over the serial port when it starts drawing the first row. Upon receiving VSYNC, the PC should start abandon the current frame and start sending another frame from the beginning.