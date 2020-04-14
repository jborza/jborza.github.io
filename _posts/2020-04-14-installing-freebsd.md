---
layout: post
title:  "Installing FreeBSD 12.1"
date:   2020-04-14 10:00:00 +0200
categories: unix
tags: [freebsd]
---

## Installation

I wanted to check out FreeBSD. I have played around ages ago, but wasn't sure how usable it is today as a Unix desktop.

Downloaded the install ISO (12.1 amd64 dvd1) from the [official website](https://www.freebsd.org/where.html), spun up a new Hyper-V VM and booted from the ISO.

Collecting information from the handbook - [Installing Xorg](https://www.freebsd.org/doc/handbook/x-install.html), [Desktop Environments](https://www.freebsd.org/doc/handbook/x11-wm.html):

After the system was installed to the HDD, updated the packages with

```shell
pkg update 
pkg upgrade
```

Installed X, Gnome and related packages:
```shell
pkg install gnome-desktop gdm xorg gnome3
```

Enabled necessary services:
```shell
echo gnome_enable="YES" >> /etc/rc.conf
echo moused_enable="YES" >> /etc/rc.conf
echo dbus_enable="YES" >> /etc/rc.conf
echo hald_enable="YES" >> /etc/rc.conf
echo gdm_enable="YES" >> /etc/rc.conf
```

GNOME requires /proc to be mounted, so:

```shell
echo proc /proc procfs rw 0 0 >> /etc/fstab
```

After a reboot GNOME showed up.

## Enabling remote desktop
 
For some reason, mouse support doesn't work on Hyper-V, because they say so on the [mailing list](https://bugs.freebsd.org/bugzilla/show_bug.cgi?id=221074#c3), so I installed TightVNC server according to [freebsddiary.org](http://www.freebsddiary.org/tightvnc.php):


```shell
pkg install tightvnc
```

Running vncserver allows me to start up the server, and set up a password for the connection. We obtain the VM's IP address from `ifconfig` and the VNC port from `tail ~/.vnc/freebsd:1.log`.

By default the VNC connections connect to twm, unlike the Gnome session I expected.

To rectify this, we edit `~/.vnc/xstartup` and set it to use gnome-session

(last 2 lines of `xstartup`)
```
#twm
gnome-session &
```

Start the server again with `vncserver -geometry 1280x768` yields strange result - some terminal is running, but not the entire Gnome UI.

Turns out this starts a new X session (as described in the `xstartup` script).

### x11vnc

It was much easier to use `x11vnc` based on this [forum post](https://askubuntu.com/a/107434) to share a VNC of the current desktop.