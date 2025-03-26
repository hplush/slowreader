#!/bin/bash
# Add all apps routes to __ROUTES__ template in config

awk 'NR==FNR{a=$0;next} {gsub("__ROUTES__", a)}1' ./routes.regexp ./nginx.conf > ./nginx.conf.compiled
