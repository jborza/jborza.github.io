---
layout: post
title:  "Implementing Solitaire in C"
date:   2020-07-12 18:00:00 +0200
categories: games
tags: [games, c, solitaire, curses]
published: true
---

# Implementing Solitaire in C

Solitaire was the first computer game I have played, ages ago, on an ancient Windows 3.1 laptop. I have never actually implemented it. When I say Solitaire, I actually mean the [Klondike](https://en.wikipedia.org/wiki/Klondike_(solitaire)) variant, which I think is the most commonly known amongst the computer players. 

## Tech stack

I like C these days, there's something zen-like about being close to the machine and almost universally portable. The standard library doesn't offer as much convencience as, say, Python, Java or JavaScript, but we won't need too many complicated data structures, so we can roll our own.

There won't initially be a graphical version, but a terminal character-based version seems like a good idea in the spirit of doing one thing at a time - some game logic first, some user interface later and maybe a GUI even later. 

This is how the final product looks like: 

![gameplay screenshot](/assets/solitaire-curses-gameplay.png)


## Architecture

I don't do that much upfront planning for pet projects, they mostly evolve on the go. However, in this game, the plan is to proceed along the following lines:

- Define the basic game object data structure (the cards)
- Implement and test the basic interactions between the cards
- Define more game data structure (game board, piles of cards)
- Implement common operations on these structure (linked list fun)
- Display the current game state on the screen
- Parse user input
- Execute actions based on the user input  

## The cards

Solitaire is played with a standard 52-card deck with four suits: 

> ♥ Heart, ♠ Spade, ♣ Club, ♦ Diamond

and thirteen ranks (in ascending order)

> A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K

Hence the card structure can be defined in C as: 
```c
enum {
	SUIT_HEART, SUIT_SPADE, SUIT_CLUB, SUIT_DIAMOND // ♥♠♣♦
} ;

enum {
	RANK_A, RANK_2, RANK_3, RANK_4, RANK_5, RANK_6, RANK_7, RANK_8, RANK_9, RANK_10, RANK_J, RANK_Q, RANK_K
};

typedef struct card {
	int suit;
	int rank;
};
```

## Solitaire rules as functions

Solitaire defines a couple of card interactions, which we'll define as functions:
- is it red? 
- is it black?
- are two cards in alternate colors? (as card colors in columns must alternate between red and black)
- are two cards in sequence? (A -> 2 -> 3 ... -> K)
- can a card be placed on foundation? (A♥ -> 2♥ -> 3♥ -> K♥)
- can a card can be placed on bottom? (is alternate and is in sequence) ( J♦ -> 10♠ -> 9♥ -> 8♣ -> 7♥)

These can be implemented as a set of simple C functions:
```c
int is_black(card c) {
	return c.suit == SUIT_CLUB || c.suit == SUIT_SPADE;
}

int is_red(card c) {
	return c.suit == SUIT_HEART || c.suit == SUIT_DIAMOND;
}

int is_alternate_color(card first, card second) {
	return is_black(first) != is_black(second);
}

int is_in_sequence(card lower, card higher) {
	return higher.rank == lower.rank + 1;
}

int can_be_placed_bottom(card parent, card child) {
	return is_alternate_color(parent, child) && is_in_sequence(child, parent);
}

int is_same_suit(card first, card second) {
	return first.suit == second.suit;
}

int can_be_placed_on_foundation(card parent, card child) {
	return is_same_suit(parent, child) && is_in_sequence(parent, child);
}
```

This also can be tested during the development with a simple "test":

```c
card c5S = make_card(SUIT_SPADE, RANK_5);
card c6H = make_card(SUIT_HEART, RANK_6);
printf("5s is black %d vs 1 \n", is_black(c5S));
printf("5s is red %d vs 0 \n", is_red(c5S));
printf("5s 6h is alternate %d vs 1 \n", is_alternate_color(c5S, c6H));
```

> Note: There *are* many unit testing frameworks in C if you want to test things more correctly than dumping some code in the main() function during development

## Game deck (and the other data structures)

Let's define our first pile of cards - the deck of initial 52 cards (the stock).

It seems there are a couple more piles around Solitaire - for example, waste (revealed cards), the stacks of cards on the foundation, and the piles on the bottom, which we'll call columns. It makes sense to have the concept of the pile encapsulated as a structure with associated functions. The game board / game state structure would contain all of these piles.

```c
#define CARD_COUNT 52

typedef struct card_node {
  card *value;
  struct card_node *next;
} card_node;

typedef struct pile {
  card_node *head;
  int num_cards;
} pile;

typedef struct game_state {
  pile **piles;
  int pile_count;
} game_state;
```

> `pile **piles` is an array of pointers to piles, it could also be written as pile *piles[PILE_COUNT] 

> #### Note: array vs linked list
>
> We could represent the collection of cards in a pile with a linked list, or just assume there will never be a larger pile than 52 and go with an array as the backing store and a counter. With this, at the expense of more memory overhead per pile. As there is a known number of piles: unturned and turned card deck, 4 foundations, 7 columns, the total is 2+4+7=13 piles. On a 32-bit system, that's at most `13 * (sizeof card*) * CARD_COUNT = 13 * 4 * 52 = 2704` bytes overhead, not that much on a PC, could be a factor on a microcontroller.

On the other hand, linked lists are a kind of a traditional C structure, so it may be nicer with them. Let's see.

We'll need a set of pile manipulation functions. Push/Pop deals with the end of the list of cards. I opted in for the JavaScript nomenclature (shift/unshift) for the functions that deal with the beginning of the list.

> Java LinkedList uses names such as addFirst,addLast, pollFirst, pollLast, getFirst, getLast - they are more consistent though.

```c
pile *make_pile();
void push(pile *pile, card *card);
card *pop(pile *pile);
card *shift(pile *pile);
void unshift(pile *pile, card *card);
card *peek_card_at(pile *pile, int index);
card *peek(pile *pile);
card *peek_last(pile *pile);
void delete(pile *pile, card *card);
```

The implementation of these functions is pretty much straightforward - we either have to link or unlink an item in the list. I've also opted to use a non-intrusive list structure with the `card_node` as the node type and `card` as the data type.

#### Intrusive vs non-intrusive lists

The difference between intrusive and non-intrusive containers is that the *value* types in the intrusive containers *know* they are a part of some collection, which means the links are embedded in the structure, for example:

```c
typedef struct card {
int rank;
int suit;
struct card* next
} card;
```
In a non-intrusive list the *value* types don't embed the links, so that's why we introduced the `card_node` node type that has a pointer to a card` value. 

This affects the implementation of list manipulation functions and performance - intrusive lists do less allocations and less dereferencing on iteration. Using non-intrusive containers separates the value and the container data, and I like separation of concerns (and responsibilities) in software. 
 
I also may be influenced by Java/C# and likes where the platform-provided data structures are non-intrusive.

#### Memory management

To instantiate structures, I've used a convention of `make_type`, which allocates memory for them with `malloc()`. This memory must be freed sometime later, which is the responsibility of the functions that destroy the list nodes: `pop` / `shift` / `delete`. As it happens that all 52 of the cards in Solitaire never go out of existence, we don't need to delete the cards themselves or the game state - they'll be freed when the player quits the game.

#### Enums and PILE_COUNT

I have tried to keep track of the number of items in an enumeration consistently. I like to add the last enum item as ENUM_COUNT, which will conveniently resolve to the amount of previous items due to enum values being zero-indexed in C.

```c
enum { SUIT_HEART, SUIT_SPADE, SUIT_CLUB, SUIT_DIAMOND, SUIT_COUNT };
```

Of course you can also `#define SUIT_COUNT 5`, but then you should also remember to change the definition whenever the enum grows or shrinks.

### Initializing the game

Having the basic functions around, let's write the first game deck function that fills an initial deck of cards.

```c
void fill_deck(pile *pile) {
  for (int rank = 0; rank < RANK_COUNT; rank++) {
    for (int suit = 0; suit < SUIT_COUNT; suit++) {
      push(pile, make_card_ptr(suit, rank));
    }
  }
}
```

#### Shuffling the deck

As there is no built-in list shuffle function, I had to roll my own. It's similar to [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle), but we don't technically swap elements, but take the first element and insert it into a random spot.

```c
void shuffle_pile(pile *pile) {
  int shuffle_times = pile->num_cards * 10;
  for (int i = 0; i < shuffle_times; i++) {
    // unshift a card and insert to random place
    int idx = rand() % pile->num_cards - 1;
    card_ptr card = shift(pile);
    insert(pile, card, idx);
  }
}
```

## Text user interface

### Ncurses

A popular text-user interface library is called [ncurses](https://en.wikipedia.org/wiki/Ncurses) (new curses). We can get support for Unicode card symbols, such as ♥♠♣♦, by using its Unicode version `ncursesw`. That enables us to represent the cards as a fairly human-readable 10♠ or J♥.

We can introduce helper functions such as `rank_to_charptr` and `suit_to_charptr` that we'll use to print a card representation, using the Unicode character codes for the suits:

```c
const char *suit_to_charptr(int suit) {
  switch (suit) {
  case SUIT_HEART:
    return "\u2665";
  case SUIT_SPADE:
    return "\u2660";
  case SUIT_CLUB:
    return "\u2663";
  case SUIT_DIAMOND:
    return "\u2666";
  ...
  }
}
```

To print a card somewhere on the screen, we set a cursor location with the `move(int row, int column)` function, then print using the `printw` ncurses function, which behaves like `printf`. There are also variants like `mvprintw` that combine moving the cursor and printing.

```c
void printw_card(card *c) {
  printw("%s%s", rank_to_charptr(c->rank), suit_to_charptr(c->suit));
}
```

### Basic layout

Now we need to lay out the piles on the screen. It should look familiar to the Solitaire players:

![screenshot](/assets/solitaire-css-mockup.png)

Here I also had to decide how the cards in the piles would be ordered. I think it makes sense that the first card would mostly be the displayed one - for stock, waste and fodation piles.

I needed to add a `peek(pile *pile)` function to peek at the pile, as these piles would only display the top card.

The column piles would be ordered 'top to bottom', so initially only the last card would be revealed, but we can draw the column from first card to the last.

The rendering code is fairly uninteresting, using string arrays for headers, picking an arbitrary size (100) for the game deck terminal width, then iterating through the piles and moving the cursor around the screen until all is laid out.

```c
char *first_row_headers[] = {"Stock",        "Waste",        "",
                             "Foundation 1", "Foundation 2", "Foundation 3",
                             "Foundation 4"};
...
// first row headers
int column_size = 14;
for (int i = 0; i < 7; i++) {
move(0, column_size * i);
  printw("%s", first_row_headers[i]);
}
// first row content 
move(1, 0);
printw_card(peek(stock(state)));
move(2, 0);
printw_pile_size(stock(state));
...
 // foundations
for (int f = 0; f < FOUNDATION_COUNT; f++) {
  int foundation_1_column = 3;
  move(1, (foundation_1_column + f) * column_size);
  printw_card(peek(foundation(state, f)));
  move(2, (foundation_1_column + f) * column_size);
  printw_pile_size(foundation(state, f));
}
```

We also display a status bar and a 'command prompt' at the bottommost lines.

At this point of development it made sense to show the rank and suit of the face-down cards (those not revealed, most of the cards in the columns), represented as (Q♦). I also had add the revealed flag (face up) to the `card` structure, as it's possible to have a sequence of multiple face up cards in the columns.

A column now looks like this:

```
Column 4 
(4 cards)
(J♠) 
(A♣)  
(Q♦)   
6♥      
```

### Adding color to curses

If we add a bit of color, the players will have have much easier time distinguishing 4♣ and 4♥ (four of spades and four of hearts). Fortunately, Ncurses supports colors in the terminal. I've used a [tutorial by Jim Hall](https://www.linuxjournal.com/content/programming-color-ncurses) to get up to speed with the basics.

There are only eight basic colors supported by the console - black, red, green, yellow, blue, magenta, cyan, white. Then we have to define a color pair with `init_pair(index, foreground, background)`. You can also pass `-1` as a color this function to use the default value.

Let's just change the foreground color of the red cards:

```c
#define BLACK_PAIR 1
#define RED_PAIR 2
...
init_pair(BLACK_PAIR, -1, -1);
init_pair(RED_PAIR, COLOR_RED, -1);
...
attron(COLOR_PAIR(RED_PAIR));
printw("4\u2660); //4♠
attroff(COLOR_PAIR(RED_PAIR));
```

To actually use that color pair during printing, use `attron(COLOR_PAIR(int pair))` to turn on the color attribute. This should be later turned off by a corresponding `attroff()` call.

![screenshot](/assets/solitaire-curses-colors.png)

### Controls

We have the option of using text-based controls, that would (in case of moving the cards) have a form of `source destination`, so for example `c3 c4` means take 1 card from column 3 and put it at column 4. We also need to draw a card from the stock, so that could be a command `s`. To move the drawn card (from the waste), we'll use `w`. As we sometimes need to move more than one card, it could be solved with a command like `3c1 c5` - take three cards from column 1 and put them at column 5.

So we have a couple of possible combinations:

```
s
c3 f1
c7 c2
3c4 c5
w c4
w f3
```

There are some things, that should not be possible. Moving multiple cards from a column to a foundation makes no sense, as they won't be ordered in ascending order of the same suit. Moving multiple cards from the waste into a column can be disallowed as well. Drawing multiple cards from the stock might be possible, but let's ignore it and add it later. Let's also prohibit moving cards from foundations elsewhere.

#### Parsing the input

We have multiple options on how to parse the user input in C. I initially thought of parsing it by hand going character by character and keeping track of state or using the `scanf` function with multiple input templates, such as `%c%d %c%d` for the likes of `c3 f1`. The `scanf` family of functions returns the number of specific conversions, so we can check the return value for success and cascade the checks.

With the `scanf` option one should prepare the templates from the most specific to the least specific, we end up with four specific patterns:

```
%dc%d c%d -> 3c4 c5
%dc %c%d -> c3 f1 / c7 c2
w %c%d -> w c4 / w f3
s -> s
```

As the parsing function `parsed_input parse_input(char *command)` should return multiple values, let's wrap it in a structure:

```c
typedef struct parsed_input {
  char source;
  char destination;
  int source_index;
  int destination_index;
  int source_amount;
  int success;
} parsed_input;
```

And the parsing function is trying the patterns one by one, filling in the sources/destinations as well, as they are implied by some patterns - for example the `pattern_stock` means the source is the stock pile and destination is undefined.

```c
parsed_input parse_input(char *command){
  parsed_input parsed;
  parsed.success = 1;
  parsed.source_amount = 1;
  // parser patterns 
  char *pattern_multi_move = "%dc%d c%d";
  char *pattern_single_move = "c%d %c%d";
  char *pattern_waste_move = "w %c%d";
  char *pattern_stock = "s";
  if(sscanf(command, pattern_multi_move, &parsed.source_amount, &parsed.source_index, &parsed.destination_index) == 3){
    parsed.source = 'c';
    parsed.destination = 'c';
  }
  else if(sscanf(command, pattern_single_move, &parsed.source_index, &parsed.destination, &parsed.destination_index) == 3){
    parsed.source = 'c';
  }
  else if(sscanf(command, pattern_waste_move, &parsed.destination, &parsed.destination_index) == 2){
    parsed.source = 'w';
  }
  else if(strcmp(command, pattern_stock) == 0){
    parsed.source = 's';
  }
  else{
    parsed.success = 0;
  }
  return parsed;
}
```

Note that we could reuse the `parsed_input` structure also if we control Solitaire with arrow keys or in a graphical version Later as a more graphical interface is developed we also could have a concept of a cursor that we can move across the piles with the arrow keys.

#### Getting reproducible games with srand() 

The pseudorandom number generator we use - `rand()` needs a seed to generate the sequence of numbers from. If the seed is the same, the sequence ends up being the same on different runs of the application. According to the [man page of srand](https://linux.die.net/man/3/srand), _If no seed value is provided, the rand() function is automatically seeded with a value of 1._

It's a common practice to seed the generator with a value from the system clock:

```c
srand(time(NULL));
```

It also means that if we use a specific value, like `srand(123)`, we can use it to reproduce a specific sequence of cards being dealt.

### Adding more gameplay logic - moving the cards

> See the section Solitaire rules as functions for the rules

Once we parse user's command, we know where they want to move the cards from and to. This is the time to apply the rules based on the source and destination column. We can apply a simple 'source column' rule - we can pick the **source card** from the waste or a column only if it's not empty, and we pick up the last card.

The **destination** has different rules whether it's a foundation or a column, but the sequence of events is similar. We pick up the last card from the destination pile, use the game logic comparison function and if the card can be moved, we remove it from its source and push it to the end of the destination pile:

```c
void move_card(card *card, pile *source_pile, pile *destination_pile) {
  pop(source_pile);
  reveal(peek_last(source_pile));
  push(destination_pile, card);
}

...

card *source_card = peek_last(source_pile);

...
card *top_foundation_card = peek(destination_pile);
if (can_be_placed_on_foundation(*top_foundation_card, *source_card)) {
  move_card(source_card, source_pile, destination_pile);
  return MOVE_OK;
} 
```

One also needs to incorporate special rules for placing aces on empty foundations, or kings on empty columns:

```c
if (parsed.destination == 'f') {
  if (destination_pile->num_cards == 0 && source_card->rank == RANK_A) 
    move_card(source_card, source_pile, destination_pile);
    ...
}
...
if (parsed.destination == 'c') {
  if (destination_pile->num_cards == 0 && source_card->rank == RANK_K) 
    move_card(source_card, source_pile, destination_pile);
    ...
}
```

### Moving more than one card at a time

We would also like to allow the player to move more than one card at a time, from column to column.

![screenshot](/assets/solitaire-curses-move-multiple.png)

To do this, we have to change the logic of moving - from checking whether the *bottommost* card of the source column fits the destination column to checking whether the *N-th* card fits.

This was luckily only a single for-loop around the entire card moving logic, with one caveat: we can't just pop the bottommost card from the source pile, but remove the N-th card possible from the middle of the pile, which means implementing one more linked list manipulation function `delete(pile*, card*)`.

```c
// remove a card from a pile, relinking the list
void delete (pile *pile, card *card) {
  if (is_empty(pile)) {
    return;
  }
  // no previous node for the first item
  card_node *prev = NULL;
  card_node *current;
  for (current = pile->head; current != NULL;
       prev = current, current = current->next) {
    if (current->value == card) {
      // special case if the first item was found - relink pile head
      if (prev == NULL) {
        pile->head = current->next;
      } else {
        // skip over the current item
        prev->next = current->next;
      }
      // skip the current item in the list
      pile->head = current->next;
      // decrement the card counter 
      pile->num_cards--;
      free(current);
      return;
    }
  }
}
```

### Keeping score

Now that the game mostly works, we can fit a scoring mechanism in. The standard scoring for Windows Solitaire [according to Wikipedia](https://en.wikipedia.org/wiki/Klondike_(solitaire)#Scoring) is: 

| Move | Score |
| --- | ---- |
| Waste to Column |	5 |
| Waste to Foundation |	10 |
| Column to Foundation |	10 |
| Turn over Column card |	5 |
| Recycle waste  |	−100 |

Note that the score also should not go lower than zero.

We know when all these events occur, so we can add score manipulation one by one with a small helper function: 

```c
void add_score(game_state *state, int score){
  state->score += score;
  if(state->score < 0) {
    state->score = 0;
  }
}
```

It also made sense to enrich the `pile` type to keep track of its pile type (column, foundation, etc) to keep most of the scoring in the `move_card` function:

```c
void move_card(game_state *state, card *card, pile *source_pile, pile *destination_pile) {
  ...
  //add score for the moves
  if(destination_pile->type == 'f'){
    add_score(state, 10);
  }
  if(source_pile->type == 'w' && destination_pile->type == 'c'){
    add_score(state, 5);
  }
}
```

### Finishing touches

I have added an option to compile without Unicode symbols, using an `#ifdef UNICODE ` that's defined in the Makefile as `-DUNICODE`. It was quite neat to compile and run the game even on an Android phone using [UserLAnd](https://github.com/CypherpunkArmory/UserLAnd) Linux compatibility layer. 

I was also thinking about splitting the source into a multiple files. It does make sense when considering ports to different platforms, which I hope to make! I would split at least the entire ncurses interface into a separate module and keep the rest of the logic together. 

# My development setup

I wanted to try new things while developing this game, and was also looking for a fun project to learn the "traditional" vim + gcc + gdb Linux stack. It was quite slow to get started, moving from my usual Visual Studio / VSCode / IDEA stack, which is a bit more ... integrated.

### Vim

Syntax coloring is a must. To make vim behave more like a modern IDE I also configured it to 
- expand tabs to spaces
- use clang-format for code autoformatting-
- use Tab key to toggle autocompletion and Return to confirm it
- use Tagbar to show a list of identifiers to the right for quick navigation

I found it pretty useful to keep the `.vimrc` file as a [gist](https://gist.github.com/jborza/b1c1ac4991d81a9c724883f232905524), that way it's accessible from all my machines.

![screenshot](/assets/solitaire-curses-vim.png)

### Debugging with gdb(tui)

First thing you need is to compile with debug symbols, using GCC flag `-g`. This can be also done in the Makefile, I've created a `debug` target that builds with symbols.

The most useful gdb commands were `p` for printing a value of an expression, `b` for breakpoint, then `n/next` and `s/step` for stepping throught the code. You can watch variables or expressions with `watch`.

```c
...
(gdb) n
370	  for (int i = 0; i < shuffle_times; i++) {
(gdb) n
372	    int idx = rand() % pile->num_cards - 1;
(gdb) watch idx
Hardware watchpoint 2: idx
(gdb) n

Hardware watchpoint 2: idx

Old value = 0
New value = 40
shuffle_pile (pile=0x55555555e280) at main.c:373
373	    card_ptr card = shift(pile);
(gdb) p *card
$2 = {suit = 0, rank = 0, revealed = 0}

```

You can also list the source code in gdb with `list`, but I found it a bit slower to always list the code.

To make it a bit closer to a modern IDE, I've used `gdbtui` - GDB's text user interface. The default view there is split between the code and gdb console:

![screenshot](/assets/solitaire-curses-gdbtui.png)

It's a bit more useful than the plain gdb interface as we can see the breakpoints, line numbers and the code, but we can't reasonably watch variables like in more modern IDEs.

### Debugging with ddd (data display debugger)

There's also the 'big guns' called [DDD - Data Display Debugger](https://www.gnu.org/software/ddd/). I would call it a visualization frontend to gdb, which can do all gdtbui can (show source, control gdb), but it can also visualize variables, expressions and even plot them.

![screenshot](/assets/solitaire-curses-ddd.png)

### Debugging from dumps

The game was crashing when I attempted to move the entire column (two or more cards) to another column. 

If you're prepared for this, you can have the debugger ready and step through the code yourself. Another way to debug a crash like is to take a core dump (see below), and load it with

`gdb ./solitaire core.1000.5629.1593719583`

> Enabling core dumps on Ubuntu
> 
> As core dumps (of non-packages) were disabled by default on my macihne, I needed to run the following commands
> ```bash
> ulimit -c unlimited
> sudo sysctl -w kernel.core_pattern=core.%u.%p.%t
> ```
> which overrides the default size limit for core dump of 0 kilobytes and sets a pattern of the core file to end up in the current directory and look like core.123.456.123456789

Once the core dump is in, I used the `bt` (backtrace) command to get a stack trace from the time of the crash. Examining variables and parameters works the same way as during live debugging. You can also move between the various [stack frames](http://kirste.userpage.fu-berlin.de/chemnet/use/info/gdb/gdb_7.html) (calls to functions in the stack trace) with the `frame` command.

I have found out that there was a [bug](https://github.com/jborza/solitaire-cli/commit/a5f14a442418830464d953e33324822a90c7464b) in the `delete()` function if a first item was being removed from the list. Shame on me, I should have bothered with the unit tests.

### Checking for memory trouble with valgrind

At various stages of development I used [Valgrind](https://valgrind.org/) to check for memory leaks or invalid access. Its output can be redirected to a file, 

``` bash
valgrind --log-file=valgrind.log ./solitaire
```

Valgrind can alert us to various kind of mistakes, for example

```
==4876== Invalid write of size 4
==4876==    at 0x109F94: reveal (main.c:394)
==4876==    by 0x109FF6: turn (main.c:406)
==4876==    by 0x10A0C9: deal (main.c:428)
==4876==    by 0x10A752: prepare_game (main.c:575)
==4876==    by 0x10ADE4: main (main.c:768)
==4876==  Address 0x4b59658 is 0 bytes after a block of size 8 alloc'd
==4876==    at 0x483B7F3: malloc (in /usr/lib/x86_64-linux-gnu/valgrind/vgpreload_memcheck-amd64-linux.so)
==4876==    by 0x109484: mallocz (main.c:16)
==4876==    by 0x10968F: make_card_ptr (main.c:137)
==4876==    by 0x109CD3: fill_deck (main.c:301)
==4876==    by 0x10A73A: prepare_game (main.c:573)
==4876==    by 0x10ADE4: main (main.c:768)
```

Following the line numbers we can see that the `reveal` function is setting `card->revealed`, which is the invalid write. Valgrind also tells us the block was allocated in `make_card_ptr` and had a size 8, which is strange, as the `card` structure contains three 32-bit (4-byte) integers, which is 12 bytes.

The culprit is the wrong argument to `sizeof(card *)`, as I was allocating a size of a pointer-to-card, which on my 64-bit system was 64 bits, so 8 bytes, instead of `sizeof(card)`, which has enough space.

```c
48: typedef struct card {
49:  int suit;
50:  int rank;
51:  int revealed;
52: } card;

136: card *make_card_ptr(int suit, int rank) {
137:   card *c = mallocz(sizeof(card *));
...
394: card->revealed = 1;
```

# Source

See the [project GitHub page](https://github.com/jborza/solitaire-cli)