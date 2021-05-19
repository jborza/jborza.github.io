---
layout: post
title:  "Logging setup"
date:   2020-10-04 12:00:00 +0200
categories: infrastructure
tags: [elasticsearch, kibana]
draft: true
---

EFK stack: 
ElasticSearch, Filebeat, Kibana

Filebeat config:
- apache module enabled
  - var.path set to log synchronized from the FTP server
- filebeat 

Using ES 7.9 and Kibana 7.9, all OSS distributions