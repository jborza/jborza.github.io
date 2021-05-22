---
layout: post
title:  "Programming Fizz-Buzz in Forth"
date:   2020-05-11 20:00:00 +0200
categories: forth
tags: [forth]
image: fizzbuzz.png
---

# Fizz-buzz in Forth

After finished implementing my [Forth interpreter](https://github.com/jborza/jsforth/) I was finally ready to do some programming in Forth.

Let's do the famous [Fizz-Buzz test](https://wiki.c2.com/?FizzBuzzTest).

The assignment goes:
_"Write a program that prints the numbers from 1 to 100. But for multiples of three print “Fizz” instead of the number and for the multiples of five print “Buzz”. For numbers which are multiples of both three and five print “FizzBuzz”."_

## The cascading ifs

Let's do a naive one-word implementation. Assuming the pseudocode:

```python
def fizzbuzz(i):
    if(i%3==0 and i%5==0):
        print "fizzbuzz" 
    else:
        if(i%3==0):    
            print "fizz"
        else:
            if(i%5==0):
                print "buzz" 
            else:
                print i
```

Converts straightforwardly into Forth as follows:

``` forth
: fizzbuzz
    \ is n divisible by 3 and 5?
    dup dup 3 mod 0= swap 5 mod 0= and 
    if ." fizzbuzz " drop 
    \ divisible by 3?
    else dup 3 mod 0= 
        if ." fizz" drop
        \ divisible by 5?
        else dup 5 mod 0=
            if ." buzz" drop
            else .
            then
        then
    then
;
```

We do `dup` a lot to keep the original argument on the stack for the modulo 0 comparisons.

Note that we clean up the stack after each printout as we keep the argument around if it gets to `.` eventually in case not fizz, neither buzz got printed.

Maybe extracting a little helper word for the check for n mod m (the repeating `dup N mod 0=?` sequence):

``` forth
: 0mod 2dup mod 0= nip ; ok
: fizzbuzz 3 0mod swap 5 0mod and 
    if ." fizzbuzz " drop
    else 3 0mod
        if ." fizz" drop
        else 5 0mod
            if ." buzz" drop
            else .
            then
        then
    then
;
```

Nope, it's really not more readable.


## A more stacky way

How about we introduce the `fizz` and `buzz` words that will print out fizz/buzz respectively and also push a boolean on the stack to indicate whether they succeeded?

Forth:
``` forth
: fizz 3 mod 0= if ." fizz" true else false then ;
: buzz 5 mod 0= if ." buzz" true else false then ;
```

Then we can execute both checks in sequence them into the helper `(fizzbuzz)` word

```
: (fizzbuzz) dup dup fizz swap buzz or if drop else . then ;
: fizzbuzz do i (fizzbuzz) cr loop ; 
20 1 fizzbuzz
```

Pseudocode:
```python
def fizz(i):
    if(i%3==0):
        print "fizz"
        return True
    else:
        return false

def buzz(i):
    ...

def fizzbuzz(i):
    if not (fizz(i) and buzz(i)):
        print i
```

## Golfing it

Starting with 200 characters

```forth
: fizz 3 mod 0= if ." fizz" true else false then ;
: buzz 5 mod 0= if ." buzz" true else false then ;
: (fizzbuzz) dup dup fizz swap buzz or if drop else . then ;
: fizzbuzz do i (fizzbuzz) cr loop ; 
```

Let's just rename symbols first -> 163

```forth
: f 3 mod 0= if ." fizz" true else false then ;
: b 5 mod 0= if ." buzz" true else false then ;
: g dup dup f swap b or if drop else . then ;
: h do i g cr loop ; 
```

inline the old `(fizzbuzz)` aka `g` -> 155

```forth
: f 3 mod 0= if ." fizz" true else false then ;
: b 5 mod 0= if ." buzz" true else false then ;
: h do i dup dup f swap b or if drop else . then cr loop ; 
```

Do away with true/false -> 143 characters

```forth
: f 3 mod 0= if ." fizz" -1 else 0 then ;
: b 5 mod 0= if ." buzz" -1 else 0 then ;
: h do i dup dup f swap b or if drop else . then cr loop ; 
```
