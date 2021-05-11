SYSCALL(0,"io_setup","asmlinkage long sys_io_setup(unsigned nr_reqs, aio_context_t __user *ctx);")
SYSCALL(1,"io_destroy","asmlinkage long sys_io_destroy(aio_context_t ctx);")
SYSCALL(2,"io_submit","asmlinkage long sys_io_submit(aio_context_t, long, struct iocb __user * __user *);")
SYSCALL(3,"io_cancel","asmlinkage long sys_io_cancel(aio_context_t ctx_id, struct iocb __user *iocb, struct io_event __user *result);")
SYSCALL(4,"io_getevents","asmlinkage long sys_io_getevents(aio_context_t ctx_id, long min_nr, long nr, struct io_event __user *events, struct __kernel_timespec __user *timeout);")
SYSCALL(5,"setxattr","asmlinkage long sys_setxattr(const char __user *path, const char __user *name, const void __user *value, size_t size, int flags);")
SYSCALL(6,"lsetxattr","asmlinkage long sys_lsetxattr(const char __user *path, const char __user *name, const void __user *value, size_t size, int flags);")
SYSCALL(7,"fsetxattr","asmlinkage long sys_fsetxattr(int fd, const char __user *name, const void __user *value, size_t size, int flags);")
SYSCALL(8,"getxattr","asmlinkage long sys_getxattr(const char __user *path, const char __user *name, void __user *value, size_t size);")
SYSCALL(9,"lgetxattr","asmlinkage long sys_lgetxattr(const char __user *path, const char __user *name, void __user *value, size_t size);")
SYSCALL(10,"fgetxattr","asmlinkage long sys_fgetxattr(int fd, const char __user *name, void __user *value, size_t size);")
SYSCALL(11,"listxattr","asmlinkage long sys_listxattr(const char __user *path, char __user *list, size_t size);")
SYSCALL(12,"llistxattr","asmlinkage long sys_llistxattr(const char __user *path, char __user *list, size_t size);")
SYSCALL(13,"flistxattr","asmlinkage long sys_flistxattr(int fd, char __user *list, size_t size);")
SYSCALL(14,"removexattr","asmlinkage long sys_removexattr(const char __user *path, const char __user *name);")
SYSCALL(15,"lremovexattr","asmlinkage long sys_lremovexattr(const char __user *path, const char __user *name);")
SYSCALL(16,"fremovexattr","asmlinkage long sys_fremovexattr(int fd, const char __user *name);")
SYSCALL(17,"getcwd","asmlinkage long sys_getcwd(char __user *buf, unsigned long size);")
SYSCALL(18,"lookup_dcookie","asmlinkage long sys_lookup_dcookie(u64 cookie64, char __user *buf, size_t len);")
SYSCALL(19,"eventfd2","asmlinkage long sys_eventfd2(unsigned int count, int flags);")
SYSCALL(20,"epoll_create1","asmlinkage long sys_epoll_create1(int flags);")
SYSCALL(21,"epoll_ctl","asmlinkage long sys_epoll_ctl(int epfd, int op, int fd, struct epoll_event __user *event);")
SYSCALL(22,"epoll_pwait","asmlinkage long sys_epoll_pwait(int epfd, struct epoll_event __user *events, int maxevents, int timeout, const sigset_t __user *sigmask, size_t sigsetsize);")
SYSCALL(23,"dup","asmlinkage long sys_dup(unsigned int fildes);")
SYSCALL(24,"dup3","asmlinkage long sys_dup3(unsigned int oldfd, unsigned int newfd, int flags);")
SYSCALL(25,"fcntl64","asmlinkage long sys_fcntl64(unsigned int fd, unsigned int cmd, unsigned long arg);")
SYSCALL(26,"inotify_init1","asmlinkage long sys_inotify_init1(int flags);")
SYSCALL(27,"inotify_add_watch","asmlinkage long sys_inotify_add_watch(int fd, const char __user *path, u32 mask);")
SYSCALL(28,"inotify_rm_watch","asmlinkage long sys_inotify_rm_watch(int fd, __s32 wd);")
SYSCALL(29,"ioctl","asmlinkage long sys_ioctl(unsigned int fd, unsigned int cmd, unsigned long arg);")
SYSCALL(30,"ioprio_set","asmlinkage long sys_ioprio_set(int which, int who, int ioprio);")
SYSCALL(31,"ioprio_get","asmlinkage long sys_ioprio_get(int which, int who);")
SYSCALL(32,"flock","asmlinkage long sys_flock(unsigned int fd, unsigned int cmd);")
SYSCALL(33,"mknodat","asmlinkage long sys_mknodat(int dfd, const char __user * filename, umode_t mode, unsigned dev);")
SYSCALL(34,"mkdirat","asmlinkage long sys_mkdirat(int dfd, const char __user * pathname, umode_t mode);")
SYSCALL(35,"unlinkat","asmlinkage long sys_unlinkat(int dfd, const char __user * pathname, int flag);")
SYSCALL(36,"symlinkat","asmlinkage long sys_symlinkat(const char __user * oldname, int newdfd, const char __user * newname);")
SYSCALL(37,"linkat","asmlinkage long sys_unlinkat(int dfd, const char __user * pathname, int flag);")
SYSCALL(38,"renameat","asmlinkage long sys_renameat(int olddfd, const char __user * oldname, int newdfd, const char __user * newname);")
SYSCALL(39,"umount","asmlinkage long sys_umount(char __user *name, int flags);")
SYSCALL(40,"mount","asmlinkage long sys_umount(char __user *name, int flags);")
SYSCALL(41,"pivot_root","asmlinkage long sys_pivot_root(const char __user *new_root, const char __user *put_old);")
SYSCALL(42,"ni_syscall","asmlinkage long sys_ni_syscall(void);")
SYSCALL(43,"statfs64","asmlinkage long sys_statfs64(const char __user *path, size_t sz, struct statfs64 __user *buf);")
SYSCALL(44,"fstatfs64","asmlinkage long sys_fstatfs64(unsigned int fd, size_t sz, struct statfs64 __user *buf);")
SYSCALL(45,"truncate64","asmlinkage long sys_truncate64(const char __user *path, loff_t length);")
SYSCALL(46,"ftruncate64","asmlinkage long sys_ftruncate64(unsigned int fd, loff_t length);")
SYSCALL(47,"fallocate","asmlinkage long sys_fallocate(int fd, int mode, loff_t offset, loff_t len);")
SYSCALL(48,"faccessat","asmlinkage long sys_faccessat(int dfd, const char __user *filename, int mode);")
SYSCALL(49,"chdir","asmlinkage long sys_chdir(const char __user *filename);")
SYSCALL(50,"fchdir","asmlinkage long sys_fchdir(unsigned int fd);")
SYSCALL(51,"chroot","asmlinkage long sys_chroot(const char __user *filename);")
SYSCALL(52,"fchmod","asmlinkage long sys_fchmod(unsigned int fd, umode_t mode);")
SYSCALL(53,"fchmodat","asmlinkage long sys_fchmodat(int dfd, const char __user * filename, umode_t mode);")
SYSCALL(54,"fchownat","asmlinkage long sys_fchownat(int dfd, const char __user *filename, uid_t user, gid_t group, int flag);")
SYSCALL(55,"fchown","asmlinkage long sys_fchown(unsigned int fd, uid_t user, gid_t group);")
SYSCALL(56,"openat","asmlinkage long sys_openat(int dfd, const char __user *filename, int flags, umode_t mode);")
SYSCALL(57,"close","asmlinkage long sys_close(unsigned int fd);")
SYSCALL(58,"vhangup","asmlinkage long sys_vhangup(void);")
SYSCALL(59,"pipe2","asmlinkage long sys_pipe2(int __user *fildes, int flags);")
SYSCALL(60,"quotactl","asmlinkage long sys_quotactl(unsigned int cmd, const char __user *special, qid_t id, void __user *addr);")
SYSCALL(61,"getdents64","asmlinkage long sys_getdents64(unsigned int fd, struct linux_dirent64 __user *dirent, unsigned int count);")
SYSCALL(62,"lseek","asmlinkage long sys_llseek(unsigned int fd, unsigned long offset_high, unsigned long offset_low, loff_t __user *result, unsigned int whence);")
SYSCALL(63,"read","asmlinkage long sys_read(unsigned int fd, char __user *buf, size_t count);")
SYSCALL(64,"write","asmlinkage long sys_write(unsigned int fd, const char __user *buf, size_t count);")
SYSCALL(65,"readv","asmlinkage long sys_readv(unsigned long fd, const struct iovec __user *vec, unsigned long vlen);")
SYSCALL(66,"writev","asmlinkage long sys_writev(unsigned long fd, const struct iovec __user *vec, unsigned long vlen);")
SYSCALL(67,"pread64","asmlinkage long sys_pread64(unsigned int fd, char __user *buf, size_t count, loff_t pos);")
SYSCALL(68,"pwrite64","asmlinkage long sys_pwrite64(unsigned int fd, const char __user *buf, size_t count, loff_t pos);")
SYSCALL(69,"preadv","asmlinkage long sys_preadv(unsigned long fd, const struct iovec __user *vec, unsigned long vlen, unsigned long pos_l, unsigned long pos_h);")
SYSCALL(70,"pwritev","asmlinkage long sys_pwritev(unsigned long fd, const struct iovec __user *vec, unsigned long vlen, unsigned long pos_l, unsigned long pos_h);")
SYSCALL(71,"sendfile64","asmlinkage long sys_sendfile64(int out_fd, int in_fd, loff_t __user *offset, size_t count);")
SYSCALL(72,"pselect6_time32","asmlinkage long sys_pselect6_time32(int, fd_set __user *, fd_set __user *, fd_set __user *, struct old_timespec32 __user *, void __user *);")
SYSCALL(73,"ppoll_time32","asmlinkage long sys_ppoll_time32(struct pollfd __user *, unsigned int, struct old_timespec32 __user *, const sigset_t __user *, size_t);")
SYSCALL(74,"signalfd4","asmlinkage long sys_signalfd4(int ufd, sigset_t __user *user_mask, size_t sizemask, int flags);")
SYSCALL(75,"vmsplice","asmlinkage long sys_vmsplice(int fd, const struct iovec __user *iov, unsigned long nr_segs, unsigned int flags);")
SYSCALL(76,"splice","asmlinkage long sys_vmsplice(int fd, const struct iovec __user *iov, unsigned long nr_segs, unsigned int flags);")
SYSCALL(77,"tee","asmlinkage long sys_tee(int fdin, int fdout, size_t len, unsigned int flags);")
SYSCALL(78,"readlinkat","asmlinkage long sys_readlinkat(int dfd, const char __user *path, char __user *buf, int bufsiz);")
SYSCALL(79,"newfstatat","asmlinkage long sys_newfstatat(int dfd, const char __user *filename, struct stat __user *statbuf, int flag);")
SYSCALL(80,"newfstat","asmlinkage long sys_newfstat(unsigned int fd, struct stat __user *statbuf);")
SYSCALL(81,"sync","asmlinkage long sys_sync(void);")
SYSCALL(82,"fsync","asmlinkage long sys_fsync(unsigned int fd);")
SYSCALL(83,"fdatasync","asmlinkage long sys_fdatasync(unsigned int fd);")
SYSCALL(84,"sync_file_range2","asmlinkage long sys_sync_file_range2(int fd, unsigned int flags, loff_t offset, loff_t nbytes);")
SYSCALL(84,"sync_file_range","asmlinkage long sys_sync_file_range(int fd, loff_t offset, loff_t nbytes, unsigned int flags);")
SYSCALL(85,"timerfd_create","asmlinkage long sys_timerfd_create(int clockid, int flags);")
SYSCALL(86,"timerfd_settime","asmlinkage long sys_timerfd_settime(int ufd, int flags, const struct __kernel_itimerspec __user *utmr, struct __kernel_itimerspec __user *otmr);")
SYSCALL(87,"timerfd_gettime","asmlinkage long sys_timerfd_gettime(int ufd, struct __kernel_itimerspec __user *otmr);")
SYSCALL(88,"utimensat","asmlinkage long sys_utimensat(int dfd, const char __user *filename, struct __kernel_timespec __user *utimes, int flags);")
SYSCALL(89,"acct","asmlinkage long sys_acct(const char __user *name);")
SYSCALL(90,"capget","asmlinkage long sys_capget(cap_user_header_t header, cap_user_data_t dataptr);")
SYSCALL(91,"capset","asmlinkage long sys_capset(cap_user_header_t header, const cap_user_data_t data);")
SYSCALL(92,"personality","asmlinkage long sys_personality(unsigned int personality);")
SYSCALL(93,"exit","asmlinkage long sys_exit(int error_code);")
SYSCALL(94,"exit_group","asmlinkage long sys_exit_group(int error_code);")
SYSCALL(95,"waitid","asmlinkage long sys_waitid(int which, pid_t pid, struct siginfo __user *infop, int options, struct rusage __user *ru);")
SYSCALL(96,"set_tid_address","asmlinkage long sys_set_tid_address(int __user *tidptr);")
SYSCALL(97,"unshare","asmlinkage long sys_unshare(unsigned long unshare_flags);")
SYSCALL(98,"futex","asmlinkage long sys_futex(u32 __user *uaddr, int op, u32 val, struct __kernel_timespec __user *utime, u32 __user *uaddr2, u32 val3);")
SYSCALL(99,"set_robust_list","asmlinkage long sys_set_robust_list(struct robust_list_head __user *head, size_t len);")
SYSCALL(100,"get_robust_list","asmlinkage long sys_get_robust_list(int pid, struct robust_list_head __user * __user *head_ptr, size_t __user *len_ptr);")
SYSCALL(101,"nanosleep","asmlinkage long sys_nanosleep(struct __kernel_timespec __user *rqtp, struct __kernel_timespec __user *rmtp);")
SYSCALL(102,"getitimer","asmlinkage long sys_getitimer(int which, struct __kernel_old_itimerval __user *value);")
SYSCALL(103,"setitimer","asmlinkage long sys_setitimer(int which, struct __kernel_old_itimerval __user *value, struct __kernel_old_itimerval __user *ovalue);")
SYSCALL(104,"kexec_load","asmlinkage long sys_kexec_load(unsigned long entry, unsigned long nr_segments, struct kexec_segment __user *segments, unsigned long flags);")
SYSCALL(105,"init_module","asmlinkage long sys_init_module(void __user *umod, unsigned long len, const char __user *uargs);")
SYSCALL(106,"delete_module","asmlinkage long sys_delete_module(const char __user *name_user, unsigned int flags);")
SYSCALL(107,"timer_create","asmlinkage long sys_timer_create(clockid_t which_clock, struct sigevent __user *timer_event_spec, timer_t __user * created_timer_id);")
SYSCALL(108,"timer_gettime","asmlinkage long sys_timer_gettime(timer_t timer_id, struct __kernel_itimerspec __user *setting);")
SYSCALL(109,"timer_getoverrun","asmlinkage long sys_timer_getoverrun(timer_t timer_id);")
SYSCALL(110,"timer_settime","asmlinkage long sys_timer_settime(timer_t timer_id, int flags, const struct __kernel_itimerspec __user *new_setting, struct __kernel_itimerspec __user *old_setting);")
SYSCALL(111,"timer_delete","asmlinkage long sys_timer_delete(timer_t timer_id);")
SYSCALL(112,"clock_settime","asmlinkage long sys_clock_settime(clockid_t which_clock, const struct __kernel_timespec __user *tp);")
SYSCALL(113,"clock_gettime","asmlinkage long sys_clock_gettime(clockid_t which_clock, struct __kernel_timespec __user *tp);")
SYSCALL(114,"clock_getres","asmlinkage long sys_clock_getres(clockid_t which_clock, struct __kernel_timespec __user *tp);")
SYSCALL(115,"clock_nanosleep","asmlinkage long sys_clock_nanosleep(clockid_t which_clock, int flags, const struct __kernel_timespec __user *rqtp, struct __kernel_timespec __user *rmtp);")
SYSCALL(116,"syslog","asmlinkage long sys_syslog(int type, char __user *buf, int len);")
SYSCALL(117,"ptrace","asmlinkage long sys_ptrace(long request, long pid, unsigned long addr, unsigned long data);")
SYSCALL(118,"sched_setparam","asmlinkage long sys_sched_setparam(pid_t pid, struct sched_param __user *param);")
SYSCALL(119,"sched_setscheduler","asmlinkage long sys_sched_setscheduler(pid_t pid, int policy, struct sched_param __user *param);")
SYSCALL(120,"sched_getscheduler","asmlinkage long sys_sched_getscheduler(pid_t pid);")
SYSCALL(121,"sched_getparam","asmlinkage long sys_sched_getparam(pid_t pid, struct sched_param __user *param);")
SYSCALL(122,"sched_setaffinity","asmlinkage long sys_sched_setaffinity(pid_t pid, unsigned int len, unsigned long __user *user_mask_ptr);")
SYSCALL(123,"sched_getaffinity","asmlinkage long sys_sched_getaffinity(pid_t pid, unsigned int len, unsigned long __user *user_mask_ptr);")
SYSCALL(124,"sched_yield","asmlinkage long sys_sched_yield(void);")
SYSCALL(125,"sched_get_priority_max","asmlinkage long sys_sched_get_priority_max(int policy);")
SYSCALL(126,"sched_get_priority_min","asmlinkage long sys_sched_get_priority_min(int policy);")
SYSCALL(127,"sched_rr_get_interval","asmlinkage long sys_sched_rr_get_interval(pid_t pid, struct __kernel_timespec __user *interval);")
SYSCALL(128,"restart_syscall","asmlinkage long sys_restart_syscall(void);")
SYSCALL(129,"kill","asmlinkage long sys_kill(pid_t pid, int sig);")
SYSCALL(130,"tkill","asmlinkage long sys_tkill(pid_t pid, int sig);")
SYSCALL(131,"tgkill","asmlinkage long sys_tgkill(pid_t tgid, pid_t pid, int sig);")
SYSCALL(132,"sigaltstack","asmlinkage long sys_sigaltstack(const struct sigaltstack __user *uss, struct sigaltstack __user *uoss);")
SYSCALL(133,"rt_sigsuspend","asmlinkage long sys_rt_sigsuspend(sigset_t __user *unewset, size_t sigsetsize);")
SYSCALL(134,"rt_sigaction","asmlinkage long sys_rt_sigaction(int, const struct sigaction __user *, struct sigaction __user *, size_t);")
SYSCALL(135,"rt_sigprocmask","asmlinkage long sys_rt_sigprocmask(int how, sigset_t __user *set, sigset_t __user *oset, size_t sigsetsize);")
SYSCALL(136,"rt_sigpending","asmlinkage long sys_rt_sigpending(sigset_t __user *set, size_t sigsetsize);")
SYSCALL(137,"rt_sigtimedwait_time32","asmlinkage long sys_rt_sigtimedwait_time32(const sigset_t __user *uthese, siginfo_t __user *uinfo, const struct old_timespec32 __user *uts, size_t sigsetsize);")
SYSCALL(138,"rt_sigqueueinfo","asmlinkage long sys_rt_sigqueueinfo(pid_t pid, int sig, siginfo_t __user *uinfo);")
SYSCALL(140,"setpriority","asmlinkage long sys_setpriority(int which, int who, int niceval);")
SYSCALL(141,"getpriority","asmlinkage long sys_getpriority(int which, int who);")
SYSCALL(142,"reboot","asmlinkage long sys_reboot(int magic1, int magic2, unsigned int cmd, void __user *arg);")
SYSCALL(143,"setregid","asmlinkage long sys_setregid(gid_t rgid, gid_t egid);")
SYSCALL(144,"setgid","asmlinkage long sys_setgid(gid_t gid);")
SYSCALL(145,"setreuid","asmlinkage long sys_setreuid(uid_t ruid, uid_t euid);")
SYSCALL(146,"setuid","asmlinkage long sys_setuid(uid_t uid);")
SYSCALL(147,"setresuid","asmlinkage long sys_setresuid(uid_t ruid, uid_t euid, uid_t suid);")
SYSCALL(148,"getresuid","asmlinkage long sys_getresuid(uid_t __user *ruid, uid_t __user *euid, uid_t __user *suid);")
SYSCALL(149,"setresgid","asmlinkage long sys_setresgid(gid_t rgid, gid_t egid, gid_t sgid);")
SYSCALL(150,"getresgid","asmlinkage long sys_getresgid(gid_t __user *rgid, gid_t __user *egid, gid_t __user *sgid);")
SYSCALL(151,"setfsuid","asmlinkage long sys_setfsuid(uid_t uid);")
SYSCALL(152,"setfsgid","asmlinkage long sys_setfsgid(gid_t gid);")
SYSCALL(153,"times","asmlinkage long sys_times(struct tms __user *tbuf);")
SYSCALL(154,"setpgid","asmlinkage long sys_setpgid(pid_t pid, pid_t pgid);")
SYSCALL(155,"getpgid","asmlinkage long sys_getpgid(pid_t pid);")
SYSCALL(156,"getsid","asmlinkage long sys_getsid(pid_t pid);")
SYSCALL(157,"setsid","asmlinkage long sys_setsid(void);")
SYSCALL(158,"getgroups","asmlinkage long sys_getgroups(int gidsetsize, gid_t __user *grouplist);")
SYSCALL(159,"setgroups","asmlinkage long sys_setgroups(int gidsetsize, gid_t __user *grouplist);")
SYSCALL(160,"newuname","asmlinkage long sys_newuname(struct new_utsname __user *name);")
SYSCALL(161,"sethostname","asmlinkage long sys_sethostname(char __user *name, int len);")
SYSCALL(162,"setdomainname","asmlinkage long sys_setdomainname(char __user *name, int len);")
SYSCALL(163,"getrlimit","asmlinkage long sys_getrlimit(unsigned int resource, struct rlimit __user *rlim);")
SYSCALL(164,"setrlimit","asmlinkage long sys_setrlimit(unsigned int resource, struct rlimit __user *rlim);")
SYSCALL(165,"getrusage","asmlinkage long sys_getrusage(int who, struct rusage __user *ru);")
SYSCALL(166,"umask","asmlinkage long sys_umask(int mask);")
SYSCALL(167,"prctl","asmlinkage long sys_prctl(int option, unsigned long arg2, unsigned long arg3, unsigned long arg4, unsigned long arg5);")
SYSCALL(168,"getcpu","asmlinkage long sys_getcpu(unsigned __user *cpu, unsigned __user *node, struct getcpu_cache __user *cache);")
SYSCALL(169,"gettimeofday","asmlinkage long sys_gettimeofday(struct __kernel_old_timeval __user *tv, struct timezone __user *tz);")
SYSCALL(170,"settimeofday","asmlinkage long sys_settimeofday(struct __kernel_old_timeval __user *tv, struct timezone __user *tz);")
SYSCALL(171,"adjtimex","asmlinkage long sys_adjtimex(struct __kernel_timex __user *txc_p);")
SYSCALL(172,"getpid","asmlinkage long sys_getpid(void);")
SYSCALL(173,"getppid","asmlinkage long sys_getppid(void);")
SYSCALL(174,"getuid","asmlinkage long sys_getuid(void);")
SYSCALL(175,"geteuid","asmlinkage long sys_geteuid(void);")
SYSCALL(176,"getgid","asmlinkage long sys_getgid(void);")
SYSCALL(177,"getegid","asmlinkage long sys_getegid(void);")
SYSCALL(178,"gettid","asmlinkage long sys_gettid(void);")
SYSCALL(179,"sysinfo","asmlinkage long sys_sysinfo(struct sysinfo __user *info);")
SYSCALL(180,"mq_open","asmlinkage long sys_mq_open(const char __user *name, int oflag, umode_t mode, struct mq_attr __user *attr);")
SYSCALL(181,"mq_unlink","asmlinkage long sys_mq_unlink(const char __user *name);")
SYSCALL(182,"mq_timedsend","asmlinkage long sys_mq_timedsend(mqd_t mqdes, const char __user *msg_ptr, size_t msg_len, unsigned int msg_prio, const struct __kernel_timespec __user *abs_timeout);")
SYSCALL(183,"mq_timedreceive","asmlinkage long sys_mq_timedreceive(mqd_t mqdes, char __user *msg_ptr, size_t msg_len, unsigned int __user *msg_prio, const struct __kernel_timespec __user *abs_timeout);")
SYSCALL(184,"mq_notify","asmlinkage long sys_mq_notify(mqd_t mqdes, const struct sigevent __user *notification);")
SYSCALL(185,"mq_getsetattr","asmlinkage long sys_mq_getsetattr(mqd_t mqdes, const struct mq_attr __user *mqstat, struct mq_attr __user *omqstat);")
SYSCALL(186,"msgget","asmlinkage long sys_msgget(key_t key, int msgflg);")
SYSCALL(187,"msgctl","asmlinkage long sys_old_msgctl(int msqid, int cmd, struct msqid_ds __user *buf);")
SYSCALL(188,"msgrcv","asmlinkage long sys_msgrcv(int msqid, struct msgbuf __user *msgp, size_t msgsz, long msgtyp, int msgflg);")
SYSCALL(189,"msgsnd","asmlinkage long sys_msgsnd(int msqid, struct msgbuf __user *msgp, size_t msgsz, int msgflg);")
SYSCALL(190,"semget","asmlinkage long sys_semget(key_t key, int nsems, int semflg);")
SYSCALL(191,"semctl","asmlinkage long sys_semctl(int semid, int semnum, int cmd, unsigned long arg);")
SYSCALL(192,"semtimedop","asmlinkage long sys_semtimedop(int semid, struct sembuf __user *sops, unsigned nsops, const struct __kernel_timespec __user *timeout);")
SYSCALL(193,"semop","asmlinkage long sys_semop(int semid, struct sembuf __user *sops, unsigned nsops);")
SYSCALL(194,"shmget","asmlinkage long sys_shmget(key_t key, size_t size, int flag);")
SYSCALL(195,"shmctl","asmlinkage long sys_old_shmctl(int shmid, int cmd, struct shmid_ds __user *buf);")
SYSCALL(196,"shmat","asmlinkage long sys_shmat(int shmid, char __user *shmaddr, int shmflg);")
SYSCALL(197,"shmdt","asmlinkage long sys_shmdt(char __user *shmaddr);")
SYSCALL(198,"socket","asmlinkage long sys_socket(int, int, int);")
SYSCALL(199,"socketpair","asmlinkage long sys_socketpair(int, int, int, int __user *);")
SYSCALL(200,"bind","asmlinkage long sys_bind(int, struct sockaddr __user *, int);")
SYSCALL(201,"listen","asmlinkage long sys_listen(int, int);")
SYSCALL(202,"accept","asmlinkage long sys_accept(int, struct sockaddr __user *, int __user *);")
SYSCALL(203,"connect","asmlinkage long sys_connect(int, struct sockaddr __user *, int);")
SYSCALL(204,"getsockname","asmlinkage long sys_getsockname(int, struct sockaddr __user *, int __user *);")
SYSCALL(205,"getpeername","asmlinkage long sys_getpeername(int, struct sockaddr __user *, int __user *);")
SYSCALL(206,"sendto","asmlinkage long sys_sendto(int, void __user *, size_t, unsigned, struct sockaddr __user *, int);")
SYSCALL(207,"recvfrom","asmlinkage long sys_recvfrom(int, void __user *, size_t, unsigned, struct sockaddr __user *, int __user *);")
SYSCALL(208,"setsockopt","asmlinkage long sys_setsockopt(int fd, int level, int optname, char __user *optval, int optlen);")
SYSCALL(209,"getsockopt","asmlinkage long sys_getsockopt(int fd, int level, int optname, char __user *optval, int __user *optlen);")
SYSCALL(210,"shutdown","asmlinkage long sys_shutdown(int, int);")
SYSCALL(211,"sendmsg","asmlinkage long sys_sendmsg(int fd, struct user_msghdr __user *msg, unsigned flags);")
SYSCALL(212,"recvmsg","asmlinkage long sys_recvmsg(int fd, struct user_msghdr __user *msg, unsigned flags);")
SYSCALL(213,"readahead","asmlinkage long sys_readahead(int fd, loff_t offset, size_t count);")
SYSCALL(214,"brk","asmlinkage long sys_brk(unsigned long brk);")
SYSCALL(215,"munmap","asmlinkage long sys_munmap(unsigned long addr, size_t len);")
SYSCALL(216,"mremap","asmlinkage long sys_mremap(unsigned long addr, unsigned long old_len, unsigned long new_len, unsigned long flags, unsigned long new_addr);")
SYSCALL(217,"add_key","asmlinkage long sys_add_key(const char __user *_type, const char __user *_description, const void __user *_payload, size_t plen, key_serial_t destringid);")
SYSCALL(218,"request_key","asmlinkage long sys_request_key(const char __user *_type, const char __user *_description, const char __user *_callout_info, key_serial_t destringid);")
SYSCALL(219,"keyctl","asmlinkage long sys_keyctl(int cmd, unsigned long arg2, unsigned long arg3, unsigned long arg4, unsigned long arg5);")
SYSCALL(220,"clone","asmlinkage long sys_clone(unsigned long, unsigned long, int __user *, unsigned long, int __user *);")
SYSCALL(221,"execve","asmlinkage long sys_execve(const char __user *filename, const char __user *const __user *argv, const char __user *const __user *envp);")
SYSCALL(222,"mmap","asmlinkage long sys_old_mmap(struct mmap_arg_struct __user *arg);")
SYSCALL(223,"fadvise64_64","asmlinkage long sys_fadvise64_64(int fd, loff_t offset, loff_t len, int advice);")
SYSCALL(224,"swapon","asmlinkage long sys_swapon(const char __user *specialfile, int swap_flags);")
SYSCALL(225,"swapoff","asmlinkage long sys_swapoff(const char __user *specialfile);")
SYSCALL(226,"mprotect","asmlinkage long sys_mprotect(unsigned long start, size_t len, unsigned long prot);")
SYSCALL(227,"msync","asmlinkage long sys_msync(unsigned long start, size_t len, int flags);")
SYSCALL(228,"mlock","asmlinkage long sys_mlock(unsigned long start, size_t len);")
SYSCALL(229,"munlock","asmlinkage long sys_munlock(unsigned long start, size_t len);")
SYSCALL(230,"mlockall","asmlinkage long sys_mlockall(int flags);")
SYSCALL(231,"munlockall","asmlinkage long sys_munlockall(void);")
SYSCALL(232,"mincore","asmlinkage long sys_mincore(unsigned long start, size_t len, unsigned char __user * vec);")
SYSCALL(233,"madvise","asmlinkage long sys_madvise(unsigned long start, size_t len, int behavior);")
SYSCALL(234,"remap_file_pages","asmlinkage long sys_remap_file_pages(unsigned long start, unsigned long size, unsigned long prot, unsigned long pgoff, unsigned long flags);")
SYSCALL(235,"mbind","asmlinkage long sys_mbind(unsigned long start, unsigned long len, unsigned long mode, const unsigned long __user *nmask, unsigned long maxnode, unsigned flags);")
SYSCALL(236,"get_mempolicy","asmlinkage long sys_get_mempolicy(int __user *policy, unsigned long __user *nmask, unsigned long maxnode, unsigned long addr, unsigned long flags);")
SYSCALL(237,"set_mempolicy","asmlinkage long sys_set_mempolicy(int mode, const unsigned long __user *nmask, unsigned long maxnode);")
SYSCALL(238,"migrate_pages","asmlinkage long sys_migrate_pages(pid_t pid, unsigned long maxnode, const unsigned long __user *from, const unsigned long __user *to);")
SYSCALL(239,"move_pages","asmlinkage long sys_move_pages(pid_t pid, unsigned long nr_pages, const void __user * __user *pages, const int __user *nodes, int __user *status, int flags);")
SYSCALL(240,"rt_tgsigqueueinfo","asmlinkage long sys_rt_tgsigqueueinfo(pid_t tgid, pid_t pid, int sig, siginfo_t __user *uinfo);")
SYSCALL(241,"perf_event_open","asmlinkage long sys_perf_event_open(")
SYSCALL(242,"accept4","asmlinkage long sys_accept4(int, struct sockaddr __user *, int __user *, int);")
SYSCALL(243,"recvmmsg_time32","asmlinkage long sys_recvmmsg_time32(int fd, struct mmsghdr __user *msg, unsigned int vlen, unsigned flags, struct old_timespec32 __user *timeout);")
SYSCALL(260,"wait4","asmlinkage long sys_wait4(pid_t pid, int __user *stat_addr, int options, struct rusage __user *ru);")
SYSCALL(261,"prlimit64","asmlinkage long sys_prlimit64(pid_t pid, unsigned int resource, const struct rlimit64 __user *new_rlim, struct rlimit64 __user *old_rlim);")
SYSCALL(262,"fanotify_init","asmlinkage long sys_fanotify_init(unsigned int flags, unsigned int event_f_flags);")
SYSCALL(263,"fanotify_mark","asmlinkage long sys_fanotify_mark(int fanotify_fd, unsigned int flags, u64 mask, int fd, const char __user *pathname);")
SYSCALL(264,"name_to_handle_at","asmlinkage long sys_name_to_handle_at(int dfd, const char __user *name, struct file_handle __user *handle, int __user *mnt_id, int flag);")
SYSCALL(265,"open_by_handle_at","asmlinkage long sys_open_by_handle_at(int mountdirfd, struct file_handle __user *handle, int flags);")
SYSCALL(266,"clock_adjtime","asmlinkage long sys_clock_adjtime(clockid_t which_clock, struct __kernel_timex __user *tx);")
SYSCALL(267,"syncfs","asmlinkage long sys_syncfs(int fd);")
SYSCALL(268,"setns","asmlinkage long sys_setns(int fd, int nstype);")
SYSCALL(269,"sendmmsg","asmlinkage long sys_sendmmsg(int fd, struct mmsghdr __user *msg, unsigned int vlen, unsigned flags);")
SYSCALL(270,"process_vm_readv","asmlinkage long sys_process_vm_readv(pid_t pid, const struct iovec __user *lvec, unsigned long liovcnt, const struct iovec __user *rvec, unsigned long riovcnt, unsigned long flags);")
SYSCALL(271,"process_vm_writev","asmlinkage long sys_process_vm_writev(pid_t pid, const struct iovec __user *lvec, unsigned long liovcnt, const struct iovec __user *rvec, unsigned long riovcnt, unsigned long flags);")
SYSCALL(272,"kcmp","asmlinkage long sys_kcmp(pid_t pid1, pid_t pid2, int type, unsigned long idx1, unsigned long idx2);")
SYSCALL(273,"finit_module","asmlinkage long sys_finit_module(int fd, const char __user *uargs, int flags);")
SYSCALL(274,"sched_setattr","asmlinkage long sys_sched_setattr(pid_t pid, struct sched_attr __user *attr, unsigned int flags);")
SYSCALL(275,"sched_getattr","asmlinkage long sys_sched_getattr(pid_t pid, struct sched_attr __user *attr, unsigned int size, unsigned int flags);")
SYSCALL(276,"renameat2","asmlinkage long sys_renameat2(int olddfd, const char __user *oldname, int newdfd, const char __user *newname, unsigned int flags);")
SYSCALL(277,"seccomp","asmlinkage long sys_seccomp(unsigned int op, unsigned int flags, void __user *uargs);")
SYSCALL(278,"getrandom","asmlinkage long sys_getrandom(char __user *buf, size_t count, unsigned int flags);")
SYSCALL(279,"memfd_create","asmlinkage long sys_memfd_create(const char __user *uname_ptr, unsigned int flags);")
SYSCALL(280,"bpf","asmlinkage long sys_bpf(int cmd, union bpf_attr *attr, unsigned int size);")
SYSCALL(281,"execveat","asmlinkage long sys_execveat(int dfd, const char __user *filename, const char __user *const __user *argv, const char __user *const __user *envp, int flags);")
SYSCALL(282,"userfaultfd","asmlinkage long sys_userfaultfd(int flags);")
SYSCALL(283,"membarrier","asmlinkage long sys_membarrier(int cmd, unsigned int flags, int cpu_id);")
SYSCALL(284,"mlock2","asmlinkage long sys_mlock2(unsigned long start, size_t len, int flags);")
SYSCALL(285,"copy_file_range","asmlinkage long sys_copy_file_range(int fd_in, loff_t __user *off_in, int fd_out, loff_t __user *off_out, size_t len, unsigned int flags);")
SYSCALL(286,"preadv2","asmlinkage long sys_preadv2(unsigned long fd, const struct iovec __user *vec, unsigned long vlen, unsigned long pos_l, unsigned long pos_h, rwf_t flags);")
SYSCALL(287,"pwritev2","asmlinkage long sys_pwritev2(unsigned long fd, const struct iovec __user *vec, unsigned long vlen, unsigned long pos_l, unsigned long pos_h, rwf_t flags);")
SYSCALL(288,"pkey_mprotect","asmlinkage long sys_pkey_mprotect(unsigned long start, size_t len, unsigned long prot, int pkey);")
SYSCALL(289,"pkey_alloc","asmlinkage long sys_pkey_alloc(unsigned long flags, unsigned long init_val);")
SYSCALL(290,"pkey_free","asmlinkage long sys_pkey_free(int pkey);")
SYSCALL(291,"statx","asmlinkage long sys_statx(int dfd, const char __user *path, unsigned flags, unsigned mask, struct statx __user *buffer);")
SYSCALL(292,"io_pgetevents","asmlinkage long sys_io_pgetevents(aio_context_t ctx_id, long min_nr, long nr, struct io_event __user *events, struct __kernel_timespec __user *timeout, const struct __aio_sigset *sig);")
SYSCALL(293,"rseq","asmlinkage long sys_rseq(struct rseq __user *rseq, uint32_t rseq_len, int flags, uint32_t sig);")
SYSCALL(294,"kexec_file_load","asmlinkage long sys_kexec_file_load(int kernel_fd, int initrd_fd, unsigned long cmdline_len, const char __user *cmdline_ptr, unsigned long flags);")
SYSCALL(403,"clock_gettime","asmlinkage long sys_clock_gettime(clockid_t which_clock, struct __kernel_timespec __user *tp);")
SYSCALL(404,"clock_settime","asmlinkage long sys_clock_settime(clockid_t which_clock, const struct __kernel_timespec __user *tp);")
SYSCALL(405,"clock_adjtime","asmlinkage long sys_clock_adjtime(clockid_t which_clock, struct __kernel_timex __user *tx);")
SYSCALL(406,"clock_getres","asmlinkage long sys_clock_getres(clockid_t which_clock, struct __kernel_timespec __user *tp);")
SYSCALL(407,"clock_nanosleep","asmlinkage long sys_clock_nanosleep(clockid_t which_clock, int flags, const struct __kernel_timespec __user *rqtp, struct __kernel_timespec __user *rmtp);")
SYSCALL(408,"timer_gettime","asmlinkage long sys_timer_gettime(timer_t timer_id, struct __kernel_itimerspec __user *setting);")
SYSCALL(409,"timer_settime","asmlinkage long sys_timer_settime(timer_t timer_id, int flags, const struct __kernel_itimerspec __user *new_setting, struct __kernel_itimerspec __user *old_setting);")
SYSCALL(410,"timerfd_gettime","asmlinkage long sys_timerfd_gettime(int ufd, struct __kernel_itimerspec __user *otmr);")
SYSCALL(411,"timerfd_settime","asmlinkage long sys_timerfd_settime(int ufd, int flags, const struct __kernel_itimerspec __user *utmr, struct __kernel_itimerspec __user *otmr);")
SYSCALL(412,"utimensat","asmlinkage long sys_utimensat(int dfd, const char __user *filename, struct __kernel_timespec __user *utimes, int flags);")
SYSCALL(416,"io_pgetevents","asmlinkage long sys_io_pgetevents(aio_context_t ctx_id, long min_nr, long nr, struct io_event __user *events, struct __kernel_timespec __user *timeout, const struct __aio_sigset *sig);")
SYSCALL(418,"mq_timedsend","asmlinkage long sys_mq_timedsend(mqd_t mqdes, const char __user *msg_ptr, size_t msg_len, unsigned int msg_prio, const struct __kernel_timespec __user *abs_timeout);")
SYSCALL(419,"mq_timedreceive","asmlinkage long sys_mq_timedreceive(mqd_t mqdes, char __user *msg_ptr, size_t msg_len, unsigned int __user *msg_prio, const struct __kernel_timespec __user *abs_timeout);")
SYSCALL(420,"semtimedop","asmlinkage long sys_semtimedop(int semid, struct sembuf __user *sops, unsigned nsops, const struct __kernel_timespec __user *timeout);")
SYSCALL(422,"futex","asmlinkage long sys_futex(u32 __user *uaddr, int op, u32 val, struct __kernel_timespec __user *utime, u32 __user *uaddr2, u32 val3);")
SYSCALL(423,"sched_rr_get_interval","asmlinkage long sys_sched_rr_get_interval(pid_t pid, struct __kernel_timespec __user *interval);")
SYSCALL(424,"pidfd_send_signal","asmlinkage long sys_pidfd_send_signal(int pidfd, int sig, siginfo_t __user *info, unsigned int flags);")
SYSCALL(425,"io_uring_setup","asmlinkage long sys_io_uring_setup(u32 entries, struct io_uring_params __user *p);")
SYSCALL(426,"io_uring_enter","asmlinkage long sys_io_uring_enter(unsigned int fd, u32 to_submit, u32 min_complete, u32 flags, const sigset_t __user *sig, size_t sigsz);")
SYSCALL(427,"io_uring_register","asmlinkage long sys_io_uring_register(unsigned int fd, unsigned int op, void __user *arg, unsigned int nr_args);")
SYSCALL(428,"open_tree","asmlinkage long sys_open_tree(int dfd, const char __user *path, unsigned flags);")
SYSCALL(429,"move_mount","asmlinkage long sys_move_mount(int from_dfd, const char __user *from_path, int to_dfd, const char __user *to_path, unsigned int ms_flags);")
SYSCALL(430,"fsopen","asmlinkage long sys_fsopen(const char __user *fs_name, unsigned int flags);")
SYSCALL(431,"fsconfig","asmlinkage long sys_fsconfig(int fs_fd, unsigned int cmd, const char __user *key, const void __user *value, int aux);")
SYSCALL(432,"fsmount","asmlinkage long sys_fsmount(int fs_fd, unsigned int flags, unsigned int ms_flags);")
SYSCALL(433,"fspick","asmlinkage long sys_fspick(int dfd, const char __user *path, unsigned int flags);")
SYSCALL(434,"pidfd_open","asmlinkage long sys_pidfd_open(pid_t pid, unsigned int flags);")
SYSCALL(435,"clone3","asmlinkage long sys_clone3(struct clone_args __user *uargs, size_t size);")
SYSCALL(436,"close_range","asmlinkage long sys_close_range(unsigned int fd, unsigned int max_fd, unsigned int flags);")
SYSCALL(437,"openat2","asmlinkage long sys_openat2(int dfd, const char __user *filename, struct open_how *how, size_t size);")
SYSCALL(438,"pidfd_getfd","asmlinkage long sys_pidfd_getfd(int pidfd, int fd, unsigned int flags);")
SYSCALL(439,"faccessat2","asmlinkage long sys_faccessat2(int dfd, const char __user *filename, int mode, int flags);")
SYSCALL(440,"process_madvise","asmlinkage long sys_process_madvise(int pidfd, const struct iovec __user *vec, size_t vlen, int behavior, unsigned int flags);")
