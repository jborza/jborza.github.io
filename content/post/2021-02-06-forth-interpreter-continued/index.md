---
layout: post
title:  "Writing a Forth interpreter - part 2"
date:   2021-02-06 20:00:00 +0200
categories: interpreters
tags: [forth, javascript, interpreters]
image: 2021-02-06-jsforth.png 
published: true
---

In the first part I started to describe a simple Forth interpreter. I eventually completed it and made it more usable - so in this part I'd like to get into the details of the interpreter mode, allowing the user to utilize the builtin words, and the compile mode, allowing the user to define new Forth words.

See Part 1: [Writing a Forth interpreter - part 1]({% post_url 2020-05-03-beginning-forth %})

A quick recap:
[Forth](https://en.wikipedia.org/wiki/Forth_(programming_language)) is a stack-based programming language with very basic syntax that's modular, extensible, as you can add new language constructs even with Forth itself.

The first part described a very simple evaluator that supported only native words, which was usable as a basic postfix notation calculator.

Now we'll extend it.

### Words

In the first part we took a naive approach and use a plain dictionary for words. However, as we want to be able to redefine words, we'd be better served with something like this for a word definition:

```js
 word = {
    name: name,
    code: wordCode,
    immediate: immediate
};
```

The `name` is the word symbol in the word dictionary, `code` is the native (JavaScript) code for its implementation. It's actually an array of functions that operate on the state - the sections below will elaborate on the motivations for this design.

An `immediate` word means that it gets executed during compile time, for example `(`, `"`, `;`.

and the Forth dictionary is defined as a list with two operations: 
- `findWord` that looks for first match of word name from start to finish
- `addWord` that **unshifts** (prepends) the word to the dictionary

### The State

Every word operates on a **state**. The Forth execution state is defined by several primitives (at least until we get to compilation and conditionals):
- stack
- return stack
- dictionary
- memory

> The complete implementation also contained a jump stack, parser state and several addresses used by the compile mode.

### Better interpreter

The Forth interpreter accepts a line of the input, which is broken down to **input tokens** (usually separated by whitespace), then attempts to evaluate every token. 

The state exposes a function called `interpretToken` that tries to either execute a word from the dictionary or try to push a new number into the stack. If it fails, we reproduce the token and append '?'

```javascript
interpretToken: function (token) {
    //When the interpreter finds a word, it looks the word up in the dictionary and tries to execute its code
    if (this.callWord(token)) {
        return true;
    }
    //If the word isn't found, the word is assumed to be a number and an attempt is made to convert it into a number and push it on the stack;
    const parsed = parseInt(token);
    if (isNaN(parsed)) {
        console.log(token + ' ?');
        return false;
    } else {
        this.stack.push(parsed); //push the new token
    }
    return true;
}
```

The code execution assumes the word's `code` is an array of JavaScript functions that operate on the `state` and calls them in sequence.

```javascript
 executeWord: function (word) {
    if (!Array.isArray(word.code)) {
        console.log('Unexpected format of code for word ' + word + '!');
    }
    this.currentExecutingWord = word;
    let addr = 0;
    while (addr < word.code.length) {
        this.currentAddress = addr;
        word.code[addr](this);
    }
 }
```

#### Words as functions

This leads us into the structure we're going to need to use for the built-in words. We have native words

An example of a built-in native word DUP that duplicates the top item from the stack:

```javascript
state.addWord('+', (s) => {
    state.push(state.pop() + state.pop())
});
state.addWord('dup', (s) => {
    let x = state.pop();
    state.push(x);
    state.push(x);
});
```

There are also words that cause side effects or touch the interpreter internals:

```javascript
state.addWord('.', (s) => {
    let value = state.pop();
    if (value === undefined) {
        return;
    }
    process.stdout.write(value.toString());
    process.stdout.write(' ');
});
state.addWord('words', state => {
    let seenWords = new Set();
    for (let word of state.dictionary.dictionary) {
        if (word.name !== '' && !seenWords.has(word.name)) {
            seenWords.add(word.name);
            print(word.name + ' ');
        }
    }
});
```

#### Operators

We can define the "operators" the same way - but the Forth magic means that they are just regular functions that operate on the stack again!

```javascript
state.addWord('=', (state) => {
    state.push(booleanToForthFlag(state.pop() == state.pop()));
});
state.addWord('>', (state) => {
    state.push(booleanToForthFlag(state.pop() < state.pop()));
});
state.addWord('invert', state => state.push(~state.pop()));

...
function booleanToForthFlag(boolean) {
    return boolean ? -1 : 0;
}
```

### Defining words in Forth

Many of Forth implementations define some basic words in the native code and then define the new ones ("the standard library") in Forth itself.

For example, we could define `2DROP` that pops 2 items off the stack as:

```javascript
state.pop();
state.pop();
```

but since we already have the word `DUP` we could define it as 

```forth
    : 2dup ( n1 n2 -- n1 n2 n1 n2 ) over over ;
```

If we get some kind of compiler going, we could avoid implementing a significant portion of Forth library in JavaScript and just *borrow* their code from [reference websites such as OLPC wiki](http://wiki.laptop.org/go/Forth_stack_operators).

#### Execution token

We represent a "function pointer" with **execution token**, which in jsforth is just the same object we stored in the dictionary using `addWord` earlier, so we fetch it by `findWord`.

```javascript
const word = this.dictionary.findWord(name);

getExecutionToken: function (name) {
    return this.dictionary.findWord(name);
},

...

// Forth ' word - get execution token
state.addWord('\'', state => {
    let nextWord = state.getNextInputWord();
    let xt = state.getExecutionToken(nextWord);
    if (xt !== undefined) {
        state.push(xt);
    }
    });
```

#### Compiling the words

In the first step we want to define a new interpreter mode - **compile mode**. We enter the compile mode using the `:` word, which remembers the symbol name, using our example as `2dup`.

Let's feed every token we encounter while in compile mode to a new function called `compileToken`, which has a similar structure to `evaluateToken` mentioned earlier.

We either **encounter a number**, which we compile into a function that pushes it to the stack.
For example this word `: pushfivefour 5 4 ;` should push `5` and `4` **when executed**, it looks somewhat like this:

```javascript
const parsed = parseInt(token);
if (!isNaN(parsed))
    this.compileNextCall(state => state.push(parsed));
else {
    console.log(token + ' ?');
    return false;
} 
```

Or we **encounter a symbol**, and we attempt to fetch its *execution token* and append it to the currently compiled function body. It can also be an immediate word that has effect in the compile mode such as `if` and comments, which we call directly. 

```javascript
const word = this.dictionary.findWord(token);
if (word !== undefined) {
    if (word.immediate) {
        //execute immediate words
        this.executeWord(word);
    } else {
        // compile a definition for this word
        let xt = this.getExecutionToken(token);
        // this.compileNextCall(state=>state.executeWord(xt));
        this.compileNextCall(word.code);
    }
    return true;
}
```
> Please note that Forth gets quite flexible by allowing words to check whether they are executing within compile context and act accordingly. For example the `."` word prints the constant it encloses in the interpreter mode, but defers the printing until execution during the compile mode.

The helper function `compileNextCall` basically it copy-pastes or *inlines* the target word code into the compiled word code. It also does some address trickery to support jump targets allowing loops to work.

For example, if we wanted to define `4dup` in terms of `2dup`, we would copy-paste the execution token of `2dup`, which, as defined by `dup dup` is actually twice a call to execution token of `dup`.

#### Word redefinition

This approach combined with the list-like structure of the `jsforth` dictionary also allows word redefinition without impacting the words that already use the previous iteration of the redefined word. An example shows it best:

```forth
: greet ." hi" ;
: greet_longer greet ."  there" ;
: greet ." bonjour" ;
greet_longer
```

prints out `hi there` and not `bonjour there` as in most of the other languages.

> It also allows us fun things such as redefining `1` with `2` - `: 1 2 ;  1 .` would print out 2

## Testing the interpreter

I've used a custom test case format - that starts with Forth code to execute, then `<-` and the expected output.

```
# arithmetics
1 2 + . <- 3
1 2 - . <- -1
3 4 * . <- 12
10 5 / . <- 2
10 4 / . <- 2
```

[A Python script](https://github.com/jborza/jsforth/blob/master/test.py) executes the jsforth interpreter for each line and asserts that the actual output matches the expected output.

The full list of [test cases](https://github.com/jborza/jsforth/blob/master/testcases) lives in the repository as well.

## The code

See [the repository on GitHub](https://github.com/jborza/jsforth).

## What's next?

We still need variables, loops and conditionals in order to make useful programs.