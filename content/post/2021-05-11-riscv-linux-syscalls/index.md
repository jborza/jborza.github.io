---
categories: riscv
date: "2021-05-11T23:00:00Z"
published: true
tags: [riscv, linux, interactive]
title: RISC-V Linux syscall table
image: syscall_preview.png
---

Here's a list of Linux system calls for the RISC-V architecture.

Click the syscall name for the related manpage. See also [syscalls(2)](https://man7.org/linux/man-pages/man2/syscalls.2.html).


{{% include-html file="2021-05-11-riscv-syscalls.html" %}}

## How did I make it?

There are two source files that we need to process:
- [unistd.h](https://github.com/torvalds/linux/blob/master/include/uapi/asm-generic/unistd.h) with the mapping between system call numbers to the function names
- [syscalls.h](https://github.com/torvalds/linux/blob/master/include/linux/syscalls.h) with the function declarations

#### Preprocessing the files

`unistd.h` is easier, it just needs merging the split source lines (backslash followed by newline) back with `perl -p -e 's/\\\n//'`.

The other file has line continuations as well, but we should prettify the source by converting tabs to spaces, then squishing multiple whitespace characters together with:

```bash
expand syscalls.h | perl -p -e 's/,\n/,/'  | tr -s "[:blank:]" 
```

So we end up with two source files:

```c
#define __NR_openat 56
__SYSCALL(__NR_openat, sys_openat)
#define __NR_linkat 37
__SYSCALL(__NR_linkat, sys_linkat)
#define __NR_unlinkat 35
__SYSCALL(__NR_unlinkat, sys_unlinkat)
```

```c
asmlinkage long sys_openat(int dfd, const char __user *filename, int flags, umode_t mode);
asmlinkage long sys_linkat(int dfd, const char __user *oldname, const char __user *newname);
asmlinkage long sys_unlinkat(int dfd, const char __user *pathname);
```

### Transforming the sources for JavaScript

This Python helper script builds the system call database from the sources. It goes through the file, captures the syscall number, then the name and declaration and prints it out as a list of JavaScript function calls to be included in the final page.

```python
import re
with open('syscalls2.h', 'r') as f:
    syscalls = f.readlines()

syscall_start = None
with open('unistd2.h', 'r') as f:
    for line in f.readlines():
        m = re.search('#define __.+ ([0-9]+)', line)
        if m:
            syscall_start = f'SYSCALL({m.group(1)},'
            continue

        m = re.search('__S.+,(.+?)\)',line)
        if m:
            if not syscall_start:
                continue
            syscall = m.group(1).strip()
            # a little fuction name preprocessing
            syscall = re.sub('^compat_', '', syscall)
            syscall = re.sub('^sys', '', syscall)
            # find syscall declaration and print it out
            definitions = [s for s in syscalls if f'{syscall}(' in s]
            if len(definitions) == 0:
                # syscall definition not found!
                syscall_start = None
                continue
            print(f'{syscall_start}"{syscall}","{definitions[0].strip()}")')
            syscall_start = None
```

## This searchable page 

This yields a list of function calls, as the following example:

```c
SYSCALL(93,"sys_exit","asmlinkage long sys_exit(int error_code);")
SYSCALL(57,"sys_close","asmlinkage long sys_close(unsigned int fd);")
SYSCALL(56,"sys_openat","asmlinkage long sys_openat(int dfd, const char __user *filename, int flags, umode_t mode);")
SYSCALL(63,"sys_read","asmlinkage long sys_read(unsigned int fd, char __user *buf, size_t count);")
SYSCALL(93,"sys_exit","asmlinkage long sys_exit(int error_code);")
```

This gets fed into a JavaScript function that we define in this page, that splits it up into various objects (indexed by name), so the rendering to a table and the fuzzy search works as well.

The rest is some glue code using my favorite [Vanilla JS](http://vanilla-js.com/) framework.