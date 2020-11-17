---
layout: post
title:  "Agile retrospective board"
date:   2020-11-15 20:00:00 +0200
categories: programming
tags: [elixir]
image: /assets/????
published: false
---

Agile retrospective board.

API design:

Get all posts:
GET /items

Create post:
POST /items  { message: "my first item" } -> returns item ID
 
Upvote:
POST /items/votes  //generates a point id

Move:
PUT /items/1234 { sectionId: "new_section" }

Delete:
DELETE /items/1234

Going forward with the tutorial on https://www.phoenixframework.org/ (using LiveView)

Before `mix phx.server`: 

Had to install PostgreSQL on my ubuntu WSL
Then change the password for the user `postgres` to `postgres` with:

```sh
sudo -u postgres psql
postgres=# \password postgres
```

Phoenix reminded us to create migrations.

Data entry template lives in post_live/form_component.html.leex

Validations for the post were in demo/timeline/post.ex

Reset database: `mix ecto.reset`