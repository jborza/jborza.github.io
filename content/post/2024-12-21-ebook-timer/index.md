---
layout: post
categories: tools
date:   2024-12-21 18:00:00 +0200
tags: [timer, ebook, pages]
title: "Calculating ebook pages"
image: epub_logo.png

---

I wanted to calculate the amount of pages per ebook, for statistical purposes. Most of the ebooks that I have are in the [epub](https://en.wikipedia.org/wiki/EPUB) format. This file type is easy to parse, as the book is technically a ZIP file with an .epub extension, that contains XHTML files as content.

The length in pages can be estimated by unzipping the entire book, then getting the text inside the (X)HTML file and calculating the number of characters. To make my job easier, I decided to use the [BeautifulSoup](https://pypi.org/project/beautifulsoup4/) library and its `get_text()` method. Once I have the number of characters in the entire book, I divide them by 1,800, which is roughly the amount of characters per page of a book.

The project is done in Python, [source code](https://github.com/jborza/calculate_pages_epub) on Github.
