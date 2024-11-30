With Hugo:

develop:
```bash
hugo server
```

In case caching needs to be disabled (css changes, etc)
```bash
hugo server --noHTTPCache --ignoreCache --disableFastRender
```
Usage: https://gohugo.io/getting-started/usage/

build:

```bash
hugo --gc --theme=hugo-vitae -b http://jborza.com/
```

run:

```bash
hugo server -D -F --theme=hugo-vitae
```

### Displaying drafts and future articles

- use the `-D` option for drafts
- use the `-F` option for content with `date` in the future