---
layout: post
title:  "M5Stick hourglass"
date:   2020-09-03 18:00:00 +0200
categories: iot
tags: [iot, arduino, m5stick]
published: false
---

JavaScript prototype

Link: https://github.com/jborza/hourglass-js/blob/master/hourglass.js

JavaScript was my first choice for prototyping 2d graphics on canvas - as the Canvas API has straightforward functions for drawing lines and setting colors. The second reason is that 

### A dead end with fake physics

### Real physics was easier

>\* As real as a 2d grain simulation gets

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



### Dirty graphics tricks

I wanted to try out optimized drawing - marking pixels to be redrawn as dirty and only painting those.

## Configuration

I wanted the hourglass to have a configurable interval - switching between 1, 5, 10 and 15 minutes. This can be easily done in the `loop()` function:

```c
if (M5.BtnB.wasPressed()) {
    nextInterval();
    reset();
    return;
  }
```