---
layout: post
title:  "Connecting real car instruments to a simulator"
date:   2021-01-11 11:00:00 +0200
categories: hardware
tags: [hardware, games, cars, arduino]
#image: TODO
published: false
---

In the previous blog post I described the pinout of the steering column instruments. Now it's time to connect them to a driving simulator. I'll be using [Euro Truck Simulator 2](https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/) as the target. 


## Architecture

Instruments pins -> Arduino
Arduino -> Serial -> PC
PC -> Serial to keyboard bridge (C#)
(Virtual) Keyboard -> Simulator

## Instruments to Arduino

## Arduino to Serial

This part is simple

## Serial to keyboard

I've implemented a couple of applications that handle input, such as keyloggers and autoclickers (keyloggers, autoclickers) previously using C# and .NET framework. 

The idea is to poll the serial port and capture 

## Keyboard to simulator

Looking at ETS2 controls, there are multiple kind of controls - hold, toggle and multiple toggle (?).

I'll also map the board computer Reset, Up, Down buttons to cruise control.

The lights are controlled a bit different than on a car - we have a key mapped to toggle the high beams. 

J is light horn - connect it to flash.

Wipers - P - this toggles the speed - pressing P once is slow, then P again moves to medium, then P again to fast, P again to stop.

Indicators left [ right ], F is hazard light.

Note to self - I have my Arduino project called car_controller.

