Client database runs on our own small driver instead of SQLocal: 2 fewer dependencies and no code which could start workers from `data:` URLs.
