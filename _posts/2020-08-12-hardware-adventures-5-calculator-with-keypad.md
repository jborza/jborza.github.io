https://appcodelabs.com/read-matrix-keypad-using-arduino

The principle is straightforward: you put a signal on one of the columns and proceed to read all of the rows in turn. If the signal appears on any of the rows then you know that rows is connected to the column you put the signal on, so the key at the intersection of that row and column must be pressed. If there was no signal, try the next column, and so on, until you’ve tried all the columns.

This process is called a matrix scan. TODO describe

TODO picture of the keypad

We also need to enable builtin [pull-down resistors](TODO Wikipedia link) on the row pins in order to ensure a known state (logical zero) when a button is not pressed.

TOOD keypad modularization

TODO state machine in VHDL
TODO state machine picture TODO convert to png - see [dotfile](../assets/hardware-adventures-5-keypad-state-machine.dot)

TODO clock divider as a component

TODO design of the top module so far

## Entering multiple digits

How do we know that the user has pressed and released a button? By using a signal that indicates if anything is pressed.
Then whenever a new `OutputReady` (TODO rename) signal comes in, we can read it.

We'll need multiple

TODO link state machine for reading the digits