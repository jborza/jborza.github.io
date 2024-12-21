---
layout: post
title:  "RISC-V: from zero to Linux hero"
date:   2021-01-11 23:59:00 +0200
categories: linux
tags: [linux, risc-v, emulator]
image: #/assets/2020-01-04-chip8-vga-out.jpg
published: false
---

RISC-V: from zero to Linux hero

A friend told me about a cool new open-source instruction set architecture called RISC-V (pronounced risk-five). Coincidentally I've implemented a 6502 emulator a while before that, and I was in the right mood to look into a new architecture.

I started with reading the ISA and decided going with the rv32i is a good start. TODO expand on the extensions
turned out RARS has a nice test suite and after implementing the first couple of instructions (which? lui/li, bne, ecall)

note about how ecall is useful. Memory model was straightforward, I allocated some 64k of memory to go with the simulated CPU, slowly went through the tests, also wrote some new for other instructions.

a good thing to mimic would be fabrice bellard's tinyemu, which boots linux.

A quick look into the config file shows they load some kind of a bootloader - BBL and then the linux image. There are two versions - web and offline, the offline seems easier to learn from as it's not using networked streaming file system.

Looking at tinyemu's source, there seems to be a couple of steps required - loading a couple of initial 'bootloader-loader' instructions at 0x1000 and then the BBL at 0x80000000. 

But we've had flat memory only so far! So let's go and implement some kind of memory mapping.

Using a simple idea of memory ranges (from TinyEMU) we have a memory map, containing several memory ranges. So far the ranges only map to "physical memory", no I/O mappings. This "physical" memory is allocated from the host memory with malloc.

Luckily only the load/store instructions interact with memory, so they had to be updated to go through a mapping function that translates desired address to "physical" address.

The tests still seemed to pass, I did some more manual checks to see whether the data ended up in the physical address I expected it to.

Taking the bbl binary from JSLinux and trying to load it showed I still need to implement a couple of instructions (CSR part of the spec).

An easy way to start was just to have an array of 4096 word sized CSR registers and see what happens. 

That allowed me to go around several instructions deep into BBL and then it ended in the shutdown routine after around 460 instructions. Figuring out what the code is doing is much better with an assembly listing, so I produced one with objdump.

Eventually this wasn't enough as reading plain RISCV assembly is not very comfortable, so I looked around how could I intermix it with source code. It appears that gcc can embed debug information in the binary, and objdump can later use this information to intermix C and assembly code.

now having the C code we see that it ends in the shutdown routine, I quickly patched the emulator to display also the offset names from the assembly. This was a quick python script to generate C code to hardcode symbols and offsets, could be definitely handled dynamically on startup in C if this is useful, but I think there will be other debug capabilities eventually.


### HTIF console

As the code entered something called printm and eventually vsnprintf, it would be nice to have some kind of a console. HTIF console seems reasonably easy to implement, [link] https://lists.gnu.org/archive/html/qemu-devel/2018-02/msg05789.html

HTIF - host target interface, it's a communication mechanism for test hardware and jslinux happens to use it in initial stages of simulation as well.

It seems HTIF we need to implement HTIF read and write functions and some kind of memory mapping. 

Had to use jslinux riscv-pk patch to hardcode HTIF address as opposed to finding it in the elf file. 

Implementing HTIF from tinyemu - we only need the console write for the first attempt. 

Now we want HTIF to get discovered - going into riscv-pk/machine/

FDT description for several bits & pieces
https://www.sifive.com/blog/risc-v-qemu-part-1-privileged-isa-hifive1-virtio
https://patchwork.kernel.org/patch/10206433/

also learned quite too late it's possible to dump DTS with spike --dump-dts

Wasn't able to get the HTIF detection working, so I eventually added a couple of debug ecalls - int32, char and null terminated string. 
Finally with the last one I found out what was wrong.

It turned out the problem was a bit different - I was stripping the binary too much, keeping only the section .text (with code) and not the strings. Therefore all of the strcmp commands failed and also no debug messages worked.

So it's much better to use objcopy -O binary <input.elf> <output.bin>.

Then we can see some messages and also start adding more diagnostic messages to riscv-pk. Seems we were missing a cpu interrupt controller to discover the hart, then clint.

It really helps that we can print the fdt early in the boot process, so we can see what riscv-pk sees.


note: would be easier to load a binary dump

TODO write about: "relocation" trick
implementing M and A extensions
(M was stolen from tinyemu)

Turns out there is a SBI console in RISC-V linux: https://github.com/torvalds/linux/blob/master/arch/riscv/include/asm/sbi.h
so I could easily convert the "ecall" console patch into SBI console, which seems to be enabled as an 'earlycon': https://github.com/torvalds/linux/blob/master/drivers/tty/serial/earlycon-riscv-sbi.c

We're now able to get two lines from kernel: 
[    0.000000] Linux version 4.15.0-00051-g758d792057a2 (juraj@poo) (gcc version 9.2.0 (GCC)) #5 Tue Sep 24 20:16:16 CEST 2019
[    0.000000] bootconsole [early0] enabled


Enabling verbose logging shows it's dying in c0002a30 BUG_ON(mem_size == 0);  in the setup_arch function: https://github.com/torvalds/linux/blob/master/arch/riscv/kernel/setup.c

Next day I got some more time to start looking into the supervisor spec.
So far the only hack required was to actually jump to the MEPC vector on the MRET instruction.

Tree of interest is arch/riscv/
patched the kernel/setup.c to initialize the console even sooner, as it's bugging out on the memory size. printk debugging works nice so far. Linux build of the emulator would be nice, so I don't have to build the kernel on one box and copy to Windows box to run. Not much debugging inside the IDE at this stage is it's mostly guesswork and adding printk logs.

The problem seems to be in setup_vm during setting up the pages. 
When we get to setup_arch, it correctly reports a block starting at 0x80400000 (where Linux is loaded and 64 megs of memory should exist, but it also says )

[    0.000000] bootconsole [early0] enabled
[    0.000000] setup_vm registering early console
[    0.000000] setup_vm()
[    0.000000] setup_vm(): (physical_address) pa=80400000
[    0.000000] setup_vm(): va_pa_offset=3fc00000, pfn_base=80400
[    0.000000] PAGE_OFFSET=c0000000, PGDIR_SHIFT=22, PTRS_PER_PGD=400
…
[    0.000000] setup_bootmem():vmlinux_end = c028e624
[    0.000000] setup_bootmem():block base 0 size 0

Probably gets confused due to the relocation trick, so probably need to do THAT properly first. 

New hack: changed the riscv,kernel-start property from 0x80400000 to 0xc0000000

we get eventually to Linux detecting the memory, attempting to set up the pages (HOW?)

and later complaining about bad pages
page dumped because: nonzero _refcount

[    0.000000] Call Trace:
[    0.000000] [<(ptrval)>] walk_stackframe+0x0/0xf8
[    0.000000] [<(ptrval)>] show_stack+0x38/0x50
[    0.000000] [<(ptrval)>] dump_stack+0x2c/0x40
[    0.000000] [<(ptrval)>] bad_page+0xf0/0x124
[    0.000000] [<(ptrval)>] free_pages_check_bad+0x68/0x7c
[    0.000000] [<(ptrval)>] free_pcppages_bulk+0x134/0x304
[    0.000000] [<(ptrval)>] free_unref_page_commit.isra.0+0x94/0xbc
[    0.000000] [<(ptrval)>] free_unref_page+0x40/0x64
[    0.000000] [<(ptrval)>] __free_pages+0x28/0x48
[    0.000000] [<(ptrval)>] __free_pages_bootmem+0xa4/0xb8
[    0.000000] [<(ptrval)>] free_all_bootmem+0x1f8/0x298
[    0.000000] [<(ptrval)>] mem_init+0x30/0x4c
[    0.000000] [<(ptrval)>] start_kernel+0x238/0x3b0
[    0.000000] [<(ptrval)>] _sinittext+0x60/0x68

see linux/mm/page_alloc.c for  free_pages_check_bad / free_pages_check

    if (likely(page_expected_state(page, PAGE_FLAGS_CHECK_AT_FREE)))
        return 0;
suggests something to do with page flags. Also the more detailed reason from free_pages_check_bad helps:

    if (unlikely(page_ref_count(page) != 0))
        bad_reason = "nonzero _count";

What does page_ref_count check for? 

static inline int page_ref_count(struct page *page)
{
    return atomic_read(&page->_refcount);
}

So we see that there should be something somewhere within those pages. 

Spec says (section 4.3 of privileged spec):
SATP This register holds the physical page number (PPN) of the root page table, i.e., its supervisor physical address divided by 4 KiB;  an address space identifier (ASID), which facilitates address-translation fences on a per-address-space basis;  and the MODE field,  which selects the current address-translation scheme.

Seems like a good point to hook in the debugger to see when it gets written. 
Lesson learned - refactor properly, forgot again to refactor CSR writes through the function, so my conditional breakpoint never got hit.

Relocate symbol from disassembly sets up satp:
result in a2 is: 
Name	Value	Type
state.x[12]	0xc028c000	unsigned int
 
after srli: 0xc028c

after the or:
Name	Value	Type
state.x[12]	0x800c028c	unsigned int

trampoline page directory: 
Name	Value	Type
state.x[10]	0x800c001a	unsigned int

Setting CSR 180 to 800c001a
Second call (after "switch to kernel page tables"):
Setting CSR 0x180 to 0x800c028c

after clearing the 'mode' bit the address is revealed as pte_addr:0xc001a000
second time:
MODE:1 pte_addr:0xc028c000

So this is how it works:
head.s writes trampoline_pg_dir and swapper_pg_dir addresses to satp (in successive order)
https://github.com/jborza/riscv-linux/blob/758d792057a2c0276844bc88e790f3ddabfc43ae/arch/riscv/kernel/head.S#L82

emuriscv debug output:
Setting CSR 0x180 to 0x80080643
MODE:1 pte_addr:0x80643000

trampoline_pg_dir and swapper_pg_dir is later written to from setup.c/setup_vm
(swapper_pg_dir for the entire address range of 0xc0000000 - 0xffffffff)
https://github.com/jborza/riscv-linux/blob/758d792057a2c0276844bc88e790f3ddabfc43ae/arch/riscv/kernel/setup.c#L161

After this is done, when the address 0xc0000000 is addressed later in the "relocate" function , we should check if we're in the SV32 address translation mode, then look into 'satp' CSR register to see the address of the first page (should be pointing to swapper_pg_dir). 

So to actually implement it, we add a check for the memory mode into the get_memory_target(word address), if mode is SV32, we extract the address of the first page (0x80416000 in our example) 

int pte_addr = (satp & (((uint32_t)1 << PTE_ADDRESS_BITS) - 1)) << PG_SHIFT;

and read the value at the address, which seems to be 0x0?
Where exactly in the trampoline table is stuff?

trampoline_pg_dir[(PAGE_OFFSET >> PGDIR_SHIFT) % PTRS_PER_PGD] =
        pfn_pgd(PFN_DOWN(pa), prot);

[    0.000000] setup_vm(): trampoline_pg_dir[768] = (c0000000) 
(pa is pointing to 0xc0000000)

PAGE_OFFSET is defined as 


Two level page table. Code stolen from TinyEMU so far, see also RISCV privileged spec 
4.3.2 Virtual Address Translation Process

From <https://content.riscv.org/wp-content/uploads/2017/05/riscv-privileged-v1.10.pdf> 

Using the trampoline address doesn't work in this case as we reached into an empty (?) page directory entry attempting to read the next instruction pointed to by the pc register (804000b8) as we loaded kernel at 0x80400000.

As the trampoline page table (?) has a single entry at the index of 0xc0000000, we should a page fault and jump to stvec (with a value of 0xc00000b8). This should correctly resolve to a valid (swapper_pg_dir) directory entry. 

Without properly implemented page faults this is not really going to work. For this the memory system had to get rewritten a bit as there was no real way in Riscvemu to handle exceptions. 

It also looks like we need to keep track of the privilege modes.
Added "mode" to state.

Needed to do some digging on how supervisor mode is actually enabled.
The answer was quite hiding in the plain sight, 

Enter_supervisor_mode of bbl:

register uintptr_t a0 asm ("a0") = arg0;
register uintptr_t a1 asm ("a1") = arg1;
asm volatile ("mret" : : "r" (a0), "r" (a1));

Gets compiled into a mret instruction.

According to the specs (quote 3.2.2 privileged mode)
xRET instruction will pop the relevant lower-privilege interrupt enable and privilege mode stack.

static void handle_mret(RISCVCPUState *s)
{
int mpp, mpie;
mpp = (s->mstatus >> MSTATUS_MPP_SHIFT) & 3;
/* set the IE state to previous IE state */
mpie = (s->mstatus >> MSTATUS_MPIE_SHIFT) & 1;
s->mstatus = (s->mstatus & ~(1 << mpp)) |
(mpie << mpp);
/* set MPIE to 1 */
s->mstatus |= MSTATUS_MPIE;
/* set MPP to U */
s->mstatus &= ~MSTATUS_MPP;
set_priv(s, mpp);
s->pc = s->mepc;
}
(riscv_cpu.c)

The bare minimum necessary to continue was to extract the previous privilege and toggle it (in mret), then we properly switch into supervisor mode and can continue debugging the virtual memory :)

Now the code flows as follows:
BBL sets up linux address (0x8040000) in enter_supervisor_mode: 
write_csr(mepc, fn);
mret

This triggers supervisor mode, but still with bare addressing. Linux (riscv arch) .relocate function sets up the trampoline page directory and turns on sv32 addressing mode with a write to the satp register: (arc/riscv/kernel/head.S)

/*
 * Load trampoline page directory, which will cause us to trap to
 * stvec if VA != PA, or simply fall through if VA == PA
 */
la a0, trampoline_pg_dir
srl a0, a0, PAGE_SHIFT
or a0, a0, a1
sfence.vma
csrw satp, a0

This would attempt to decode address to trampoline_pg_dir (0x80415000). This address doesn't exist in sv32 though (as the page doesn't point anywhere, so we get a page fault.) This restores PC to 0xc00000b8, which should have pages set up around it. 

In an ideal world now an implementation following 



Somehow the _refcount error mysteriously disappeared
Should finally succeed with mapping to the physical address.
Stepping through the code:

On the first level, we read the PTE
Value of 0x201000cf
The physical address part of that is 0x80400000
Added virtual address offset virtual_address & vaddr_mask (value of 0xb8) yields a target physical address of 0x804000b8

This is looking very good, 



-------------

See mm_types.h

/*
             * Usage count, *USE WRAPPER FUNCTION* when manual
             * accounting. See page_ref.h
             */
            atomic_t _refcount;


This

We need to implement page faults and let them propagate all the way to interrupt the execution of the attempted instruction and correctly relocate to mtvec/stvec.
Also set up the flags, cause, program counter.
Detect if m or s mode. (how?)

The State structure gained a new flag (current privilege level), as the initial assumption that the SATP register was the only source of truth was wrong, as it's not used in the machine mode. Then the memory mechanism could tell that when we're in the supervisor mode and SATP is using the SV32 virtual memory mode and the address wasn't resolved correctly to trigger a page fault. Unfortunately there was also no way to propagate this all the way to the instruction handler.

In the end I needed to rewrite the functions interacting with memory to return a status code (success/exception) whenever a page fault was triggered. Then implement the translation mechanism according to SV32 part of the spec. 

Also there was an old bug in flattened device tree generator usage that prevented kernel bootargs from being correctly stored (and I wondered why they never got propagated).

The _refcount mystery

This allowed the boot process to progress further (TODO a gist link). For some reason I got plagued by a 
mysterious error.

[    0.000000] mm/page_alloc.c page_expected_state checking for page_ref_count of page cfa1f8a0, page_ref_count is 2, flags=0
[    0.000000] page_alloc.free_pages_check_bad page:cfa1f8a0 mapcount=-1 refcount=2 mapping=  (null) pages=-1868 pobjects=-12383
[    0.000000] BUG: Bad page state in process swapper  pfn:80fc5
[    0.000000] page:cfa1f8a0 count:2 mapcount:0 mapping:  (null) index:0x0
[    0.000000] flags: 0x40000000()
[    0.000000] raw: 40000000 00000000 00000000 ffffffff 00000002 cfa1f8b4 cfa1f8b4 00000000
[    0.000000] page dumped because: nonzero _refcount
[    0.000000] CPU: 0 PID: 0 Comm: swapper Not tainted 4.15.0emuriscv-gbee32fc2f-dirty #5
[    0.000000] Call Trace:
[    0.000000] [<(ptrval)>] walk_stackframe+0x0/0xfc
[    0.000000] [<(ptrval)>] show_stack+0x38/0x50
[    0.000000] [<(ptrval)>] dump_stack+0x2c/0x40
[    0.000000] [<(ptrval)>] bad_page+0x120/0x15c
[    0.000000] [<(ptrval)>] free_pages_check_bad+0x98/0xb0
[    0.000000] [<(ptrval)>] free_unref_page_prepare+0xc8/0x184
[    0.000000] [<(ptrval)>] free_unref_page+0x30/0x64
[    0.000000] [<(ptrval)>] __free_pages+0xb8/0xe0
[    0.000000] [<(ptrval)>] __free_pages_bootmem+0x294/0x2d4
[    0.000000] [<(ptrval)>] free_all_bootmem+0x208/0x2ac
[    0.000000] [<(ptrval)>] mem_init+0x30/0x4c
[    0.000000] [<(ptrval)>] start_kernel+0x258/0x3e4
[    0.000000] [<(ptrval)>] _sinittext+0x60/0x68
[    0.000000] Disabling lock debugging due to kernel taint

It seemed to be centered around _refcount property of the page structure (defined in mm_types.h). The source says it's the "Usage count" of the page. 

I ended up adding debug logs before (and later also after) every function in page_ref.h (TODO link). As we have lots of pages, I thought it made sense to monitor the first page, which generates the dump above. Called this one MAGIC_PAGE and for a lack of better options defined it as a constant in one of the kernel headers. 

Note: I think the better way to do it is to use the tracing system, but somehow never got it to work in my build. 


With this compiled in it the operations on the magic page look like this:
(initialization phase)
[    0.000000] ./include/linux/page_ref.h.init_page_count before: page=cfa1f8a0 refcount=0
[    0.000000] ./include/linux/page_ref.h.set_page_count before: page=cfa1f8a0 refcount=0
[    0.000000] ./include/linux/page_ref.h.set_page_count after: page=cfa1f8a0 refcount=1
[    0.000000] ./include/linux/page_ref.h.init_page_count after: page=cfa1f8a0 refcount=1
…
[    0.000000] Sorting __ex_table...
…
[    0.000000] __free_pages_boot_core, page 0xc3b8cce0
[    0.000000] ./include/linux/page_ref.h.set_page_count before: page=cfa1f8a0 refcount=1
[    0.000000] ./include/linux/page_ref.h.set_page_count after: page=cfa1f8a0 refcount=0
//now it's still OK, as freeing pages should decrease refcount from 1 to 0.
[    0.000000] __free_pages_boot_core, setting page 0xc3b8cce0 to refcounted
[    0.000000] mm/internal.hset_page_refcounted on page cfa1f8a0 to 1
[    0.000000] ./include/linux/page_ref.h.set_page_count before: page=cfa1f8a0 refcount=0
[    0.000000] ./include/linux/page_ref.h.set_page_count after: page=cfa1f8a0 refcount=1
//why is it going from 0 to 1 again in free_pages_boot_core?
[    0.000000] ./include/linux/page_ref.h.page_ref_dec_and_test before: page=cfa1f8a0 refcount=1
[    0.000000] ./include/linux/page_ref.h.page_ref_dec_and_test after: page=cfa1f8a0 refcount=2
// ok - this is really weird - why would a reference decrease go from 1 to 2? What is the parameter?

We can see in the stack trace 
[    0.000000] Call Trace:
[    0.000000] [<(ptrval)>] walk_stackframe+0x0/0xfc
[    0.000000] [<(ptrval)>] show_stack+0x38/0x50
[    0.000000] [<(ptrval)>] dump_stack+0x2c/0x40
[    0.000000] [<(ptrval)>] __free_pages+0x9c/0xe0
[    0.000000] [<(ptrval)>] __free_pages_bootmem+0x294/0x2d4
[    0.000000] [<(ptrval)>] free_all_bootmem+0x208/0x2ac

So apparently on an atomic decrement the _refcount goes from 1 to 2, huh?


Digging into the sources,
page_ref_dec_and_test() calls 
int ret = atomic_dec_and_test(&page->_refcount);
That is defined in arch/riscv/atomic.h as 
ATOMIC_OP(inc_and_test, inc, ==, 0, )
ATOMIC_OP(dec_and_test, dec, ==, 0, )

ATOMIC_OPS(dec, add, +, -1)

So we should be 'adding -1', why does it go from 1 to 2?

Let's write a quick test for amoadd adding +1 and -1:

setup:
li a1, 8 # initial value
li t0, 0x100 # initial value address

test_inc:
li a0, 1 # addend
sw a1, 0(t0) # store initial value at 0x100
amoadd.w x1, a0, (t0) # set 0x100 to 8+1
li x29, 9 #expected value
lw x30, 0(t0)
bne x29, x30, fail

test_dec:
li a0, -1 # addend
sw a1, 0(t0) # store initial value at 0x100
amoadd.w x1, a0, (t0) # set 0x100 to 8-1
li x29, 7 #expected value
lw x30, 0(t0)
bne x29, x30, fail

pass:
	li a0, 42
	li a7, 93
	ecall
fail:
	li a0, 0
	li a7, 93
	ecall

The above can be compiled into an object file and extract the binary part with 
riscv32-unknown-elf-gcc -c amoadd.s 
riscv32-unknown-elf-objcopy -O binary amoadd.o amoadd.bin

The tests passes, which is good, but doesn't explain why decrementing 1 ends up as 2.

Looking more into the source code from the stack trace 
[    0.000000] [<(ptrval)>] __free_pages+0x9c/0xe0
[    0.000000] [<(ptrval)>] __free_pages_bootmem+0x294/0x2d4
[    0.000000] [<(ptrval)>] free_all_bootmem+0x208/0x2ac

These functions are defined in mm/page_alloc.c

As __free_pages is called from the 
static void __init __free_pages_boot_core(struct page *page, unsigned int order)
{
…
    set_page_refcounted(page);
    __free_pages(page, order);

After a while of debugging and printing, the value seems to change in __free_pages, after put_page_testzero(page_ is called

void __free_pages(struct page *page, unsigned int order)
{
	if (put_page_testzero(page)) {
		if (order == 0)
			free_unref_page(page);
		else
			__free_pages_ok(page, order);
	}
}

And that is defined in mm.h as 

/*
* Drop a ref, return true if the refcount fell to zero (the page has no users)
*/
static inline int put_page_testzero(struct page *page)
{
    VM_BUG_ON_PAGE(page_ref_count(page) == 0, page);
    return page_ref_dec_and_test(page);
}

So we can zoom back at page_ref_dec_and_test.

c059f3f4:	fff00793          	li	a5,-1
c059f3f8:	01048713          	addi	a4,s1,16
c059f3fc:	06f727af          	amoadd.w.aqrl	a5,a5,(a4)

Setting a breakpoint at this instruction and stepping into the emuriscv amoadd.w implementation shows that for some reason the a5 register was read as 1. 

I happened to read unsigned values instead of signed and this messed up the addition (subtraction). Nice. How did the boot process get so far with this implemented incorrectly is beyond me. 

word address = get_rs1_value(state, instruction); \
word value = read_word(state, address); \
set_rd_value(state, instruction, value); \
value = value OP get_rs2_value(state, instruction); \
write_word(state, address, value); \

In case rd and rs2 is the same, set_rd_value overwrites the "rd" value before it's used.

This really helps and we can continue with the boot process.


### Getting the clock working

I also needed to implement 'the clock', so far the instruction count is being written into two CSRs - CSR_TIME, CSR_CYCLE, where it's picked up by arch/riscv/kernel/time.c 

write_csr(state, CSR_TIME, state->instruction_counter);
write_csr(state, CSR_CYCLE, state->instruction_counter);

It interacts with timebase-frequency FDT property, which I currently set up as 10 MHz, which roughly matches the performance on my i7 4850 HQ. So in the later builds we get to have time

[    6.565251] bootconsole [early0] uses init memory and must be disabled even before the real one is ready

### Hacking the boot console
Later a small hack was needed, as the initial SBI console that prints out individual characters via the ecall instruction was flagged as a 'boot console'. Boot consoles use init memory (I think that's the area of memory where the kernel image is loaded to initially). The initial riscv SBI early console was defined as 

struct console riscv_sbi_early_console_dev __initdata = {
…
}

Registering a new console without the __initdata modifier and the CON_BOOT flag seems to have resolved this for a while. 

----

[    6.587707] VFS: Cannot open root device "(null)" or unknown-block(0,0): error -6
[    6.594472] Please append a correct "root=" boot option; here are the available partitions:
[    6.601593] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)

Now we get all the way to the kernel complaining it has no init file system. As luck would have it, I happened to have a buildroot version that's compiled against 4.15 kernel headers checked out and compiled, enabled the option to generate a file system image (initramfs) and then include that into the kernel binary image. That means we don't need to deal with "external" file system and devices yet (external being outside of the kernel image).

Note: There is an option of using uncompressed or compressed file system image. The minimal-ish buildroot initramfs ended up at 16 MB, gzipped version at 5.3 MB. Decompressing with a debug build of emuriscv took much longer than just loading the bigger uncompressed image, so the uncompressed image is faster for debugging. 

It also helped to increase the memory to at least 128 MB, as a lot of memory was used by a "IOTLB" thingy, compared to attempting to booting on 16 megs. 

BUG: Scheduling while atomic

[   50.430321] BUG: scheduling while atomic: init/1/0xcccccccc
[   50.433327] CPU: 0 PID: -858993460 Comm: (null) Not tainted 4.15.0emuriscv-gbee32fc2f-dirty #10
[   50.438255] Call Trace:
[   50.440967] [<(ptrval)>] walk_stackframe+0x0/0xfc
[   50.443845] [<(ptrval)>] show_stack+0x38/0x50
[   50.446798] [<(ptrval)>] dump_stack+0x2c/0x40
[   50.449741] [<(ptrval)>] __schedule_bug+0x4c/0x70
[   50.452640] [<(ptrval)>] __schedule+0x4c/0x45c
[   50.455510] [<(ptrval)>] schedule+0x4c/0x7c
[   50.458459] [<(ptrval)>] ret_from_syscall+0xc/0x10

This points to "schedule" function. 

Jumping into the disassembly:

__schedule is at c06ce9b0, 
c06ce9b0+70=c06cea20

c06ce9b0 <__schedule>:
…
if (unlikely(in_atomic_preempt_off())) {
c06cea14:	00078a63          	beqz	a5,c06cea28 <__schedule+0x78>
	__schedule_bug(prev);
c06cea18:	00048513          	mv	a0,s1
c06cea1c:	ffe89097          	auipc	ra,0xffe89
c06cea20:	300080e7          	jalr	768(ra) # c0557d1c <__schedule_bug>

So the condition that got us into this mess is in_atomic_preempt_off()

Stackoverflow says: "Scheduling while atomic" indicates that you've tried to sleep somewhere that you shouldn't - like within a spinlock-protected critical section or an interrupt handler.
https://stackoverflow.com/questions/3537252/how-to-solve-bug-scheduling-while-atomic-swapper-0x00000103-0-cpu0-in-ts

See kernel/sched/core.c
static void __sched notrace __schedule(bool preempt)

Which calls a debug version - schedule_debug

    if (unlikely(in_atomic_preempt_off())) {
        __schedule_bug(prev);
        preempt_count_set(PREEMPT_DISABLED);
    }

(preempt.h)
#define in_atomic_preempt_off() (preempt_count() != PREEMPT_DISABLE_OFFSET)

Another tool that should help with debugging this is addr2line

addr2line -e vmlinux

Jumping into the disassembly:

__schedule is at c06ce9b0, 
c06ce9b0+70=c06cea20

c06ce9b0 <__schedule>:
…
if (unlikely(in_atomic_preempt_off())) {
c06cea14:	00078a63          	beqz	a5,c06cea28 <__schedule+0x78>
	__schedule_bug(prev);
c06cea18:	00048513          	mv	a0,s1
c06cea1c:	ffe89097          	auipc	ra,0xffe89
c06cea20:	300080e7          	jalr	768(ra) # c0557d1c <__schedule_bug>

So the condition that got us into this mess is in_atomic_preempt_off()

That resolves to  (core.c)

/*
* Various schedule()-time debugging checks and statistics:
*/
static inline void schedule_debug(struct task_struct *prev)
{
#ifdef CONFIG_SCHED_STACK_END_CHECK
    if (task_stack_end_corrupted(prev))
        panic("corrupted stack end detected inside scheduler\n");
#endif
    if (unlikely(in_atomic_preempt_off())) {
        __schedule_bug(prev);
        preempt_count_set(PREEMPT_DISABLED);
    }
    rcu_sleep_check();
    profile_hit(SCHED_PROFILING, __builtin_return_address(0));
    schedstat_inc(this_rq()->sched_count);
}


Minimum requirements for VT100 emulation:
To act as a passive display, implement the 4 cursor commands, the 2 erase commands, direct cursor addressing, and at least inverse characters.
The software should be capable of handling strings with 16 numeric parameters with values in the range of 0 to 255.

  [A      move cursor up one row, stop if a top of screen
  [B      move cursor down one row, stop if at bottom of screen
  [C      move cursor forward one column, stop if at right edge of screen
  [D      move cursor backward one column, stop if at left edge of screen
  [H      Home to row 1 column 1 (also [1;1H)
  [J      Clear from current position to bottom of screen
  [K      Clear from current position to end of line
  [24;80H Position to line 24 column 80 (any line 1 to 24, any column 1 to 132)
  [0m     Clear attributes to normal characters
  [7m     Add the inverse video attribute to succeeding characters
  [0;7m   Set character attributes to inverse video only
