---
layout: post
title:  "M5Stick digital hourglass"
date:   2020-09-06 13:00:00 +0200
categories: iot
tags: [iot, arduino, m5stick]
image: /assets/m5stick-hourglass-sandy.jpg
published: true
---

I thought it would be cool to have a digital hourglass. The M5Stick-C with its 80x160 pixel LCD screen, battery, buttons and accelerometer has all the equipment I need.

![m5stick hourglass](/assets/m5stick-hourglass.gif)

## The development process

### A JavaScript prototype

Link: https://github.com/jborza/hourglass-js/blob/master/hourglass.js

JavaScript was my first choice for prototyping 2d graphics on canvas - as the Canvas API has straightforward functions for drawing lines and setting colors. The second reason is that debugging the code with the modern browser development tools is much easier as I was just programming exploratively, alternating between writing new code and poking things in the console.

> I discovered a neat `console.table()` function that can format two-dimensional arrays out of the box.

![prototype](/assets/m5stick-hourglass-js-prototype.png)

_The prototype with various helper buttons_

### How does an hourglass seem to work?

Looking at many pictures of hourglasses online, it appears that the as the sand falls through the neck, it builds up a cone in the bottom half. There's also an "inverse" cone of the missing sand growing in the top half of the hourglass - that's the sand that has fallen through the neck and is now missing.

![an hourglass](/assets/m5stick-hourglass-real-hourglass.jpg)

Projecting this into 2D, looking at the hourglass from its front side, the bottom cone looks like a triangle and the upper half will just very slowly drop linearly as the sand falls down through the neck.

### Fake physics dead-end

 Initially I thought I'd fake what happens in the both halves of the hourglass:
-  top half: make the topmost rows of sand disappear
-  bottom half: draw a growing triangle of circle rising up as the time passes

However, this turned out to be messier than I expected and also didn't look good, as other 2D sand simulations make the sand trickle down the sides of the growing slope. Before starting to draw incomplete lines to simulate these partial slopes of sand, I realized that...

### Real physics was easier

>\* As real as a 2d grain simulation gets

Pretending that we live in a 2D world, we can assume that.
Assuming a shape of hourglass regular as follows:

```
 80 px wide
_____
|   |  40 px tall, 80x40=3200px square
 \ /   40 px tall, 40x40=1600px square
 / \   
|___|  
```

There are 4800 grains of sand in the bottom half of the hourglass when it's idle.

Turns out that simulating falling grains of sand is surprisingly easy - there are only four possibilities what can happen for a grid location during an update loop:
- do nothing (if there's no grain)
- fall down (if there's no grain underneath another)
- fall to the left (if there's a grain underneath and a blank space to the lower left)
- fall to the right (if there's a grain underneath and a blank space to the lower right

The algorithm above, in C:

```c
void physicsStep() {
  // note that we skip bottom-most row as nothing can happen there
  for (int y = BOTTOM_HEIGHT - 2; y >= 0; y--) {
    for (int x = 0; x < WIDTH; x++) {
      // if there's no grain, don't do anything
      if (bottomGrains[y][x] == 0) {
        continue;
      }
      // if there's a space under a grain, let it fall
      else if (bottomGrains[y + 1][x] == 0) {
        bottomGrains[y + 1][x] = 1;
        bottomGrains[y][x] = 0;
      }
      // if there IS a grain underneath - check if we can fall to the left
      else if (y < BOTTOM_HEIGHT - 2) {
        if (x > 0 && bottomGrains[y + 1][x - 1] == 0) {
          // swap the grains
          bottomGrains[y + 1][x - 1] = 1;
          bottomGrains[y][x] = 0;
        } // look to the right
        else if (x < WIDTH - 1 && bottomGrains[y + 1][x + 1] == 0) {
          // swap the grains
          bottomGrains[y + 1][x + 1] = 1;
          bottomGrains[y][x] = 0;
        }
      }
    }
  }
}
```


### Porting to M5Stick

The graphics API is sufficient, we only need these three functions:

```c
M5.Lcd.fillScreen(color);
M5.Lcd.drawLine(x1,y1,x2,x2,color);
M5.Lcd.drawPixel(x,y,color);
```

## Drawing the top half

Here we just iterate the rows from the hourglass neck up, drawing as many full rows as possible and leaving a hole in the middle of the last "partial" row:

Here's how it would look like if there are 13 grains remaining:

```
  \##   ##/    4
   \#####/     5
    \###/      3
     \#/       1
```


### Drawing the bottom half - dirty graphics tricks

I wanted to try out optimized drawing - marking points (pixels) in the 2D array of grains as dirty to be redrawn as dirty and only painting those during the update. I decided against using a list and just used a statically allocated array large enough to keep track of these points:

```
typedef struct {
  int8_t x;
  int8_t y;
} Point;

#define DIRTY_POINT_MAX 255
Point dirtyPoints[DIRTY_POINT_MAX];
```

`drawGrainsBottom()` loops over dirty points, paints a pixel if there's a grain at these coordinates or clears if it isn't

## Hourglass configuration

Although physical hourglasses probably lack this, I wanted the hourglass to have a configurable interval - switching between 1, 5, 10 and 15 minutes. This can be easily done in the `loop()` function:

```c
if (M5.BtnB.wasPressed()) {
    nextInterval();
    reset();
    return;
  }
```

## More colors in the output

I was also thinking of using multi-colored grains of sand to make the output less dull. As we can actually move the individual grains of sand during the physics simulation, we can keep track of grain colors in the `bottomGrains` array instead of just 1 (grain) and 0 (nothing).

I created a little palette of sand grain colors (taking inspiration off the [Web colors](https://en.wikipedia.org/wiki/Web_colors) article on Wikipedia). As the M5Stick colors need to be in RGB565 format (4-digit hex), I also used a little [Python script](https://github.com/jborza/m5stick_hourglass/blob/master/color_gen_sand.py) to convert from the traditional RGB888 `#A0522D` format to `0x9A85`.

Then this list of the colors ends up in a simple C array along with a random color picker function.

```c
#define GRAIN_COLOR_LENGTH 21
int grainColors[GRAIN_COLOR_LENGTH] = {0xe654,0xbd0f,0xa388,0xcd51,0xb48d,...};
```

Colors were hand picked from a photograph of sand found online:

![sand](/assets/m5stick-hourglass-sand-photo.jpg)

To use randomized sand grain colors for the top half of the hourglass, we can cheat a bit, as the ESP32 has plenty of RAM and pre-generate grain colors to an array of 80x80 16-bit integers and just refer to a color of the pixel by its coordinates in this array.

Also, we can optimize the drawing by painting the initial state of the hourglass once after its reset and then only painting the lines that changed.

![hourglass with sand](/assets/m5stick-hourglass-sandy.jpg)

I also tried rainbow colors, but it was too chaotic to look at :)



## What did I not do

I wanted the hourglass to "reset" when you turn the M5Stick upside down, using the built-in accelerometer to detect that its orientation changed. It would be cool if the amount of grains of sand in the upper and bottom halves stayed the same, just the direction of gravity would appear to change. This should be easy to do using the [M5Stick-C accelerometer API](https://docs.m5stack.com/#/en/api/imu).

It also would be nice to get rid of the interval text (5:00 etc.) - or just flash briefly and disappear - and just use a different colored sand to indicate the different speed of the flow of sand.

## The code

Arduino project for [m5stick-hourglass](https://github.com/jborza/m5stick_hourglass) 

JavaScript/Canvas prototype - [hourglass-js](https://github.com/jborza/hourglass-js)

I used `ffmpeg` to produce an animated gif from a video, using a series of filters, then `gifsicle` to optimize the size.

```
ffmpeg -i input.mov -vf "transpose=2,crop=in_w-200:in_h-500:100:0,setpts=0.15*PTS, fps=6, scale=-1:320:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 output.gif
```

### Picture attribution

The [Hourglass image](https://commons.wikimedia.org/wiki/File:Wooden_hourglass_3.jpg) by S Sepp: is licensed under CC BY-SA 3.0. 