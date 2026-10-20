---
layout: ../../layouts/post.astro
title: Audio Balance Support
---

Found a bug or have a question? Contact me at [jpark@duck.com](mailto:jpark@duck.com).

## Frequently asked questions

### How do I turn it on?

Open Audio Balance, turn it on, and choose the lock point. You can close the window afterward. The
background agent keeps the balance locked, even after you restart.

### How do I stop it running in the background?

Turn Audio Balance off in the app, or turn it off in **System Settings › General › Login Items &
Extensions**.

### Why does my balance drift in the first place?

AirPods and some other audio devices can reset or shift the left–right balance when they reconnect.
Audio Balance notices when the balance moves 2% or more from your lock point and puts it back.

### Does Audio Balance record my audio?

No. It only reads and sets your output device's balance through CoreAudio. It never records or
accesses audio content, and it makes no network connections.

### Which versions of macOS are supported?

macOS 15 Sequoia or later. On older Macs, try
[Balance Lock](https://www.tunabellysoftware.com/balance_lock/), which inspired Audio Balance and
supports macOS 10.12 and later.

[Privacy Policy](/audio-balance/privacy/)
