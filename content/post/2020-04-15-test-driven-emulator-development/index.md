---
layout: post
title:  "Test-driven emulator development"
date:   2020-04-12 10:00:00 +0200
categories: emulation
tags: [riscv, emulation, 6502, testing]
image: tded.png
---

## Test-driven emulator development (TDED)

Test-driven development is a software development process where you write a test before writing a code that satisfies that test, then refactor and continuously validate that the requirements are still fulfilled.

How can we leverage this during an emulator development? Compared to traditional business or product software, the emulator/simulator targets an existing hardware platform, with a known specification. Usually test suites and reference implementations are available as well. 

## Testing in code as you develop

As the end users would expect the emulator to perform exactly (or similarly) to the target platform, you can .

There needs to be some infrastructure in place before the tests are useful though - I started with code that represented the machine state - registers, memory, and the main CPU loop (being able to read the next instruction), instruction handler and an instruction dispatcher (a [giant switch statement](https://github.com/jborza/emu6502/blob/master/cpu.c#L373) in the case of **emu6502**).


### Testing framework

Testing in code while exposing internal state is a good way to get started. You also get to program in machine code, **which is fun**, right? 

In **emu6502** I created a simple framework that expects machine code loaded in memory at the address `0x0`, starts the machine with all registers reset, allows stepping through instructions and provides assertion functions (for register values and memory). Printing the register contents and memory between steps is helpful as well during development.

For instance, this is a test for the 6502 INX instruction that increases the X register by one:

```c
void test_INX() {
	//initialize
	State6502 state = create_blank_state();
	state.x = 0xE1; //the initial value

	//arrange
	char program[] = { INX };
	memcpy(state.memory, program, sizeof(program));

	test_step(&state);

	assertX(&state, 0xE2); //initial value incremented by 1

	test_cleanup(&state);
}
```

A more complex example can be seen for testing the `LDX_ZP`, with a testing binary `{LDX_ZP, 0x03, 0x00, 0xAA}`.


This program loads a value to the X register from an address that comes as an argument (here it's `0x03`). `0x03` points to the fourth byte in the test binary, with a value of `0xAA`.

```c
void test_LDX_ZP() {
	State6502 state = create_blank_state();
	char program[] = { LDX_ZP, 0x03, 0x00, 0xAA }; //LDX $3; 
	memcpy(state.memory, program, sizeof(program));
	test_step(&state);
	assertX(&state, 0xAA);
}
```

### RISC-V

Writing RISC-V machine code by hand is very painful, and I didn't want to do that due to how instruction format works. In RV32 you can have several arguments (opcode, function, two source and one destination) packed into one 32-bit number, unlike the very nice single byte instructions of MOS 6502.

I've used the [RARS RISC-V Assembler and Simulator](https://github.com/TheThirdOne/rars) as a reference assembler and testing environment. I wrote the test code in RISC-V assembly and assembled it into a binary:

```
lui     x29, 0xfff80000
addi    x29,x29,0x0
```

Turns to

```
0x80000eb7
0x00008093
```

Using a very similar framework as with **emu6502** I was able to test some of the initial instructions, instruction formats and helper functions, for example the shamt (shift amount) operand from the SLL (logical shift left) instruction:

```c
// extract bits start..start+len from src
uint32_t bextr(uint32_t src, uint32_t start, uint32_t len) {
	return (src >> start) & ((1 << len) - 1);
}

// get the shift amount 
int32_t shamt(word value) {
	return bextr(value, 20, 6);
}

void test_shamt() {
	word instr = 0x00009f13; //slli x30, x1, 0
	assert_shamt(0x00009f13 /*slli x30, x1, 0*/, 0);
	assert_shamt(0x00109f13 /*slli x30, x1, 1*/, 1);
	assert_shamt(0x00709f13 /*slli x30, x1, 7*/, 7);
	assert_shamt(0x00e09f13 /*slli x30, x1, 14*/, 14);
	assert_shamt(0x01f09f13 /*slli x30, x1, 31*/, 31);
}

void assert_shamt(word instruction, int expected_shamt) {
	int actual_shamt = shamt(instruction);
	if (actual_shamt != expected_shamt) {
		printf("Unexpected shamt value: %d, expected %d", actual_shamt, expected_shamt);
		exit(1);
    }
}
```

Eventually this got too tedious to write by hand and it made more sense to use testing binaries.

## Testing with binaries

When you have a compiler handy, you can write the tests in assembly, compile them into binary and run. Loading a binary is a simple problem in C, just a couple of a standard library calls, then load them into the right place of the physical memory and set the program counter.

### Reporting test status from the binaries

The problem is letting your execution environment know **whether the test passed or failed** as you either need to peek into the internals of the emulated machine or use some kind of a system call. 

### 6502

There is no real system call on the MOS 6502 CPU, but one could use either the [interrupts](https://en.wikipedia.org/wiki/Interrupts_in_65xx_processors) or I/O facilities. See [Klaus Dormann's 6502 functional tests](https://github.com/Klaus2m5/6502_65C02_functional_tests) for a specific implementation. 

One could use the `BRK` instruction in the test for a "system call", providing the pass or fail value in the accumulator. See the following test case for the INX instruction (increment X).

```gas
; arrange
LDA #$48 ; set expected result 8 
STA $A0  ; save expected result to address 0xA0
LDX #$47 ; x = 7
; act
INX      ; x++
; assert
CPX $A0  ; compare X to the address 0xA0
BEQ pass ; jump to pass: label if previous comparison succeeded

fail:    ; fall through here otherwise
LDA #$0  ; test failure
BRK

pass:
lda #$1 ; test success
brk
```

### RISC-V

In the RISC-V platform we can use the `ecall` instruction, which does an "environment call" to the execution environment (operating system, hypervisor or, in our case, an emulator). The way the parameters are passed is implementation-specific, but in our case the environment is then supposed to pick up arguments from the registers `a7` (operation ID) and `a0` (first argument), which is the same way [RISC-V SBI](https://github.com/riscv/riscv-sbi-doc/blob/master/riscv-sbi.adoc) calling convention works.

I have reused the [RARS test suite](https://github.com/TheThirdOne/rars/tree/master/test/riscv-tests), which uses an environment call 93 with an argument of 0 (fail) or 42 (pass), and the ID of the failed test in the `gp` register.

```nasm
.text
 main:

test_3:
 li x1, 0x00000001  ; x1 = 1
 li x2, 0x00000001  ; x2 = 2
 add x30, x1, x2    ; x30 = x1 + x2
 li x29, 0x00000002 ; x29 = 2 ; x29 is the reference value
 li gp, 3           ;
 bne x30, x29, fail ; jump to fail: label if x29 != x30
                    ; that also means if x29 == x30, fall through to pass: or to the subsequent tests

pass:
 li a0, 42          ; arg1 = success
 li a7, 93          ; operation id = 93 (test result)
 ecall              ; call back to the emulator, terminating the test suite

fail:
 li a0, 0           ; arg1 = success
 li a7, 93          ; operation id = 93 (test result)
 ecall              ; call back to the emulator
```

It allows for a nice test chaining, see [tests for the `OR` instruction](https://github.com/jborza/emuriscv/blob/master/test/or.s)

#### Catching bugs

I eventually got lazy and stopped testing before (or) after developing a feature. It have also taught me to test what I develop, as I have discovered [a bug](https://github.com/jborza/emuriscv/commit/7d5a906844bf452a904b38977c3c4ab656250450) in the atomic add instruction way too late (during a failed Linux boot process). Somehow atomically adding -1 to 1 resulted in 2. 🤔

The bugfix was preceded by a new test to figure out what was going on:

```nasm
setup:
li a1, 8              ; initial value
li t0, 0x100          ; initial value address

;...

test_dec:
li a0, -1             ; addend
sw a1, 0(t0)          ; store initial value at 0x100
amoadd.w x1, a0, (t0) ; atomically do to 8-1 and store the result to 0x100
li x29, 7             ; expected value (8-1=7)
lw x30, 0(t0)         
bne x29, x30, fail    

; ... pass and fail labels as in the previous sample
```

The offending code was supposed to add value from `rs1` to value from `rs2`, store the result to `rs1` and store the first operand to `rd`. When `rs1` and `rd` were pointing to the same register, the value in `rs1` had been overwritten even before it was added to the value at `rs2`.

```diff
word address = get_rs1_value(state, instruction); 
word value = read_word(state, address); 
-set_rd_value(state, instruction, value); 
+word original_value = value; 
value = value + get_rs2_value(state, instruction); 
write_word(state, address, value); 
+set_rd_value(state, instruction, original_value); 
```

## Using existing testing frameworks

The most sane option. Usually there is a wealth of good testing frameworks available for the target architectures. I found this approach not as easy to start with, as one needs to adapt to the test framework convention

For RISC-V there's the official one at the [riscv-tests](https://github.com/riscv/riscv-tests) repository, adapted a bit more straightforward in the [RARS test suite](https://github.com/TheThirdOne/rars/tree/master/test/riscv-tests).

For 6502 there are a lot of test suites available at [6502.org](http://www.6502.org/tools/emu/) and [visual6502.org](http://visual6502.org/wiki/index.php?title=6502TestPrograms).

I eventually ended up adapting the existing RARS test suite and added a couple more tests. 

## Using a unit testing framework vs rolling your own

I would recommend using a real unit testing framework whenever possible - this should allow for much easier integration with your development environment and your continuous integration. 

However, in the hacker spirit, I was too lazy look into C testing frameworks and decided to [roll my own](https://github.com/jborza/emu6502/blob/master/test6502.c) in **emu6502**. 

This could be as easy as having an array of functions pointing to the test "suites" and executing them in the given order.

```c
typedef void fp();

//test suites for LDA, ORA, AND instructions
fp* tests_lda[] = { test_LDA_IMM, test_LDA_IMM_zero, test_LDA_ZP, test_LDA_ZPX, test_LDA_ZPX_wraparound, test_LDA_ABS, test_LDA_ABSX, test_LDA_ABSY, test_LDA_INDX, test_LDA_INDY, test_LDA_INDX_wraparound, test_LDA_INDY_wraparound };
fp* tests_ora[] = { test_ORA_IMM, test_ORA_ZP, test_ORA_ZPX, test_ORA_ABS, test_ORA_ABSX, test_ORA_ABSY, test_ORA_INDX, test_ORA_INDY, test_ORA_IMM_Z };
fp* tests_and[] = { test_AND_IMM, test_AND_ZP, test_AND_ZPX, test_AND_ABS, test_AND_ABSX, test_AND_ABSY, test_AND_INDX, test_AND_INDY, test_AND_IMM_Z };

//helper macro to invoke the test suite
#define RUN(suite) run_suite(suite, sizeof(suite)/sizeof(fp*))

//helper function to run all tests in the suite
void run_suite(fp * *suite, int size) {
	for (int i = 0; i < size; i++)
	{
		printf("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n");
		suite[i]();
	}
}

//test configuration's "main" function calls this
void run_tests() {
    RUN(tests_ora);
	RUN(tests_and);
	RUN(tests_lda);
}
```
