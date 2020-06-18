---
layout: post
title:  "Speeding up virtual memory"
date:   2020-06-19 18:00:00 +0200
categories: emulation
tags: [riscv, emulation]
published: false
---

Speeding up virtual memory.

TLB

TLB reflects page structure, but keeps a smaller number in.

It's usually implemented in hardware - we have to do it in a fast software way.

A bad possible case - copying 1 word from memory to a register. 

```nasm
0000000000000000 <.data>:
...
1c: mov ax, 0x1234
```

We need to look up the instruction (by its virtual address `1c` pointed to by the PC register) in the page table and also the source address `0x1234`. Hence to execute this instruction we would need to look up two addresses. How can we speed that up?

Typically we'd keed the entire page table in memory, with its tree structure and we have to walk it on each virtual memory access.

With TLB, we keep a limited amount of (recently accessed pages) on the side. There would be a 1:1 correspondence to pages in the virtual memory. 

Hardware implementations can check whether a virtual page number is present in the TLB at once, by checking all entries simultaneously. We can help ourselves with a data structure.

If a match is found, we treat it as if it was a page table entry - check the access bits. How do we handle the dirty bit? Do we need to update the page table entry on write as well? Or only the TLB entry? We don't, as we can do it on TLB purge. When an entry is evicted from TLB to make space for a new one, if the TLB entry dirty bit was set, we apply it to the page.

What is an ideal TLB size? 64? 128? 1024? It will directly affect our lookup.