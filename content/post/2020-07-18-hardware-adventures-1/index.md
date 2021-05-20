---
layout: post
title:  "Lower level adventures, part 1"
date:   2020-07-18 21:00:00 +0200
categories: hardware
tags: [hardware]
image: deeds-nand2tetris.png
published: true
---

# Adventures in hardware, part one

## Closer to the machine

I started my way with programming with Microsoft QBASIC on DOS, I did try (and succeed) to copy code for a game from a BASIC book, and it did run, but I didn't really "get" development back then. I didn't really understand how and why it works, and most importantly, how to write my own code to implement a different game.

Later I was playing higher level languages such as Pascal and C in the high school and PHP at home. I also did manage to write a lot of programs that did various things, displayed pixels on screen, interacted with files, user input or responded network requests. Later at work I was again dealing with high level languages such C#, Java, JavaScript and Python. All of these are quite far away from the machine. There are many layers of abstractions from the code down to silicon. Every so often I wanted to look down in the rabbit hole of these abstractions, going lower bit by bit. 

## Layers of layers

To start with a Hello World example, we call some kind of `println`, `Write`, or `.log` method to display a string of characters written out as "Hello, World!" on the computer screen. But how does that string of characters actually get displayed on the screen? 

Well, the source code gets compiled by a compiler into an intermediate language (or a binary). Then there is a language runtime or a standard library that provides the printing routine that we called from the user program. This routine typically writes some bytes into a standard output stream and the operating system tells a console to print the bytes, interpreting them with some kind of encoding on a screen (directly or within a terminal window). With the help of a font file or something similar, the characters are rendered into a bitmap, which is copied to a video memory, which the graphics card reads to display the bitmap as pixels on the screen.
 
However, this process, and all other user and system code runs on a processor - a CPU. The processor executes the code as discrete instructions that fetch data from memory, does arithmetic and logic operations (it twiddles bits) and writes it back to memory. A typical CPU consists of various components - ALU, registers, caches, and others that are themselves composed of smaller building blocks such as logic gates, flip-flops, multiplexers, that are implemented using simpler logic gates and eventually laid out as transistors on silicon. *Transistors work because physics. :)*

## Going lower

All of these are the layers of abstractions that, if viewed top-down, usually only need to know how the next layer down works. As a developer lurking around front-end and back-end applications, I usually work within the high level language, occassionally develop a library or two, but I did not need to go lower than that at work. I also did have some fun with microcontrollers (Arduino and ESP32), writing code that runs without operating system on a small chip, sometimes needing to implement some of the higher-level abstractions myself.

To go down lower, for fun I also tried language development, writing Forth and Scheme interpreters recently. These deal with the question of how code written in a higher level language works. To learn a bit more of how the CPU works, I got into emulator development last year, writing [MOS 6502](https://en.wikipedia.org/wiki/MOS_Technology_6502) and [RISC-V](https://en.wikipedia.org/wiki/RISC-V) emulators in C. The MOS 6502 emulator [emu6502](https://github.com/jborza/emu6502) was easy, 8 bit chip supporting a fantasy video game console with simple emulated hardware. The RISC-V emulator [emuriscv](https://github.com/jborza/emuriscv) was a bit more complex, as I wanted it to run Linux. (It still doesn't, but I suppose I'm close). That means supporting more hardware bits, memory-mapping units, a console device, but in the end it's still C code, that runs on my x64 machine with all the niceties that come with the language and modern OS.

*However, this is a developer's approach - try to implement every abstraction layer in software (that already runs on the machine).*

So, the next bit that I'm missing is learning more about how the code runs on actual hardware. In other words, **I would like to go through a journey of building a computer from ground up from the basic elements**. This means getting up to speed on combinatorial and sequential logic, hardware description languages, simulation, testing, very possibly a new development environment and debugging techniques.

## Enter nand2tetris

I've found a course on Coursera called [Build a Modern Computer from First Principles: From Nand to Tetris](https://www.coursera.org/learn/build-a-computer) that is supposed to teach people exactly that. There's also a [nand2tetris.org](https://www.nand2tetris.org/) website and a book version called [The Elements of Computing Systems](https://www.amazon.com/Elements-Computing-Systems-Building-Principles/dp/0262640686/ref=ed_oe_p).

I plan to spend the next couple of weeks following the course and hopefully making some progress. The course uses a simplified hardware description language (HDL) and course-specific tools such as simulators, compiler and assembler, so I'll also need to make a transition to standard tools later (VHDL) to implement it in real hardware, as I bought an FPGA development board some time ago and was in a need of a project. 