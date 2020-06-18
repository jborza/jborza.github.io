---
layout: post
title:  "Writing a Forth interpreter - part 2"
date:   2020-05-12 20:00:00 +0200
categories: interpreters
tags: [forth, javascript]
published: false
---

See Part 1: [Writing a Forth interpreter - part 1]({% post_url 2020-05-03-beginning-forth %})

In the first part we take a naive approach and use a plain dictionary for words. However, as words can be redefined, we'd be better served with something like this for a word definition:

```js
 word = {
                name: name,
                code: wordCode,
                immediate: immediate
        };
```

and the dictionary itself as a list 

```js
function dictionary() {
    return {
        dictionary: [],
        findWord: function (name) {
            for (let word of this.dictionary) {
                    return word;
                }
            }
            return undefined;
        },
        addWord: function (name, code, immediate = false) {
            let wordCode = [];
            wordCode = wordCode.concat(code);
            word = {
                name: name,
                code: wordCode,
                immediate: immediate
            };
            this.dictionary.unshift(word);
            return word;
        },
    }
}
```


Forth operators

value address ! -> stores value at an address

 # finally implementing min, max, abs

After we got our conditionals implemented, we can introduce words such as min, max, abs

: max ( n1 n2 -- n3) 2dup > if drop else nip then ;
: min ( n1 n2 -- n3) 2dup < if drop else nip then ;

# refactoring the engine

I have to fix the conditional and branch statements. In situations such as
: 10> 10 > 

# loop in forth

loop deconstructs to
r> r> \ move from return stack to the stack
1+  \ increment i
2dup \ duplicate for comparison
> \ stack contains limit, i;  compare if limit > i
if \ should we loop again? 
    >r >r branch XX \ move back to return stack and loop again
then \ 

2 0 : spell ." ba" do ." na" loop ;

compiles down to:
." ba" do ." na" loop
." ba" (do)  ." na" loop
." ba" >r >r ." na" r> r> 1+ 2dup >= if >r >r branch 999 then
." ba" >r >r ." na" r> r> 1 +   over over >= 0branch 17 >r >r branch 3   then
0      1   2  3     4  5  6 7   8    9    10 11      12 13 14 15     16  17

stack at execution time:
2 0 -> (1+) 2 1 -> (2dup) 2 1 2 1 -> (>=) 


# Finally implementing fizzbuzz:

fizz and buzz words will print out fizz / buzz and leave true on stack if it was fizz

: fizz 3 mod 0= if ." fizz" true else false then ;
: buzz 5 mod 0= if ." buzz" true else false then ;
: (fizzbuzz) dup dup fizz swap buzz or if drop else . then ;
: fizzbuzz do i (fizzbuzz) cr loop ; 
20 1 fizzbuzz

if(i%3==0) { "fizz" if(i%5==0){"buzz"}}
: fizzbuzz dup 3 mod 0= if 
    ." fizz" dup 5 mod 0= if
        ." buzz " 



# let's put it together in one word

JS pseudocode
```js
if(i%3==0 && i%5==0){
    "fizzbuzz" 
} 
else{
    if(i%3==0) 
    {
        "fizz"
    }
    else{
        if(i%5==0) {
            "buzz" 
        }
        else
        {
            i
        }
    }
} 
```

``` forth
: fizzbuzz dup dup 3 mod 0= swap 5 mod 0= and 
    if ." fizzbuzz " drop
    else dup 3 mod 0= 
        if ." fizz" drop
        else dup 5 mod 0=
            if ." buzz" drop
            else .
            then
        then
    then
;
```

how about a little helper word for the repeating dup N mod 0=?

```
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

Not much more readable ...



    
: fizzbuzz dup 3 mod 0= if 
    ." fizz" dup 5 mod 0= if
        ." buzz " 