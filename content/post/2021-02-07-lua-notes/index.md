---
layout: post
title:  "Notes from Programming in Lua"
date:   2021-02-07 14:00:00 +0200
categories: languages
tags: [lua]
image: 2021-02-07-lua-logo.gif
published: true
---

## Notes from Programming in Lua

See the source book [Programming in Lua](https://www.lua.org/pil/contents.html) targeted at Lua 5.0.

Here are my notes in case I need to come back to it. I'll mostly note the differences to Python as that's what I'm used to these days.

### Chunks

Every piece of code is a *chunk*
Semicolons may optionally follow statements

This is valid, but ugly:

```lua
 a = 1   b = a*2
```

### Global variables

Don't need declaration, just assign a value to create it.

```lua
print(b)  --> nil
b = 10
print(b)  --> 10
```

### Lexical conventions

**Case-sensitive**

#### Identifiers

`A-Z a-z 0-9 _`, must not start with a digit

#### Comments

Single line: `--` double hypen until the end of line
Multi line: `--[[` until a matching `]]

### Types

Eight basic types in Lua: `nil, boolean, number, string, userdata, function, thread` and `table`

#### Strings
Strings in double quotes: "a string"

**Literal strings** can be defined with double square brackets [[ ... ]] - also multiline

automatic conversions between numbers and strings
Any numeric operation applied to a string tries to convert the string to a number:

```lua
print("10" + 1)           --> 11
print("10 + 1")           --> 10 + 1
print("hello" + 1)        -- ERROR (cannot convert "hello")
```

Conversely, whenever it finds a number where it expects a string, Lua converts the number to a string:

```lua
print(10 .. 20)        --> 1020
```

A comparison like 10 == "10" is always false, because 10 is a number and "10" is a string. If you need to convert a string to a number explicitly, you can use the function tonumber, which returns nil if the string does not denote a proper number.

#### Numbers

Double-precision floating point numbers, no integer type

#### Tables

Table type: {} 
Associative array

table fields evaluate to nil if not initialized

Dump table:

See https://stackoverflow.com/a/27028488

```lua
function dump(o)
   if type(o) == 'table' then
      local s = '{ '
      for k,v in pairs(o) do
         if type(k) ~= 'number' then k = '"'..k..'"' end
         s = s .. '['..k..'] = ' .. dump(v) .. ','
      end
      return s .. '} '
   else
      return tostring(o)
   end
end
```

Because numbers and strings are different types, t[0] and t["0"] are different locations

#### Userdata 

Arbitrary C data, mostly used with C API

#### Arrays

Not first-class, typically implemented indexing tables with integers.  
**Customary to start arrays with index 1**

Can be initialized as

```lua
squares = {1,4,9,16,25}
-> { [1] = 1,[2] = 4,[3] = 9,[4] = 16,[5] = 25}
```

#### Functions

first-class values - can be stored in variables, passed as arguments, etc

### Expressions

#### Arithmetic operators

### Relational operators

` < > <= >= == ~=`

> (!) inequality operator is `~=`

alphabetical order for strings: `"2" > "15"`

### Logical operators

`and or not`
`false` and `nil` are false, everything else is true

### Concatenation

String concatenation: `..`
Auto-converts numbers to strings
Cannot concatenate booleans or nils

### Precendence

See https://www.lua.org/pil/3.5.html

### Table constructors

Can initialize arrays (sequences/lists) by passing values (**list-style constructor**)

```lua
days = {"Monday", "Tuesday", "Wednesday"}
print(days[2]) --> Tuesday
```

Can initialize with keys (**record-style constructor**):

```lua
w = {x=0, y=0, label="console"}
--> { ["y"] = 0,["label"] = console,["x"] = 0,}
```

We can use tables to implement linked lists

```lua
list = nil
for line in io.lines() do
    list = {next=list, value=line}
end
```

**Trailing comma is optional** - `a = {2,3,4,}`

### Assignments



### Multiple assignment

```lua
x = 3
a, b = 10, 2*x
```

Lua **adjusts number of values to the number of variables** - extra variables receive nil, extra values get discarded

Multiple assignments are useful to return multiple values from a function

```lua
a, b = f()
```


### Local variables and blocks

```lua
    x = 10
    local i = 1        -- local to the chunk
    
    while i<=x do
      local x = i*2    -- local to the while body
      print(x)         --> 2, 4, 6, 8, ...
      i = i + 1
    end
    
    if i > 20 then
      local x          -- local to the "then" body
      x = 20
      print(x + 2)
    else
      print(x)         --> 10  (the global one)
    end
    
    print(x)           --> 10  (the global one)
```

**It is good programming style to use local variables whenever possible.**

Local variables have the scope limited to the block where they are declared.

Local variables can be initialized with a global variable:

```lua
local foo = foo --local foo initialized with the value of global foo
```
Blocks can be explicitly delimited with `do` ... `end`

### Control structures

`if while repeat for`

All have explicit terminators
- `if` ... `end`
- `for` ... `end`
- `while` ... `end`
- `repeat` ... `until`

```lua
while exp do block end
repeat block until exp
if exp then block {elseif exp then block} [else block] end
```

`repeat` ... `until` similar to `do` ... `while` in C (executed at least once)

#### for

**Numeric for** vs **generic for**

Numeric:

```lua
for var=from,to,increment do
    ...
end
```

to is **inclusive**: 
**step** defaults to 1

**Generic for**
Traverse all values returned by iterator function

```lua
days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
for i,v in ipairs(days) do print(v) end --> Values
for i,v in ipairs(days) do print(i) end --> 1,2,3,4,5,6,7
```

Standard libraries provide iterators - line of files, pairs in table, words of a string

## Functions

## Example

```lua
-- add all elements of array `a'
function add (a)
    local sum = 0
    for i,v in ipairs(a) do
    sum = sum + v
    end
    return sum
end
```

### Multiple results

See also `table.unpack` that returns all elements from an array

```lua
f = string.find
a = {"hello", "ll"}
f(table.unpack(a))
--is the same as
string.find("hello", "ll")
```

### Variable number of arguments

Define parameter list as `...`.
When the function is called, arguments collected in a single table named `{...}`.

```lua
function sum(...)
  local total = 0
  for i,v in ipairs({...}) do
    total = total + v
  end
  return total
end
```

### Named arguments

Parameter passing is positional, but we can achieve this with tables as parameters:

```lua
function rename (arg)
    return os.rename(arg.old, arg.new)
end
...
rename{old="temp.lua", new="temp1.lua"}
```

### Closures
When a fuciton is enclosed in another function, it has full access to local variables from the enclosing function (lexical scoping)

## Package management

**LuaRocks** - usage:

```
luarocks install luafilesystem --local
```

### Penlight

Set of utility modules - input data handling, functional programming, OS path management: https://github.com/lunarmodules/Penlight