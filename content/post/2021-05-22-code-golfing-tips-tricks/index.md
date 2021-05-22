---

title: "Code golfing tips and tricks"
date: 2021-05-22 09:00:00 +02:00
tags: [csharp, codegolf]
---

> This is a companion article to the [4-in-1 game for taskbar]({{<ref "2021-01-29-game-taskbar">}}) post, which has four playable games for the Windows taskbar in **3727 bytes** of code describing the techniques of code size reduction.

## Table of contents:
- [Shorter identifiers](#shorter-identifiers)
- [Skipping whitespace](#skipping-whitespace)
- [Code / identifier reuse](#code--identifier-reuse)
- [Code (re)organizing](#code-reorganizing)
- [var vs type names](#var-vs-type-names)
 (#dont-use-var-when-using-array-initializer)
- [Conditionals](#conditionals)
- [Miscellaneous aka cheap tricks](#miscellaneous-aka-cheap-tricks)

Here's a bag of tricks:

> DISCLAIMER: Please don't use the following techniques in production code, it will make your colleagues unhappy.

## Shorter identifiers

### Single character identifiers are your friends

There are 53 valid single character identifiers:
	
```csharp
ABCDEFGHIJKLMNOPQRSTVWXYZ
abcdefghijklmnopqrstvwxyz
_
```

**Characters saved:** varies
> Tip #1: underscore is your friend

> Tip #2: The readers will likely appreciate you mixing l and I

### Type aliases:

I created aliases for some commonly used types, e.g.

```csharp   
	Brushes.Black
	Brushes.Red
	Brushes.Red
	Brushes.White

	using B=System.Drawing.Brushes;
	B.Black
	B.Red
	B.Red
	B.White
```

**Characters saved:** varies, depending on the length of the fully qualified type

Other example: 

```csharp
	using P=System.Drawing.Point;
```

### using static for Math

The [using static](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-static) directive allowed savings for multiple repetitions of static Math methods such as Min, Max.

Example:

```csharp
	spd=Max(1,Min(spd+dx,9));
	spd=Math.Max(1,Math.Min(spd+dx,9))
```

**Characters saved:** some, starting when Math methods used more than 5 times. Compare the length of the following:

```
using static System.Math;
Math.Math.Math.Math.Math.
```

### Interface or DllImport method argument names don't matter

```csharp
[DllImport("user32.dll")]
static extern bool RegisterHotKey(IntPtr h,int i,int f,int v);

vs

[DllImport("user32.dll")]
static extern bool RegisterHotKey(IntPtr hWnd, int id, int fsModifiers, int vk);
```

**Characters saved**: significant for long parameters

## Skipping whitespace

### Variables of the same type can be declared on one line

```csharp
int L=-1,R=1,U=3,D=4,_=5,W=16,H=14;

vs

int L=-1;int R=1;int U=3;int D=4;int _=5;int W=16;int H=14;
```

**Characters saved:** 4 for every sequence of `int` and a whitespace

### Skip whitespace in class declaration

	class A:ApplicationContext,IMessageFilter{

### Skip whitespace in some variable declarations

 C# doesn't require a whitespace between a type and the identifier when they are already separated by square or angled brackets - arrays or generics.

```
	int[][]M;
	List<P>snake;
```
> Note: Doesn't work in regular cases, such as `int M;`


### Skip whitespace after parentheses

```csharp
	if(h.X>W||h.X<0||h.Y<0||h.Y>W)mode=OVR;
```

**Characters saved:** 1

> Note: It may make more sense to squash all whitespace with a separate pass instead of doing this by hand.

## Code / identifier reuse

### Reuse variables for different purposes 

If you have a nice `List<Point>` used for the body of the snake, why not reuse it as a container for blocks in the block-breaking part of the game?

Also, I reused `f` as the food position in the snake game and the ball position in the breakout game.

### Using a global variable for a loop variable

You could define `int i,j,k` on the class level and then skip declaring loop variables, such as `int i` in every `for` loop.

```csharp
	int i;
	for(i=0;i<9;i++)
	for(i=0;i<9;i++)
	for(i=0;i<9;i++)

vs:

	for(int i=0;i<9;i++)
	for(int i=0;i<9;i++)
	for(int i=0;i<9;i++)
```

**Characters saved:** Almost always

> Beware: Be careful of overwriting the loop variable in nested loops or loops that span over method calls.

### Shadowing global variables with locals when necessary

Useful when you're running out of 1-character identifiers - but less likely as there's a lot of them.

## Code (re)organizing

### Extracting methods

Pays off when the same bit of functionality is repeated and the method 

```csharp
Action<int,Keys>E=(k,K)=>RegisterHotKey(IntPtr.Zero,k,0,(int)K);
E(L,Keys.Left);
E(R,Keys.Right);

vs

RegisterHotKey(IntPtr.Zero,L,0,(int)Keys.Left);
RegisterHotKey(IntPtr.Zero,k,0,(int)Keys.Right);
```

or 
```csharp
filling out a 1 px rectangle:
Action<Brush,int,int> F=(b,x,y)=>g.FillRectangle(b,x,y,1,1);
F(Brushes.Black,x,y)
F(Brushes.Red,p.x,p.y)

vs 

g.FillRectangle(Brushes.Black,x,y,1,1)
g.FillRectangle(Brushes.Red,x,y,1,1)
```

### Inlining methods 

Inverse strategy to extracting - it makes sense to inline the method body if it only gets called once.

```csharp
void L(){code;code;code;}
vs
code;code;code;
```

**Character savings:** 10 for void parameterless methods

### Extract numerical constants
	
In some cases, extracting a constant that is used repeatedly saves space. 

If you are going to use -1 in your code 6 times, that's 12 characters
However, if you add one more int declaration as `L=-1,`, then using `L` 6 times requires 10 characters + 5 for declaration

Compare:

```csharp 
-1-1-1-1-1-1
L=-1,LLLLLL

and 

123123123
N=123,NN
```

**Characters saved:**  Starts to pay off at
- 6 repetitions of two-digit constant
- 3 repetitions of three-digit constant

> Tip: You can use Visual Studio's Find All References commands for constants, it calculates number of occurrences

### Don't declare constants for a single digit int

It always results in a net loss of characters, readability be damned. Refactoring or changing the size of something is a pain, though.

### Avoid declaring variables at all

If you only need to name an expression and later use it once, then it does not need a name and can be inlined.

## var vs type names

### var instead of full type name for locals

In some cases `var` is shorter to type than the full type name, for example:

```csharp
var I=new int[W];

vs

int[] I=new int[W];
```

**Characters saved:** Length of the type name - 3 

### Don't use var when using array initializer

Example:

```
	string[] games={"BRK","SNK","CRS","ARK"};
	var games=new string[]{"BRK,"SNK","CRS","ARK"}
```

## Conditionals

### Conditionals - if vs switch

Sometimes a sequence of `if` statements can be shorter than a corresponding switch statement, as we have to include `break` statements in C#:

```csharp
if(k==U){dy=-1;dx=0;}
if(k==D){dy=1;dx=0;}
if(k==L){dx=-1;dy=0;}
if(k==R){dx=1;dy=0;}

vs

switch(k){
case U:dy=-1;dx=0;break;
case D:dy=1;dx=0;break;
case L:dy=-1;dx=0;break;
case R:dy=1;dx=0;break;
}
```

### Ternary operator vs `if` in an assignment

```csharp
	N=y<6?MkR():new int[W];
	if(y<6)N=MkR();else N=new int[W];

	x=b?1:2;
	if(b)x=1;else x=2;
```

**Characters saved:** 10, depending on length of the target variable name as it is spelled out only once in a ternary.

### Use object initializers - you save 1 character per property initialized

```csharp
Q=new Timer(){Interval=W};

vs

Q=new Timer();Q.Interval=W;
```

**Characters saved:** 1 per every property initialized

## Miscellaneous aka cheap tricks

### Casting an int constant to the enum

This helps with almost all enum values with long names. For most enums, if the Enum value is longer than 4 characters, go for it.

```csharp
g.SmoothingMode=(System.Drawing.Drawing2D.SmoothingMode)4;
F=new Font(c.Families[0],5,(GraphicsUnit)5);

vs

g.SmoothingMode=System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
F=new Font(c.Families[0],5,GraphicsUnit.Pixel);
```

**Characters saved:** Length of the enum value name - 2 - (digits of the int value)

> Note: It also worked with IntPtr: IntPtr.Zero vs (IntPtr)0

### Use operators to your advantage

For example, adding `Size` to a point is easier with the `+` operator of `Point` as it's already built into the framework:

```csharp
	var dst=P.Add(snake[0],new Size(dx,dy));
	var dst=snake[0]+new Size(dx,dy);
```

### Drawing 1 rectangle vs 2 lines

Example: Vertical walls in the brick-breaking mode:
	
```csharp
	g.DrawRectangle(Pens.Blue,0.5f,-1,15,18);
	vs
	g.DrawLine(Pens.Blue,0,0,0,W);
	g.DrawLine(Pens.Blue,15,0,15,W);
```

Characters saved: 22

> Note: If you want to align GDI+ DrawRectangle with DrawLine, you need to shift it by 0.5f pixels

### Pick colors with shorter names

`Brushes.Red` is shorter than `Brushes.Green`.
