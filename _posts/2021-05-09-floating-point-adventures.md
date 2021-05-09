---
layout: post
published: true
categories: languages
date:   2021-05-09 23:00:00 +0200
title: "Fun with floating-point assembly (in RISC-V and x64)"
---

# Fun with floating-point assembly (in RISC-V and x64)

There was a fun little exercise in an old Fortran book that involved approximating a cube root using the Newton method to a specified accuracy. I've implemented this in multiple high-level languages and then moved on to two different assembly versions - one targeting the **RISC-V** instruction set, another the ubiquitous **x64 with SSE2** extensions.

All of the samples below calculate a **cube root of 27** (or of the number from the standard input) and print the result to the standard output.

## Python pseudocode

The original algorithm from the book in pseudocode:

```fortran
1: read A,e
2: X2 = A
3: X1 = X2  
4: U = 1/3 * (A / X1^2 - X1)
5: X2 = X1+U
6: if abs(U) < epsilon, go to 7, else go to 3
7: X2 contains cube root of A
```

Transferring that to a FORTRAN implementation (using an ancient FORTRAN 66 standard) is straightforward:

```fortran
C  CUBE ROOT CALCULATION
    1 FORMAT (F6.3)
      READ(5,1)A
      X2=A
    4 X1=X2
      U=(A/(X1*X1)-X1)/3.0
      X2=U+X1
      IF(ABS(U)-0.001)9,4,4
    9 WRITE(6,1)X2
      STOP
      END
```

For those of you that prefer a bit more modern languages, there's also a Python implementation

```python
def cube(a):
    epsilon = 0.001
    x2 = a
    u = sys.maxsize
    while abs(u) >= epsilon:
        x1 = x2
        u = (a/(x1*x1) - x1 ) / 3.0
        x2 = x1 + u
        print(x2)
    return x2
```

## RISC-V assembly:

Now how would we write this in RISCV assembly? A most straightforward way is to utilize as many registers as we can.

Compile with: (if you save the source as cube.s):

```bash
gcc -no-pie -o cube cube.s
```

```s
# cube root approximation
.option nopic
.text
.section .rodata
.LC0:
    .string "%f\n"
.text
.globl main
.type main, @function

main:
#reserve stack space
addi sp, sp, -64

# input number in a0, epsilon in a1
li a0, 0x41d80000 # 27
li a1, 0x3a83126f # 0.001

# store parameters on stack
sw a0, (sp)
sw a1, -4(sp)

# load parameters into floating point registers

# variables: a,   x1,  x2,  u,   epsilon
# registers: fa0, fa1, fa2, fa3, fa7
# constants: ft3 = 3.0

flw fa0, (sp)  	#a
flw fa7, -4(sp) #epsilon
li t0, 0x40400000 # 3.0
sw t0, -4(sp)
flw ft3, -4(sp) # 3.0

#2: x2 = a
flw fa2, (sp)	# x2
loop: 
#3: x1 = x2
fsw fa2, -8(sp) 
flw fa1, -8(sp)
#4: U = (a/(x1*x1) - x1 ) / 3.0f

fmul.s fs0, fa1, fa1 # x1*x1
fdiv.s fs1, fa0, fs0 # a/(x1^2)
fsub.s fs2, fs1, fa1 # (a/(x1*x1)) - x1
fdiv.s fa3, fs2, ft3 # u =(a/(x1*x1)) - x1) / 3.0

#5: x2 = x1 + u
fadd.s fa2, fa1, fa3  #x2 = x1 + u

#6: if abs(u) < epsilon, go to 7, else go to 3
fabs.s fs3, fa3 # we can also overwrite u with abs(u)

fle.s t0, fs3, fa7 # t0 will be 1 if u < epsilon ?

# go to 3
beqz t0, loop

#the result is stored at fa2
#print it out
fcvt.d.s fa2,fa2
fmv.x.d a1,fa2
lui a5,%hi(.LC0)
addi a0,a5,%lo(.LC0)
call printf
addi sp, sp, 64
ret
```

## x64/SSE assembly:

I've preferred the Intel syntax and NASM for the x64 version. You'll also need a 64-bit processor capable of the SSE2 instruction set. I'm also using only the floating-point registers for temporary variables instead of the stack.

Compile with: 
```
nasm -f elf64 print-float.s && gcc -no-pie -o print-float print-float.o
```

```nasm
global main
extern printf

section .data
    string db `%f\n`, 0       ; our format string
    num dq 27.0                ; the value to calculate root from
    eps dq 0.001              ; epsilon
    three dq 3.0              ; constant 3.0

section .text

;xmm10 to xmm15 are constants and variables
main:
    sub rsp, 8              ; reserve stack space
    
    mov rdi, string         ; load format string for printf
    mov rax, 1              ; tell printf we use 1 SSE register as argument

    movq xmm15, qword [num]   ; load number from data section to SSE register
    movq xmm14, qword [eps] 
    movq xmm13, qword [three]

    movq xmm12, xmm15   ;   2: x2 = a

loop:

    movq xmm11, xmm12   ;   3: x1 = x2

    movq xmm1, xmm11    ;   4: U = (a/(x1*x1) - x1 ) / 3.0f decomposed 
    mulsd xmm1, xmm1    ;  x1*x1
    movq xmm0, xmm15    ; a -> xmm0
    divsd xmm0, xmm1    ; a / x1^2 -> xmm0
    subsd xmm0, xmm11   ; (a/(x1*x1)) - x1 -> xmm0
    divsd xmm0, xmm13   ; u =(a/(x1*x1)) - x1) / 3.0
    movsd xmm10, xmm0   ; u (xmm10)

    addsd xmm0, xmm11   ;   5: x2 = x1 + u
    movsd xmm12, xmm0
;   6: if abs(u) < epsilon, go to 7, else go to 3
    psllq xmm10, 1      ; abs(u): get rid of sign bit on xmm10 
    psrlq xmm10, 1
    ucomisd xmm10, xmm14 ; compare abs(u) with epsilon
    jae loop            ; jump if above or equal to step 3

    movq xmm0, xmm12        ; the result x2 is at xmm12, move to xmm0 for printf
    mov rdi, string         ; load format string for printf
    mov rax, 1              ; tell printf we use 1 SSE register as argument
    call printf             ; 

    add rsp, 8
    mov eax, 0x60
    xor edi, edi
    syscall
```

## What's different? 

The programs are basically the same length, however, the x64 SSE instructions are at a slight disadvantage as the `addsd/mulsd/...` instructions only have two operands, so the first source register is the same as the destination registers, requiring us to shuffle the registers slightly for the operations.

However, the x64 SSE instructions are capable of vectorization, so a smart compiler could generate code that operates on multiple numbers in parallel.

### Debugging floating point stuff in gdb:

A quick reminder of gdb commands useful in debugging these programs (instructions for x64, but should be similar enough for RISC-V):

- `layout asm` switches gdb into an assembly debugging layout displaying the code
- `b main` sets a breakpoint at the `main` entry point
- `si` steps over an instruction
- `info all-registers` shows all of the registers
- `i r xmm0` shows the contents of the `xmm0` register
- `p $xmm0.v2_double` shows the contentx of the `xmm0` register interpreted as a double precision floating point number
