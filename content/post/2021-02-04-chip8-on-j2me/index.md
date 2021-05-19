---
layout: post
title:  "CHIP-8 on Nokia 3410"
date:   2021-02-04 20:00:00 +0200
categories: emulation
tags: [chip8, games, java, mobile]
image: /assets/2021-02-05-3410-crop.png
published: true
---

### Mobile development like it's 2002

I thought it'd be fun to develop something for a mobile phone. Thus I did a quick port of my previous CHIP-8 emulator from C to Java. Nokia 3410 looked like a fun target, having a screen resolution of 96x65 pixels and also, back then phones had lots of physical buttons.

![](/assets/2021-02-05-3410-crop.png)

The initial version just rendered CHIP-8 at its 64x32 resolution, but to utilize the screen a bit more efficiently, I implemented 1.5x scaling so the CHIP-8 screen stretches across 96x48 pixels. Keys 0-9 correspond to the hardware numeric keys, * and # map to A and B, respectively. 

> Unfortunately, the C, D, E, F keys are unconnected in this CHIP-8 version.

### Development

To my surprise, I could use modern tools for development, as recent IDEA still supports targeting Java 1.4, also the MIDP 1.0 and CLDC 1.0 J2ME profiles using classes provided with the Nokia 3410 SDK. The API is quite simple, no real magic, just a Canvas, input events, Thread for background processing and simple IO to load the ROMs from the application JAR.

![](/assets/2021-02-05-idea.png)

It's a bit of a fun adventure writing Java from 20 years ago, as there were no collections, no floating point support on the target KVM, not even String.format to print out hexadecimals, so I had to roll my own byte-to-hex function. I got bit by Java _byte and short being signed_, so I had to use char and a lot of typecasts (porting uint8_t and uint16_t from C). The code is in no way idiomatic Java, but it works.

This was a great opportunity to dust off my old copy of [J2ME in a Nutshell](https://www.oreilly.com/library/view/j2me-in-a/059600253X/) after more than 10 years of programming for other platforms. It brings back fond memories of hacking together simple mobile apps from the simple days.

### Testing

Most of the time I was using the official WTK 2.1 emulator that prints System.out output to console for some debugging by printing. I didn't connect a remote debugger this time as I managed to squash all of the bugs with crude methods.

![](/assets/2021-02-05-wtk-2.png)

_The WTK - J2ME Wireless Toolkit_

### Build

The build process is actually quite script-friendly - I started off with a sample build script from the WTK demos and ended up with a one-stop shop script that compiles the .java files into the .class files, then packages them with jar, stuffs in manifest and updates the .jad descriptor file.

### Deployment

Although I have an actual Nokia 3410 at home, I can't upload the JAR file to it, so I tested against 3410 emulator only. It does work with a nice 5x scaling on my E61.

![](/assets/2021-02-05-e61.jpg)

_emuchip8me running on Nokia E61 on the top of my copy of J2ME in a Nutshell_

## GIFs in action

I tried to capture several fun CHIP-8 ROMs in motion (in various crop sized):
![](/assets/2021-02-05-brix-3410.gif) 


![](/assets/2021-02-05-invaders-3410.gif) ![](/assets/2021-02-05-lunar-3410.gif) ![](/assets/2021-02-05-worm-3410.gif)

Link to GitHub: [https://github.com/jborza/emuchip8me](https://github.com/jborza/emuchip8me)
