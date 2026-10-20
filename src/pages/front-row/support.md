---
layout: ../../layouts/post.astro
title: Front Row Support
---

Found a bug or have a question? Open an issue on
[GitHub](https://github.com/itsjoshpark/FrontRow/issues) or contact me at
[jpark@duck.com](mailto:jpark@duck.com).

## Frequently asked questions

### Why do I need this?

Many movies and TV shows come with multichannel audio, but you'd normally need a full surround sound
setup to enjoy it. Spatial audio plays multichannel audio through regular headphones like AirPods
Pro, with much more depth and roominess. Few video players support it, so I built Front Row on
AVKit, which does.

### What about just using QuickTime Player?

That works too. I just didn't like QuickTime Player's keyboard shortcuts, or its large on-screen
controls that cover the video and subtitles.

### Can I play MKV files?

Not directly. Front Row uses AVKit (the same playback stack as QuickTime Player), which can't open
MKV files. But MKV is only a container, and it usually holds streams that Apple supports. When it
does, Front Row offers to convert the file to an MP4 next to the original. This needs
[ffmpeg](https://ffmpeg.org/download.html):

```
brew install ffmpeg
```

When the video and audio are both supported, they're copied as they are, which takes a few seconds.
When only the audio isn't supported (DTS, TrueHD, MP3, or multichannel Opus), just the audio is
re-encoded to AAC. Bitmap subtitles from Blu-ray and DVD can't go into an MP4, and Front Row warns
you before it starts.

### Can I convert the file myself instead?

Yes:

```
ffmpeg -i ./input.mkv -map 0 -c copy -tag:v hvc1 ./output.mp4
```

Add `-c:s mov_text` after `-c copy` to keep built-in subtitles, and use `-tag:v avc1` instead of
`hvc1` for H.264 video. If there's no audio afterward, re-encode it to AAC by adding
`-c:a aac_at -b:a 448k` after `-c copy`.

### I don't hear spatial audio through my supported headphones

Make sure the audio track has more than two channels, and turn on spatial audio from the audio
menu in the menu bar while the video is playing.

### Which versions of macOS are supported?

macOS 15.6 Sequoia or later, on Apple Silicon (M1 and later).

[Privacy Policy](/front-row/privacy/)
