---
layout: post
title:  "Wiring car instruments for fun"
date:   2021-01-06 11:00:00 +0200
categories: hardware
tags: [hardware, games, cars]
image: /assets/2021-01-06-vw-cluster-on.jpg
published: true
---

## Car accessories as game controllers?

I got inspired by the [CAN BUS Gaming Simulator](https://hackaday.io/project/6288-can-bus-gaming-simulator) post on hackaday, where Leon Bataille connected a VW Polo dashboard and switches to Euro Truck Simulator 2.

I'd like to do something similar, but with with parts from a slightly different vehicle. In this article I'll describe my initial findings - how the things are wired together.

## Instrument cluster as output

Volkswagen group parts tend to be cheap around here, so I scored an instrument cluster from a VW Transporter T5 for 10 €, part number `7H0 920 850 R`.

![T5](/assets/2021-01-06-vw-t5.jpg)

The cluster has two 32-pin connectors that happen to be compatible pitch-wise with the standard breadbord jumper wires. I suspected that it won't be necessary to connect all 64 pins

I've found a pinout on a [German forum](https://avdi-forum.de/avdi_aktuell/index.php/Thread/685-Pinbelegung-Tacho-VW-Transporter-T5-bis-2009/) and converted it into tabular form, as I wanted to do the wiring next.

![connectors](/assets/2021-01-06-vw-cluster-connectors.jpg )

_Green connector with the pin numbering, blue connector after the wiring_

{% include 2021-01-06-t5-cluster.html %}

I powered both 12V wires from an adapter and the cluster lit up - so at least that works :)

![cluster](/assets/2021-01-06-vw-cluster-on.jpg)

## Steering column switches as input

To feed the simulator with external input I'd like to use a real steering column switches. 

Again, to keep the project costs I've bought the steering column switches from Škoda Fabia for another 10 €, part numbers `8LO 953 513 G` and `4BO 983 503 G` for the left and right stalks. These parts are shared between Volkswagen, Audi, Seat and Škoda, so the pinout should also be well documented online. 

I suspect this consists of passive components only - simple switches that should close a circuit / emit a signal whenever a button is pressed or a stalk is moved into a specific position. In that case we won't need 12 volts, but whatever our microcontroller uses for the digital inputs. 

![](/assets/2021-01-06-fabia-connectors.jpg)

The connectors are not the standard "needle" pins but some kind of flat pins, most probaly [FASTON terminals](https://en.wikipedia.org/wiki/FASTON_terminal). 

>I'll buy some and update this article when they arrive.

As the left and right stalk are separate parts, they would be wired separately as well, so it makes sense to analyze them individually.

### Turn indicator stalk

The left stalk `8LO 953 513 G` controls the turn indicators and the headlights. It has 11 pins with labels such as `56`, `56b`, `PL`, `PR` and so on.

It turns out these are standardized in [DIN 72552](https://en.wikipedia.org/wiki/DIN_72552), which specifies the codes for many contacts in the automobiles.

The table with the signal listing:

{% include 2021-01-06-fabia-turn.html  %}

After some poking and probing the pins myself I wasn't able to get any kind of signal on those pins, I suppose I have to probe the pins with a 12V signal and see if that helps, as it should work in a real car.

### Wiper stalk

The right stalk `4BO 983 503 G` controls the wiper and the board computer. 

It has three connectors in total:
-  straight long connector with pins labeled `1` to `6`
-  L shaped connector with pins `HW`, `53b`, `INT`, `53a`
-  L shaped connector with pins `53`, `31`, `53e`, `53c`.

Using DIN 72552 as a reference shows that the `53x` are related to the window wiper/washer, `31` is ground.

`INT` should be related to the intermittent wiper mode. `HW` should be Front window cleaner.

I guess the long connector is be related to the board computer buttons (up, down, reset).

According to a [workshop manual](https://workshop-manuals.com/audi/a2/vehicle_electrics/electrical_system/lights_lamps_switches_outside/steering_column_switch/connection_assignment_at_steering_column_switch/) they should be:

| Contact | Description                         |
|---------|-------------------------------------|
| 1       | Rocker up                           |
| 2       | Rocker down                         |
| 3       | Ground                              |
| 4       | Reset                               |
| 5       | Relay for wash/wipe interval system |
| 6       | Ground                              |

Probing the rocker up/down and reset buttons with the multimeter buzzer worked - I got a beep on the correct pin with the buttons pushed.

Poking it with multimeter unfortunately didn't work, probably for the same reason as with the other stalk (12V signals).

## What's next

There are several follow-up activities: 
- Connecting an Arduino CAN bus shield to the CAN bus pins on the instrument cluster
- Lighting individual warning lamps on the instrument cluster 
- Successfully processing the signals from the turn indicators with Arduino and communicating that back to the PC
- Making it all work with a driving simulator :)
