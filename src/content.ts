// Everything the site says, in one place. The device draws it on the screen and the printer, and the build writes
// it into each page as plain HTML (scripts/prerender.ts), so every address can be read without JavaScript.

/**
 * A block of an app's support or privacy text: a heading, a paragraph, a bullet, or a command to type. Paragraphs and
 * bullets can hold links as `[label](url)`; email addresses become links by themselves (see {@link parseLinks}).
 */
export type Block = ["h" | "p" | "li" | "code", string];

/** A link in running text: the label is `text.slice(start, end)`. */
export interface TextLink {
  start: number;
  end: number;
  url: string;
}

/** "Ask on [GitHub](https://…) or email jpark@duck.com" -> the text without the markup, and where each link is. */
export function parseLinks(s: string): { text: string; links: TextLink[] } {
  const links: TextLink[] = [];
  let text = "",
    last = 0;
  for (const m of s.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) {
    text += s.slice(last, m.index);
    const label = m[1] ?? m[0];
    links.push({ start: text.length, end: text.length + label.length, url: m[2] ?? `mailto:${m[0]}` });
    text += label;
    last = m.index + m[0].length;
  }
  return { text: text + s.slice(last), links };
}

export interface Work {
  slug: string;
  name: string;
  uses: string;
  /** Key of the picture in the device's picture set. */
  img: string;
  url?: string;
  desc: string;
}

export interface App {
  path: string;
  name: string;
  uses: string;
  /** Key of the app's pixel icon on the screen. */
  icon: string;
  /** Key of the app's screenshot in the device's picture set. */
  shot?: string;
  desc: string;
  links: [label: string, url: string][];
  features?: string[];
  req?: string;
  support?: Block[];
  privacy?: Block[];
}

export interface Job {
  when: string;
  role: string;
  at: string;
}

export const EMAIL = "jpark@duck.com";

export const profile = {
  name: "Joshua Park",
  role: "Software engineer, United States",
  intro: "I build full-stack web and mobile apps.",
  skills: "Angular · React · React Native · Swift · Vue · C# · .NET",
  links: [
    { name: "GitHub", label: "github.com/itsjoshpark", url: "https://github.com/itsjoshpark" },
    {
      name: "LinkedIn",
      label: "linkedin.com/in/joshua-park-profile",
      url: "https://www.linkedin.com/in/joshua-park-profile/",
    },
  ],
};

export const contact = {
  title: "Contact",
  intro: "Email me and I'll get back to you.",
};

export const work: Work[] = [
  {
    slug: "quickscores",
    name: "QuickScores",
    uses: "React Native",
    img: "quickscores",
    url: "https://www.quickscores.com/",
    desc: "Built a cross-platform mobile app that streamlined game schedule tracking and real-time team messaging.",
  },
  {
    slug: "asset-management",
    name: "Asset management software",
    uses: "Angular",
    img: "nda",
    desc: "Engineered an AI-powered asset management system to index and organize 100+ TB of media.",
  },
  {
    slug: "translation-approval",
    name: "Translation approval system",
    uses: "Angular",
    img: "nda",
    desc: "Led development of a centralized translation approval system used by 95+ branch offices worldwide.",
  },
  {
    slug: "analytics-platform",
    name: "Analytics platform",
    uses: "Angular",
    img: "nda",
    desc: "Led development of a data analytics platform which tracks 1,000+ language translations, enabling streamlined translation approvals.",
  },
  {
    slug: "nj-sharing-network",
    name: "NJ Sharing Network",
    uses: "React",
    img: "nda",
    desc: "Built a high-stakes lab portal coordinating critical donated organ distribution across New Jersey hospital networks.",
  },
  {
    slug: "briones-law-firm",
    name: "Briones Law Firm",
    uses: "SvelteKit",
    img: "briones",
    desc: "Built a responsive website for a law firm specializing in complex corporate litigation.",
  },
  {
    slug: "vision2home",
    name: "Vision2Home",
    uses: "SvelteKit",
    img: "vision2home",
    url: "https://www.vision2home.com/",
    desc: "Designed and developed a responsive showcase site for accessory dwelling units (ADUs).",
  },
];

export const apps: App[] = [
  {
    path: "/personal/peek-for-safari/",
    name: "Peek for Safari",
    uses: "Safari Extension",
    icon: "peek",
    shot: "ss-peek",
    desc: "Inspired by Arc's Peek. Preview a link without opening a new tab.",
    links: [["Download on the App Store", "https://apps.apple.com/app/id6820756584"]],
    features: [
      "Shift+Click (or Shift+middle-click) any link to open it in an overlay.",
      "Refresh, copy the link, and switch between Auto, Light, and Dark themes from the header.",
      "Open the page in a new tab, or close the preview with Esc or a click outside.",
      "Turn Shift+Click off for a site from the toolbar button, for web apps that use Shift+Click themselves.",
      "The preview nearly fills the window, stays centered, and follows the window as you resize it.",
      "Sites that forbid embedding open in a peek-sized popup window instead. Close it with Cmd+W.",
    ],
    req: "Safari 27 or later, on macOS 15 Sequoia or later.",
    support: [
      ["p", "Found a bug or have a question? Email jpark@duck.com."],
      ["h", "How do I turn it on?"],
      [
        "p",
        "Open Peek for Safari once, then go to Safari > Settings > Extensions, turn on Peek for Safari, and allow it on All Websites. Hold Shift and click any link to preview it.",
      ],
      ["h", "Why do some sites open in a popup window instead of the overlay?"],
      [
        "p",
        "Some sites (GitHub, many news and login-protected sites) don't allow other pages to embed them, so Peek for Safari shows them in a peek-sized popup window instead. Close it with Cmd+W.",
      ],
      ["h", "How do I turn Shift+Click off for a site?"],
      [
        "p",
        "Click the Peek for Safari button in Safari's toolbar and turn off the switch for that site. This is handy for web apps that use Shift+Click themselves, or to get Safari's Add to Reading List back on that site. Turn the switch back on any time.",
      ],
      ["h", "A page doesn't work properly in the preview. What can I do?"],
      [
        "p",
        "Some sites detect being embedded or block cookies in embedded pages, so they may not work fully in the overlay. Use Open in new tab on the side of the preview to open the page normally.",
      ],
      ["h", "Which versions of Safari and macOS are supported?"],
      ["p", "Safari 27 or later, on macOS 15 Sequoia or later."],
    ],
    privacy: [
      ["p", "Last updated: 2026-10-08"],
      [
        "p",
        "Peek for Safari is a Safari extension that shows a link in an overlay when you Shift+Click it. It runs entirely on your Mac and does not collect, store, transmit, or sell any user data.",
      ],
      ["h", "Data collection"],
      [
        "li",
        "None. Peek for Safari does not collect personal information, browsing history, page contents, cookies, or identifiers, and has no analytics or telemetry.",
      ],
      [
        "li",
        "Local settings only. Your theme choice (Auto / Light / Dark) and the sites where you turned Shift+Click off (their host names only) are saved in Safari's extension storage on your Mac.",
      ],
      ["h", "Permissions"],
      [
        "li",
        "Access to all websites: needed to detect Shift+Click on links on any page, show the preview overlay there, and check whether the linked site allows being embedded.",
      ],
      [
        "p",
        "Before showing a preview, Peek for Safari requests the linked page once from your Mac to read its response headers and decide whether it can be shown in the overlay or needs a popup window. This is the same request your browser makes when you open the link.",
      ],
      [
        "p",
        "The previewed page loads directly from its website, exactly as if you had opened it. No data passes through any server operated by Peek for Safari.",
      ],
      ["h", "Contact"],
      ["p", "Questions or concerns: email jpark@duck.com."],
    ],
  },
  {
    path: "/personal/audio-balance/",
    name: "Audio Balance",
    uses: "SwiftUI",
    icon: "audio",
    shot: "ss-audio",
    desc: "Keeps your Mac's left-right audio balance locked where you set it. AirPods and some other devices sometimes drift off-center.",
    links: [["Download on the App Store", "https://apps.apple.com/app/id6817587097"]],
    features: [
      "Locks your output device's left-right balance at the point you choose, and restores it when it drifts 2% or more.",
      "Runs as a background agent you never see, with no menu bar icon. It keeps working after you close the window or restart.",
      "Follows your default output device as you switch between AirPods, speakers, and other devices.",
      "Optional notifications tell you when the balance was restored.",
      "The settings window shows the current device, its balance, and the last correction.",
      "Open source, with no data collected and no network connections.",
    ],
    req: "macOS 15 Sequoia or later.",
    support: [
      ["p", "Found a bug or have a question? Email jpark@duck.com."],
      ["h", "How do I turn it on?"],
      [
        "p",
        "Open Audio Balance, turn it on, and choose the lock point. You can close the window afterward. The background agent keeps the balance locked, even after you restart.",
      ],
      ["h", "How do I stop it running in the background?"],
      [
        "p",
        "Turn Audio Balance off in the app, or turn it off in System Settings > General > Login Items & Extensions.",
      ],
      ["h", "Why does my balance drift in the first place?"],
      [
        "p",
        "AirPods and some other audio devices can reset or shift the left-right balance when they reconnect. Audio Balance notices when the balance moves 2% or more from your lock point and puts it back.",
      ],
      ["h", "Does Audio Balance record my audio?"],
      [
        "p",
        "No. It only reads and sets your output device's balance through CoreAudio. It never records or accesses audio content, and it makes no network connections.",
      ],
      ["h", "Which versions of macOS are supported?"],
      [
        "p",
        "macOS 15 Sequoia or later. On older Macs, try [Balance Lock](https://www.tunabellysoftware.com/balance_lock/), which inspired Audio Balance and supports macOS 10.12 and later.",
      ],
    ],
    privacy: [
      ["p", "Last updated: 2026-09-29"],
      [
        "p",
        "Audio Balance is a macOS app that keeps your output device's left-right balance locked where you set it. It runs entirely on your Mac and does not collect, store, transmit, or sell any user data.",
      ],
      ["h", "Data collection"],
      [
        "li",
        "None. Audio Balance does not collect personal information or identifiers, and has no analytics or telemetry. It makes no network connections.",
      ],
      [
        "li",
        "Local settings only. Your lock point, notification preference, and the time and device name of the last correction are saved in the app's sandboxed group container on your Mac.",
      ],
      ["h", "Permissions"],
      [
        "li",
        "Login Items: the background agent is registered with macOS so it can keep the balance locked after you close the window or restart. You can turn it off in System Settings > General > Login Items & Extensions.",
      ],
      [
        "li",
        "Notifications (optional): used only to tell you when the balance was restored. Notifications are posted locally and can be turned off in the app or in System Settings.",
      ],
      [
        "p",
        "Audio Balance reads and sets the balance of your default output device through CoreAudio. It never records or accesses audio content.",
      ],
      ["h", "Contact"],
      ["p", "Questions or concerns: email jpark@duck.com."],
    ],
  },
  {
    path: "/personal/mochi-diffusion/",
    name: "Mochi Diffusion",
    uses: "SwiftUI",
    icon: "mochi",
    shot: "ss-mochi",
    desc: "A native Mac app that runs Stable Diffusion.",
    links: [["Source on GitHub", "https://github.com/MochiDiffusion/MochiDiffusion"]],
  },
  {
    path: "/personal/front-row/",
    name: "Front Row",
    uses: "SwiftUI",
    icon: "frontrow",
    shot: "ss-frontrow",
    desc: "Play HDR videos and spatial audio natively on your Mac.",
    links: [
      ["Download for Mac", "https://github.com/itsjoshpark/FrontRow/releases/latest"],
      ["Source on GitHub", "https://github.com/itsjoshpark/FrontRow"],
    ],
    features: [
      "Plays HDR video with accurate color, and multichannel audio as spatial audio on AirPods and other supported headphones.",
      "Small on-screen controls that stay clear of the video and subtitles, plus keyboard shortcuts: Space or K to play, Left and Right arrows to skip, Cmd+G to go to a time, Cmd+[ and Cmd+] to change speed, and M to mute.",
      "Switch audio tracks and subtitles, change playback speed, and pick up where you left off.",
      "The Inspector (Cmd+I) shows a file's format, tracks, and codecs.",
      "Opens MKV files by converting them to MP4 with ffmpeg. Streams are copied without re-encoding whenever possible.",
      "Open a video from a URL, control playback with media keys and Now Playing, and get updates automatically.",
      "Open source.",
    ],
    req: "macOS 15.6 Sequoia or later on Apple Silicon (M1 and later). HDR needs an HDR-capable Mac, and spatial audio needs supported headphones.",
    support: [
      [
        "p",
        "Found a bug or have a question? Open an issue on [GitHub](https://github.com/itsjoshpark/FrontRow/issues) or email jpark@duck.com.",
      ],
      ["h", "Why do I need this?"],
      [
        "p",
        "Many movies and TV shows come with multichannel audio, but you'd normally need a full surround sound setup to enjoy it. Spatial audio plays multichannel audio through regular headphones like AirPods Pro, with much more depth and roominess. Few video players support it, so I built Front Row on AVKit, which does.",
      ],
      ["h", "What about just using QuickTime Player?"],
      [
        "p",
        "That works too. I just didn't like QuickTime Player's keyboard shortcuts, or its large on-screen controls that cover the video and subtitles.",
      ],
      ["h", "Can I play MKV files?"],
      [
        "p",
        "Not directly. Front Row uses AVKit (the same playback stack as QuickTime Player), which can't open MKV files. But MKV is only a container, and it usually holds streams that Apple supports. When it does, Front Row offers to convert the file to an MP4 next to the original. This needs [ffmpeg](https://ffmpeg.org/download.html):",
      ],
      ["code", "brew install ffmpeg"],
      [
        "p",
        "When the video and audio are both supported, they're copied as they are, which takes a few seconds. When only the audio isn't supported (DTS, TrueHD, MP3, or multichannel Opus), just the audio is re-encoded to AAC. Bitmap subtitles from Blu-ray and DVD can't go into an MP4, and Front Row warns you before it starts.",
      ],
      ["h", "Can I convert the file myself instead?"],
      ["p", "Yes:"],
      ["code", "ffmpeg -i ./input.mkv -map 0 -c copy -tag:v hvc1 ./output.mp4"],
      [
        "p",
        "Add `-c:s mov_text` after `-c copy` to keep built-in subtitles, and use `-tag:v avc1` instead of `hvc1` for H.264 video. If there's no audio afterward, re-encode it to AAC by adding `-c:a aac_at -b:a 448k` after `-c copy`.",
      ],
      ["h", "I don't hear spatial audio through my supported headphones"],
      [
        "p",
        "Make sure the audio track has more than two channels, and turn on spatial audio from the audio menu in the menu bar while the video is playing.",
      ],
      ["h", "Which versions of macOS are supported?"],
      ["p", "macOS 15.6 Sequoia or later, on Apple Silicon (M1 and later)."],
    ],
    privacy: [
      ["p", "Last updated: 2026-10-19"],
      [
        "p",
        "Front Row is a macOS video player for HDR video and spatial audio. It plays your files on your Mac and does not collect, store, transmit, or sell any user data.",
      ],
      ["h", "Data collection"],
      [
        "li",
        "None. Front Row does not collect personal information or identifiers, and has no analytics or telemetry.",
      ],
      [
        "li",
        "Local settings only. Your recent files, where you left off in each one, and preferences such as the skip interval are saved on your Mac in the app's preferences.",
      ],
      ["h", "Network connections"],
      [
        "li",
        "Updates: Front Row checks GitHub for new versions using [Sparkle](https://sparkle-project.org). This is an ordinary request to GitHub and sends no information about you or your files.",
      ],
      ["li", "Open URL: when you open a video from a URL, Front Row connects only to the address you enter."],
      ["h", "Converting files"],
      ["p", "MKV conversion runs entirely on your Mac using the ffmpeg you installed. Your files are never uploaded."],
      ["h", "Contact"],
      ["p", "Questions or concerns: email jpark@duck.com."],
    ],
  },
  {
    path: "/personal/charge-limiter/",
    name: "Charge Limiter",
    uses: "AppleScript",
    icon: "charge",
    desc: "A simple macOS app to set the battery charge limit for Intel MacBooks.",
    links: [["Source on GitHub", "https://github.com/itsjoshpark/charge-limiter"]],
  },
  {
    path: "/personal/aperture/",
    name: "Aperture",
    uses: "Vue",
    icon: "aperture",
    desc: "Browse, reorder, and delete images on your computer right from your browser.",
    links: [["Open Aperture", "https://joshuapark.dev/aperture"]],
  },
  {
    path: "/personal/coffee-ratio/",
    name: "Coffee Ratio",
    uses: "Angular",
    icon: "coffee",
    desc: "A mobile-friendly web app that calculates the amount of beans needed for brewing coffee.",
    links: [["Open Coffee Ratio", "https://joshuapark.dev/coffee-ratio/"]],
  },
];

export const jobs: Job[] = [
  { when: "2025 - NOW", role: "Senior Software Engineer", at: "The Smyth Group" },
  { when: "2017 - NOW", role: "Senior Software Engineer", at: "Watchtower, Inc." },
  { when: "2012 - 2025", role: "Front-End Engineer", at: "Freelance" },
  { when: "2015 - 2017", role: "Systems Engineer", at: "Edu Tek Ltd." },
];
