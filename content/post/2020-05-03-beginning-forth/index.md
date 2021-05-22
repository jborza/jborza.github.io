---
layout: post
title:  "Writing a Forth interpreter - part 1"
date:   2020-05-03 20:00:00 +0200
categories: interpreters
tags: [forth, javascript, interpreters]
image: forth1.png
---

## Forth the language

Forth is a funny language. One of the so-called stack languages, it doesn't really care about types, isn't functional or object-oriented. It also has very easy syntax - identifiers (called *words*) are separated by whitespace. 

Forth is often suggested as a good first language to wannabe interpreter writers, so I accepted the challenge.

## Stack-based? 

Almost everything in Forth has to do with the stack. Most of the words push, pop or do both operations on the stack. All non-words (numbers) are pushed into the stack.

A simple program, such as:

```
1 2 + .
```

- pushes 1 into the stack
- pushes 2 into the stack
- executes the `+` word, which takes two numbers from the stack (leaving the stack empty), adds them together yielding 1+2=3 and pushing the result (3) to the stack
- executes the `.` word, which takes one number from the stack and prints it

# The first steps - arithmetic and printing

I originally started with an easy arithmetic + printing interpreter, which could handle expressions such as 

``` forth
1 2 +
3 4 5 + + .
3 1 - .
```

One can get to this state simply by implementing an evaluate loop while reading the standard input:

``` javascript
stdin.addListener("data", function (line) {
        let trimmedLine = line.toString().trim();
        state.evaluateLine(trimmedLine);
    });
```

and having a state object that holds the stack, word dictionary:

``` javascript
function state(){
    return {
        stack: [],
        words: {},
```

and the evaluation function that looks up the words. Let's assume the words are JavaScript functions operating on the state.

``` javascript
        evaluateLine: function(line){
            let tokens = line.split(' ');
            for(let token of tokens)
                if(!evaluateToken(token))
                    break;
        },
        evaluateToken(token){
            //execute the word if in dictionary
            if (words[token] !== undefined){
                words[token](this);
                return true;
            }
            //interpret as number otherwise
            const parsed = parseInt(token);
            if (isNaN(parsed)) {
                //not a number, complain
                console.log(token + ' ?');
                return false;
            } else {
                //push the new token into the stack
                this.stack.push(parsed);
                return true;
            }
        }
```

Now we need the built-in word definitions. 

``` javascript
        initializeBuiltinWords: function(){
            this.words['+'] = state => state.stack.push(state.stack.pop() + state.stack.pop();
            this.words['-'] = state => {
                let b = state.stack.pop();
                let a = state.stack.pop();
                state.stack.push(a - b);
            }
            ...
            this.words['.'] = state => {
                    let value = state.stack.pop();
                    process.stdout.write(value);
                    process.stdout.write(' ');
            }
        }           
    }
}
```