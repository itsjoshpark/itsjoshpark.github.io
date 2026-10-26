// The device: a screen, three keys, a power rocker and a printer. The phone (a handheld) and the desktop (a wall of
// 1960s machines) share this engine. The desktop adds the wall around them: a tape unit, taller renders for taller
// windows, and a cut key.
import { apps, contact, EMAIL, jobs, parseLinks, profile, work } from "../content.ts";
import { documentTitle, ROOT, routes } from "../routes.ts";
import { clean, drawRich, drawStr, keepCode, measure, OUT, STY, wrap } from "./fonts.ts";
import { ICONS } from "./icons.ts";
import { sfx } from "./sound.ts";
import { makeTape, noTape, type Tape } from "./tape.ts";
import type { WallMeta } from "./desktop.ts";

export interface DeviceSetup {
  /** The desktop wall instead of the phone. */
  desk: boolean;
  /** Phone: its sprites by name. */
  sprites?: Record<string, string>;
  /** Desktop: the sprites of each wall render, and where its parts are. */
  walls?: Record<string, string>[];
  metas?: WallMeta[];
  /** Photos and screenshots by name, dithered on the screen and the paper. */
  pics: Record<string, string>;
}

export function startDevice({ desk: DESK, sprites, walls, metas: METAS, pics: IMGS }: DeviceSetup) {
  let META = DESK ? METAS[0] : null;
  // the desktop paper window spans the bay, or the paper when it is wider than the bay, with room for its side shadows
  const winL = () => Math.min(META.bay[0], META.paper[0] - META.pxcm),
    winR = () => Math.max(META.bay[2], META.paper[2] + META.pxcm);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement.style;
  const SPRV = DESK
    ? {
        "--bg": "bg",
        "--keys": "keys",
        "--cut": "cut",
        "--pw-on": "power-on",
        "--pw-off": "power-off",
        "--rdy-off": "rdy-off",
        "--tl-off": "tl-off",
      }
    : {
        "--keys": "keys",
        "--grille": "grille",
        "--rk-on": "rocker-on",
        "--rk-off": "rocker-off",
        "--slot": "slot",
        "--pw-on": "power-on",
        "--pw-off": "power-off",
      };
  if (!DESK) for (const [k, v] of Object.entries(SPRV)) root.setProperty(k, `url(${sprites[v]})`);
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 160;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    root.setProperty("--grain", `url(${c.toDataURL()})`);
    root.setProperty("--grain-size", 256 / (devicePixelRatio || 1) + "px");
  } catch {}

  // key columns: the bank is one render; each column shows its own slice of the up, selected or pressed render
  const cols = [...document.querySelectorAll<HTMLElement>(".col")];
  function splitKeys() {
    const KB = DESK ? META.keys : [0, 0, 380],
      KW = KB[2] - KB[0];
    const SPLITS = DESK ? [0, META.splits[0] - KB[0], META.splits[1] - KB[0], KW] : [0, 129.17, 250.83, 380];
    cols.forEach((c, i) => {
      const a = SPLITS[i],
        w = SPLITS[i + 1] - a;
      c.style.left = (a / KW) * 100 + "%";
      c.style.width = (w / KW) * 100 + "%";
      c.style.backgroundSize = `${(KW / w) * 100}% 1000%`;
      c.style.setProperty("--x", `${(a / (KW - w)) * 100}%`);
    });
  }

  /* ---------- the wall: scaled so the middle 240 cm fit, centered; parts are placed from the render's rects ---------- */
  const wallEl = document.getElementById("wall"); // desktop only
  let K = 1,
    WT = 0; // css px per image px; the wall's top in the window
  const box = (el, r, pad = 0) =>
    Object.assign(el.style, {
      left: (r[0] - pad) * K + "px",
      top: (r[1] - pad) * K + "px",
      width: (r[2] - r[0] + 2 * pad) * K + "px",
      height: (r[3] - r[1] + 2 * pad) * K + "px",
    });
  // each render shows 240 cm across the middle; the taller ones have a taller tube and printer bay. The one closest to
  // the window's shape is used, and any rest is filled by the stretched edges, as before
  let VI = -1;
  const viewH = (m) => m.img[1] / m.pxcm;
  function pickWall() {
    const want = (240 * innerHeight) / innerWidth,
      d = (m) => Math.abs(Math.log(viewH(m) / want));
    let best = 0;
    METAS.forEach((m, i) => {
      if (d(m) < d(METAS[best])) best = i;
    });
    return best;
  }
  function useWall(i) {
    const first = VI < 0;
    VI = i;
    META = METAS[i];
    const S = walls[i];
    for (const [k, v] of Object.entries(SPRV)) root.setProperty(k, `url(${S[v]})`);
    const im = new Image();
    im.onload = () => {
      if (VI === i)
        try {
          edges(im);
        } catch {}
    };
    im.src = S.bg;
    if (!(first && i === 0)) {
      tape.kill();
      tape = makeTape(META, reduce);
      if (!power) tape.power(false);
    } // the reels are drawn in the render's pixels
    splitKeys();
    placePaper();
  }
  function layoutWall() {
    const wi = pickWall();
    if (wi !== VI) useWall(wi);
    const vw = innerWidth,
      vh = innerHeight,
      s = Math.min(vh / viewH(META), vw / 240);
    K = s / META.pxcm;
    const W = META.img[0] * K,
      H = META.img[1] * K,
      L = Math.round((vw - W) / 2);
    WT = Math.round(vh - H); // extra height goes above: the cabinets just stand taller
    Object.assign(wallEl.style, { left: L + "px", top: WT + "px", width: W + "px", height: H + "px" });
    // the edge rows and columns of the render, stretched out to the window edges
    const ex = (id, l, t, w, h) =>
      Object.assign(document.getElementById(id).style, {
        left: l + "px",
        top: t + "px",
        width: w + "px",
        height: h + "px",
      });
    ex("extT", 0, -WT, W, WT + 1);
    ex("extB", 0, H - 1, W, vh - WT - H + 1);
    ex("extL", -L, 0, L + 1, H);
    ex("extR", W - 1, 0, vw - L - W + 1, H);
    box(screenEl, META.screen);
    box(document.getElementById("halo"), META.screen, 40);
    box(document.getElementById("keys"), META.keys);
    box(document.getElementById("pwr"), META.power);
    box(document.getElementById("snd"), META.rocker);
    const sl = META.slit[1]; // the paper window runs from the slit under the printer down to the bottom of the browser window
    Object.assign(pwin.style, {
      left: winL() * K + "px",
      width: (winR() - winL()) * K + "px",
      top: sl * K + "px",
      height: vh - WT - sl * K + "px",
    });
    box(document.getElementById("glassw"), META.glass);
    document.getElementById("glassw").style.setProperty("--gr", META.glassR * K + "px");
    const rd = META.read,
      lr = 2.2 * META.pxcm;
    box(document.getElementById("readLamp"), [rd[0] - lr, rd[1] - lr, rd[0] + lr, rd[1] + lr]);
    box(document.getElementById("cutk"), META.cut);
    box(document.getElementById("rdyOff"), META.rdy);
    box(document.getElementById("tlOff"), META.tlamps);
  }
  // the stretched edges come from the render itself: its outermost row or column of pixels
  function edges(im) {
    const c = document.createElement("canvas"),
      g = c.getContext("2d"),
      w = im.naturalWidth,
      h = im.naturalHeight;
    const strip = (id, sx, sy, sw, sh) => {
      c.width = sw;
      c.height = sh;
      g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
      document.getElementById(id).style.backgroundImage = `url(${c.toDataURL()})`;
    };
    strip("extT", 0, 0, w, 1);
    strip("extB", 0, h - 1, w, 1);
    strip("extL", 0, 0, 1, h);
    strip("extR", w - 1, 0, 1, h);
  }

  // step a key through the frames of its travel: about 70 ms down, a little slower back up
  function animKey(c, to) {
    cancelAnimationFrame(c._ka);
    const cur = c.style.getPropertyValue("--t"),
      from = cur !== "" ? +cur : to ? 0 : 4;
    if (reduce || from === to) {
      c.style.removeProperty("--t");
      return;
    }
    const ms = to > from ? 70 : 110,
      t0 = performance.now() - 16;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      if (p < 1) {
        c.style.setProperty("--t", Math.round(from + (to - from) * p));
        c._ka = requestAnimationFrame(step);
      } else c.style.removeProperty("--t");
    };
    step(performance.now());
  }

  let tape: Tape = DESK ? makeTape(META, reduce) : noTape;

  /* ---------- screen: a 1-bit buffer at 2 css px per pixel ---------- */
  let PITCH = 2;
  const BAR = 0; // no status bar: the lit key shows where you are
  const screenEl = document.getElementById("screen"),
    lcd = document.getElementById("lcd") as HTMLCanvasElement,
    glow = document.getElementById("glow") as HTMLCanvasElement,
    sr = document.getElementById("sr");
  let BW = 160,
    BH = 200,
    dpr = 1,
    buf,
    bufG,
    grid,
    img;
  const LIT = [255, 160, 52],
    DIM = [112, 56, 16],
    OFF = [40, 19, 5]; // DIM is a half-lit pixel, used for divider lines
  // a superellipse, like a picture tube: round corners `depth` px deep on the diagonal and gently bulging sides, at any size
  function squircle(x0, y0, w, h, depth, n = 120) {
    const k = (half) => Math.LN2 / -Math.log(1 - depth / half),
      nx = k(w / 2),
      ny = k(h / 2),
      pts = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2,
        c = Math.cos(t),
        s = Math.sin(t);
      pts.push([
        x0 + w / 2 + (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / nx),
        y0 + h / 2 + (h / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / ny),
      ]);
    }
    return pts;
  }
  const pathOf = (pts) => "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
  function tubeShape(w, h) {
    // the corner depth of the glass: on the desktop the same as the mask in the render; on the phone the mask and the
    // recess around it are drawn here and follow the same curve
    const TUBE = DESK ? META.tubeDepth * K : 16;
    screenEl.style.clipPath = `polygon(${squircle(0, 0, w, h, TUBE)
      .map((p) => p[0].toFixed(1) + "px " + p[1].toFixed(1) + "px")
      .join(",")})`;
    if (!DESK) {
      const bz = screenEl.parentElement,
        B = bz.getBoundingClientRect(),
        bw = B.width,
        bh = B.height;
      const L = screenEl.offsetLeft,
        T = screenEl.offsetTop;
      // the recess in the plastic: a chamfered lip, a black mask with a shadow along its top, and a thin glass edge
      const rec = pathOf(squircle(5, 5, bw - 10, bh - 10, TUBE + 2)),
        lip = pathOf(squircle(3.5, 3.5, bw - 7, bh - 7, TUBE + 2.5)),
        glass = pathOf(squircle(L - 0.8, T - 0.8, w + 1.6, h + 1.6, TUBE));
      document.getElementById("frame").innerHTML = `
        <defs><linearGradient id="lipG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0e0e"/><stop offset=".5" stop-color="#242323"/><stop offset="1" stop-color="#4d4b4b"/></linearGradient>
          <linearGradient id="maskG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0a09"/><stop offset="1" stop-color="#191816"/></linearGradient>
          <clipPath id="recC"><path d="${rec}"/></clipPath><filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>
        <path d="${lip}" fill="url(#lipG)"/>
        <path d="${rec}" fill="url(#maskG)"/>
        <g clip-path="url(#recC)"><path d="${rec}" fill="none" stroke="#000" stroke-width="6" opacity=".6" filter="url(#soft)"/></g>
        <path d="${glass}" fill="#050403" stroke="rgba(255,236,210,.10)" stroke-width="1"/>`;
    }
    // the domed glass: dark toward the rim, a broad soft light high on the left, a window's curved reflection, a hot spot, and a lit rim
    const R = (f) => (f * w).toFixed(1),
      Rh = (f) => (f * h).toFixed(1),
      rim = pathOf(squircle(1.2, 1.2, w - 2.4, h - 2.4, TUBE - 1));
    document.getElementById("dome").setAttribute("viewBox", `0 0 ${w} ${h}`);
    document.getElementById("dome").innerHTML = `
      <defs><radialGradient id="vig" cx=".5" cy=".46" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>
        <radialGradient id="glow1"><stop offset="0" stop-color="#fff6e8" stop-opacity=".16"/><stop offset=".5" stop-color="#fff6e8" stop-opacity=".06"/><stop offset="1" stop-color="#fff6e8" stop-opacity="0"/></radialGradient>
        <radialGradient id="hot"><stop offset="0" stop-color="#fffaf2" stop-opacity=".38"/><stop offset="1" stop-color="#fffaf2" stop-opacity="0"/></radialGradient>
        <linearGradient id="win" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff4e4" stop-opacity=".16"/><stop offset="1" stop-color="#fff4e4" stop-opacity="0"/></linearGradient>
        <linearGradient id="rimG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2e0" stop-opacity=".32"/><stop offset=".35" stop-color="#fff2e0" stop-opacity="0"/><stop offset=".8" stop-color="#ffd9a8" stop-opacity="0"/><stop offset="1" stop-color="#ffd9a8" stop-opacity=".14"/></linearGradient>
        <filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter></defs>
      <rect width="${w}" height="${h}" fill="url(#vig)"/>
      <ellipse cx="${R(0.38)}" cy="${Rh(0.2)}" rx="${R(0.55)}" ry="${Rh(0.26)}" fill="url(#glow1)"/>
      <path d="M${R(0.1)} ${Rh(0.05)} Q${R(0.36)} ${Rh(0.015)} ${R(0.62)} ${Rh(0.035)} Q${R(0.6)} ${Rh(0.17)} ${R(0.55)} ${Rh(0.29)} Q${R(0.3)} ${Rh(0.3)} ${R(0.07)} ${Rh(0.34)} Q${R(0.06)} ${Rh(0.18)} ${R(0.1)} ${Rh(0.05)}Z" fill="url(#win)" filter="url(#blur3)"/>
      <ellipse cx="${R(0.25)}" cy="${Rh(0.085)}" rx="${R(0.09)}" ry="${Rh(0.022)}" fill="url(#hot)" transform="rotate(-8 ${R(0.25)} ${Rh(0.085)})"/>
      <path d="${rim}" fill="none" stroke="url(#rimG)" stroke-width="1.6"/>`;
  }
  function resize() {
    if (DESK) layoutWall();
    const r = screenEl.getBoundingClientRect();
    dpr = Math.min((devicePixelRatio || 1) * (+document.documentElement.dataset.zoom || 1), 3); // a tablet's page is zoomed (main.ts)
    tubeShape(r.width, r.height);
    if (DESK) PITCH = Math.max(Math.ceil(1.5 * dpr) / dpr, Math.floor((r.width / 240) * dpr) / dpr); // about 240 dots across, each a whole number of device pixels
    BW = Math.max(100, Math.floor((r.width - 4) / PITCH));
    BH = Math.max(80, Math.floor((r.height - 4) / PITCH));
    for (const c of [lcd, glow]) {
      c.style.width = BW * PITCH + "px";
      c.style.height = BH * PITCH + "px";
    }
    lcd.width = Math.round(BW * PITCH * dpr);
    lcd.height = Math.round(BH * PITCH * dpr);
    glow.width = BW;
    glow.height = BH;
    buf = document.createElement("canvas");
    buf.width = BW;
    buf.height = BH;
    bufG = buf.getContext("2d");
    img = bufG.createImageData(BW, BH);
    // pixel-gap overlay drawn once per size: one device pixel, light, so strokes stay solid
    grid = document.createElement("canvas");
    grid.width = lcd.width;
    grid.height = lcd.height;
    const gg = grid.getContext("2d");
    gg.fillStyle = "rgba(12,5,0,.38)";
    const cell = PITCH * dpr,
      gap = 1;
    for (let x = 0; x < BW; x++) gg.fillRect(Math.round((x + 1) * cell) - gap, 0, gap, grid.height);
    for (let y = 0; y < BH; y++) gg.fillRect(0, Math.round((y + 1) * cell) - gap, grid.width, gap);
    if (stack.length) {
      relayoutAll();
      draw();
    }
    reflowPaper();
  }

  /* ---------- views are laid out into a tall 1-bit bitmap with tap regions ---------- */
  const imgs = {};
  const getImg = (k) =>
    imgs[k] ||
    (imgs[k] = new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = IMGS[k];
    }));
  const loaded = {};
  const scratch = document.createElement("canvas"),
    sg = scratch.getContext("2d", { willReadFrequently: true });
  function picLum(im, w, h) {
    // luminance with the darkest and lightest 2% clipped, then a gentle S curve
    scratch.width = w;
    scratch.height = h;
    sg.imageSmoothingEnabled = true;
    sg.imageSmoothingQuality = "high";
    sg.drawImage(im, 0, 0, w, h);
    const d = sg.getImageData(0, 0, w, h).data,
      n = w * h,
      L = new Float32Array(n),
      hist = new Uint32Array(256);
    let raw = 0;
    for (let i = 0; i < n; i++) {
      const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      L[i] = v;
      raw += v;
      hist[v | 0]++;
    }
    let lo = 0,
      hi = 255,
      acc = 0;
    while (lo < 254 && (acc += hist[lo]) < n * 0.02) lo++;
    acc = 0;
    while (hi > 1 && (acc += hist[hi]) < n * 0.02) hi--;
    if (hi - lo < 24) {
      lo = 0;
      hi = 255;
    }
    for (let i = 0; i < n; i++) {
      const t = Math.min(1, Math.max(0, (L[i] - lo) / (hi - lo)));
      L[i] = (t * t * (3 - 2 * t) * 0.75 + t * 0.25) * 255;
    }
    return { L, mean: raw / n };
  }
  function atkinson(L, w, h, ink, n = 2) {
    // each dot's level, 0 to n-1 by brightness; with two levels, 1 is where a dot goes: the light parts on the screen, the dark parts on paper (ink)
    const e = Float32Array.from(L),
      out = new Uint8Array(w * h),
      st = 255 / (n - 1);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x,
          q = Math.max(0, Math.min(n - 1, Math.round(e[i] / st))),
          err = (e[i] - q * st) / 8;
        out[i] = ink ? n - 1 - q : q;
        if (x + 1 < w) e[i + 1] += err;
        if (x + 2 < w) e[i + 2] += err;
        if (y + 1 < h) {
          if (x > 0) e[i + w - 1] += err;
          e[i + w] += err;
          if (x + 1 < w) e[i + w + 1] += err;
        }
        if (y + 2 < h) e[i + 2 * w] += err;
      }
    return out;
  }
  function layout(spec) {
    const W = BW,
      M = 6,
      TW = W - 2 * M - 5,
      CAP = 3000,
      bits = new Uint8Array(W * CAP); // TW leaves room for the scroll bar
    let y = 8;
    const hits = [],
      words = [],
      pics = [];
    const put = (x, yy, v = 1) => {
      if (x >= 0 && x < W && yy >= 0 && yy < CAP) bits[yy * W + x] = v;
    };
    const text = (t, sty = "body", opts: any = {}) => {
      const st = STY[sty],
        ind = opts.indent || 0,
        s = keepCode(sty === "small" ? t.toUpperCase() : t);
      let inCode = false;
      for (const l of wrap(s, TW - ind, st)) {
        inCode = drawRich(put, l, M + ind, y, st, inCode);
        y += st[3];
      }
      words.push(t.replace(/`/g, ""));
    };
    const pic = (key, w, opts: any = {}) => {
      const im = loaded[key];
      if (!im) {
        y += 4;
        return 0;
      }
      const iw = Math.min(w, TW),
        ih = Math.round((iw * im.height) / im.width),
        x0 = opts.x ?? Math.round(M + (TW - iw) / 2),
        y0 = opts.y ?? y;
      const dots = (F, n) => {
        const p = picLum(im, iw * F, ih * F);
        if (p.mean > 140) for (let k = 0; k < p.L.length; k++) p.L[k] = 255 - p.L[k];
        return atkinson(p.L, iw * F, ih * F, false, n);
      }; // light screenshots are drawn inverted, so a white window does not light the whole screen
      const lo = dots(1, 2);
      for (let yy = 0; yy < ih; yy++) for (let xx = 0; xx < iw; xx++) if (lo[yy * iw + xx]) put(x0 + xx, y0 + yy);
      // the sharp copy: 1 px dots in four shades from black to orange, like a 2-bit LCD
      const hi = dots(2, 4),
        c = document.createElement("canvas");
      c.width = iw * 2;
      c.height = ih * 2;
      const cg = c.getContext("2d"),
        id = cg.createImageData(c.width, c.height);
      for (let k = 0; k < hi.length; k++) {
        const t = hi[k] / 3;
        for (let ch = 0; ch < 3; ch++) id.data[k * 4 + ch] = OFF[ch] + (LIT[ch] - OFF[ch]) * t;
        id.data[k * 4 + 3] = 255;
      }
      cg.putImageData(id, 0, 0);
      pics.push({ x: x0, y: y0, w: iw, h: ih, c });
      if (!opts.inline) y += ih + 8;
      return ih;
    };
    const chevron = (x, yc) => {
      for (let i = 0; i < 5; i++)
        for (const t of [0, 1]) {
          put(x + i + t, yc - 4 + i);
          put(x + i + t, yc + 4 - i);
        }
    };
    const hline = (yy) => {
      for (let x = M; x < M + TW; x++) put(x, yy, 2);
    };
    const icon = (key, sc, x0, y0) => {
      const ic = ICONS[key];
      if (!ic) return 0;
      ic.forEach((r, yy) => {
        for (let xx = 0; xx < 16; xx++)
          if (r[xx] === "#")
            for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) put(x0 + xx * sc + b, y0 + yy * sc + a);
      });
      return 16 * sc;
    };
    const row = (label, sub, action, ic, path) => {
      const y0 = y;
      y += 6;
      let ix = 0;
      if (ic && ICONS[ic]) {
        icon(ic, 1, M, y + 2);
        ix = 23;
      }
      for (const l of wrap(label, TW - ix - 12, STY.body).slice(0, 3)) {
        drawStr(put, l, M + ix, y, STY.body);
        y += 19;
      }
      if (sub) {
        y += 1;
        for (const l of wrap(sub.toUpperCase(), TW - ix - 12, STY.small)) {
          drawStr(put, l, M + ix, y, STY.small);
          y += 11;
        }
      }
      y = Math.max(y, y0 + 6 + (ic ? 20 : 0)) + 4;
      chevron(M + TW - 7, Math.round((y0 + y) / 2));
      hline(y);
      y += 1;
      hits.push({ y0, y1: y, action, path });
      words.push(label + (sub ? ", " + sub : ""));
    };
    const gap = (h) => {
      y += h;
    };
    const rule = () => {
      for (let x = M; x < M + TW; x += 2) put(x, y);
      y += 1;
    };
    const bullet = (t) => {
      const y0 = y;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) put(M + 1 + b, y0 + 8 + a);
      text(t, "body", { indent: 9 });
      y += 4;
    };
    spec({
      text,
      pic,
      icon: (k, sc) => {
        y += icon(k, sc, M, y) + 8;
      },
      row,
      gap,
      rule,
      bullet,
      W,
      M,
    });
    y += 12;
    const h = Math.min(CAP, Math.max(y, BH - BAR));
    return { w: W, h, bits: bits.slice(0, W * h), hits, words, pics };
  }

  const host = (u) =>
    u.includes("apps.apple.com") ? "apps.apple.com" : u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const views = {
    work: () =>
      layout(({ row }) =>
        work.forEach((p) => row(p.name, p.uses, () => navigate(`/work/${p.slug}/`, "print"), null, `/work/${p.slug}/`)),
      ),
    personal: () =>
      layout(({ row }) => apps.forEach((p) => row(p.name, p.uses, () => navigate(p.path, "print"), p.icon, p.path))),
    about: () =>
      layout(({ text, pic, row, gap, rule, M }) => {
        text(profile.name, "title");
        gap(2);
        text(profile.role, "small");
        gap(12);
        pic("photo", 124, { x: M });
        text(profile.intro);
        gap(6);
        text(profile.skills, "small");
        gap(8);
        rule();
        gap(10);
        text("Experience", "small");
        gap(8);
        jobs.forEach((j) => {
          text(j.when, "small");
          gap(2);
          text(j.role);
          text(j.at);
          gap(10);
        });
        rule();
        row("Contact me", EMAIL, () => navigate("/contact/", "print"), null, "/contact/");
        for (const l of profile.links) row(l.name, l.label, () => open(l.url));
      }),
  };
  function printDoc(path, body) {
    return (W) =>
      paperLayout((P) => {
        body(P);
        P.gap(14);
        P.rule();
        P.gap(8);
        P.text("End of page", "small", { center: true });
      }, W);
  }
  const printWork = (p) =>
    printDoc(`/work/${p.slug}/`, (P) => {
      P.text(p.name, "title");
      P.gap(2);
      P.text(p.uses, "small");
      P.gap(10);
      P.text(p.desc);
      P.gap(10);
      if (p.url) P.link("Visit the site", host(p.url), () => open(p.url));
    });
  function blocksTo(P, blocks) {
    for (const [t, v] of blocks) {
      if (t === "h") {
        P.gap(14);
        P.text(v, "small");
        P.gap(7);
      } else if (t === "p") {
        P.text(v);
        P.gap(7);
      } else if (t === "li") P.bullet(v);
      else if (t === "code") {
        P.gap(2);
        P.code(v);
        P.gap(10);
      }
    }
  }
  const printApp = (p) =>
    printDoc(p.path, (P) => {
      P.icon(p.icon, 2);
      P.text(p.name, "title");
      P.gap(2);
      P.text(p.uses, "small");
      P.gap(10);
      P.text(p.desc);
      P.gap(10);
      for (const [label, url] of p.links) {
        P.link(label, host(url), () => open(url));
        P.gap(6);
      }
      P.gap(6);
      if (p.shot) P.pic(p.shot);
      if (p.features) {
        P.gap(6);
        P.text("Features", "small");
        P.gap(8);
        p.features.forEach(P.bullet);
        P.gap(10);
      }
      if (p.req) {
        P.gap(6);
        P.text("Requirements", "small");
        P.gap(8);
        P.text(p.req);
        P.gap(10);
      }
      if (p.support) {
        // support and privacy are part of the same printout
        P.gap(8);
        P.rule();
        P.gap(14);
        P.anchor("support");
        P.text("Support", "title");
        P.gap(8);
        blocksTo(P, p.support);
        P.gap(8);
        P.rule();
        P.gap(14);
        P.anchor("privacy");
        P.text("Privacy policy", "title");
        P.gap(8);
        blocksTo(P, p.privacy);
      }
    });
  const printContact = printDoc("/contact/", (P) => {
    P.text(contact.title, "title");
    P.text(contact.intro);
    P.gap(6);
    P.text(EMAIL);
    P.gap(10);
    P.link("Copy address", null, () => {
      try {
        navigator.clipboard.writeText(EMAIL).then(
          () => toast("Copied"),
          () => toast("Select it on the site"),
        );
      } catch {
        toast("Select it on the site");
      }
    });
    P.gap(6);
    P.link("Write an email", EMAIL, () => open("mailto:" + EMAIL));
  });
  function open(url) {
    if (url.startsWith("mailto:")) {
      location.href = url;
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    // other sites open in a new tab; this site's own pages (Aperture, Coffee Ratio) open in this one
    if (a.origin !== location.origin) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ---------- routes: every screen has an address, the same paths the site has always had (routes.ts) ---------- */
  const R = {};
  for (const r of routes) {
    const build = !r.print ? views[r.section] : r.work ? printWork(r.work) : r.app ? printApp(r.app) : printContact;
    R[r.path] = { ...r, home: r.parent, build }; // a printed page prints over its list ("home") when opened from an address
  }
  const pathNow = () => {
    let p = decodeURI(location.pathname) || "/";
    if (!p.endsWith("/")) p += "/";
    return p;
  };

  /* ---------- navigation state ---------- */
  let section = "about",
    stack = [],
    msg = "",
    msgUntil = 0,
    cur = null;
  const top = () => stack[stack.length - 1];
  function makeScreen(r) {
    return { path: r.path, build: r.build, bm: r.build(), scroll: 0, vel: 0 };
  }
  function relayoutAll() {
    for (const s of stack) {
      s.bm = s.build();
      clampScroll(s, true);
    }
  }
  function announce() {
    const r = R[cur] || R["/"],
      live = livePaper();
    const words = r.print && live ? live.bm.words : top().bm.words;
    sr.textContent = `${r.title}${r.print ? ", printed" : ""}. ` + words.join(". ");
    document.title = documentTitle(r);
  }
  function flash(t) {
    msg = t;
    msgUntil = performance.now() + 1400;
    kick();
  }
  let anim = null; // { kind, t0, dur, from }
  function setKeys() {
    document.querySelectorAll(".col").forEach((c) => {
      const b = c.firstElementChild as HTMLElement;
      if (!b.dataset.view) return;
      const on = b.dataset.view === section;
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
      c.toggleAttribute("data-on", on);
    });
  }
  // mode: "print" (a line on the screen), "section" (a key), "replace" (BACK with no history), or none (address bar, browser back)
  function navigate(path, mode) {
    if (path === cur) {
      sfx.edge();
      return;
    }
    if (mode === "replace") history.replaceState({ from: null }, "", path);
    else history.pushState({ from: cur }, "", path);
    show(path);
  }
  // The screen shows sections and lists. A page (a project, an app, contact) is printed on paper over the screen.
  function show(path) {
    const r = R[path] || R["/"],
      live = livePaper();
    let screen = r.path;
    if (r.print) screen = stack.length && top().bm.hits.some((h) => h.path === r.doc) ? top().path : r.home; // print over the list it was picked from
    showScreen(R[screen]);
    cur = r.path;
    if (r.print) {
      if (live && live.doc === r.doc) seek(live, r.anchor);
      else {
        if (live) autoTear();
        print(r);
      }
    } else if (live) autoTear();
    setKeys();
    announce();
    kick();
  }
  function showScreen(r) {
    const prev = snapshot(),
      i = stack.findIndex((s) => s.path === r.path);
    if (i === stack.length - 1 && i >= 0) return;
    if (i >= 0) {
      stack.length = i + 1;
      sfx.tap();
      anim = reduce || !prev ? null : { kind: "push", t0: performance.now(), dur: 170, from: prev, dir: -1 };
    } else {
      // build the screen with its parents
      const chain = [];
      for (let x = r; x; x = R[x.parent]) chain.unshift(x);
      const newSection = r.section !== section || !stack.length;
      section = r.section;
      stack = chain.map(makeScreen);
      if (prev && power) sfx.change(); // with the screen off, a key only thunks
      if (prev) tape.run([[1, newSection ? 620 : 260]], true); // the program reads its next screen from tape
      anim =
        reduce || !prev
          ? null
          : newSection || chain.length === 1
            ? { kind: "tune", t0: performance.now(), dur: 230, from: prev }
            : { kind: "push", t0: performance.now(), dur: 170, from: prev, dir: 1 };
    }
  }
  function go(v) {
    navigate(ROOT[v], "section");
  }
  function back() {
    // BACK tears off the printout; with no printout, it returns to where you came from
    if (livePaper()) {
      autoTear();
      afterTear();
      return;
    }
    const r = R[top().path];
    if (!r.parent && stack.length < 2) {
      sfx.edge();
      return;
    }
    if (history.state && history.state.from) history.back();
    else navigate(stack.length > 1 ? stack[stack.length - 2].path : r.parent, "replace");
  }
  function afterTear() {
    // the page is gone, so the address goes back to the screen under it
    const to = top().path;
    if (cur === to) return;
    if (history.state && history.state.from === to) history.back();
    else navigate(to, "replace");
  }
  addEventListener("popstate", () => {
    if (pathNow() !== cur) show(R[pathNow()] ? pathNow() : "/");
  });
  /* ---------- rendering ---------- */
  function compose(out, s, xoff = 0) {
    // out: Uint8 BW*BH
    const sc = Math.round(s.scroll);
    for (let y = BAR; y < BH; y++) {
      const yy = y - BAR + sc;
      if (yy < 0 || yy >= s.bm.h) {
        for (let x = 0; x < BW; x++) {
          const xx = x - xoff;
          if (xx >= 0 && xx < BW) out[y * BW + x] = 0;
        }
        continue;
      }
      const row = yy * s.bm.w;
      for (let x = 0; x < BW; x++) {
        const xx = x - xoff;
        if (xx >= 0 && xx < BW) out[y * BW + x] = s.bm.bits[row + xx];
      }
    }
    // scroll bar, always shown when there is more to see: dotted track, solid thumb
    const total = s.bm.h,
      view = BH - BAR,
      tx = BW - 4 + xoff;
    if (total > view && tx >= 0 && tx + 1 < BW) {
      const len = Math.max(12, Math.round((view * view) / total)),
        pos = BAR + Math.round((view - len) * Math.min(1, Math.max(0, s.scroll / (total - view))));
      for (let y = BAR + 2; y < BH - 2; y += 3) out[y * BW + tx + 1] = 1;
      for (let y = Math.max(BAR, pos); y < Math.min(BH, pos + len); y++) {
        out[y * BW + tx] = 1;
        out[y * BW + tx + 1] = 1;
      }
    }
  }
  function statusBar(out) {
    // no status bar; only a short notice strip when needed, drawn inverted
    if (performance.now() >= msgUntil) return;
    for (let k = 0; k < BW * 22; k++) out[k] = 1;
    drawStr(
      (x, y) => {
        if (x >= 0 && x < BW && y >= 0 && y < 22) out[y * BW + x] = 0;
      },
      msg,
      6,
      6,
      STY.small,
    );
  }
  function snapshot() {
    if (!stack.length) return null;
    const o = new Uint8Array(BW * BH);
    compose(o, top());
    return o;
  }
  function blit(bits, noiseAmt = 0) {
    const d = img.data;
    for (let k = 0; k < BW * BH; k++) {
      let on = bits[k];
      if (noiseAmt && Math.random() < noiseAmt) on = Math.random() < 0.5 ? 1 : 0;
      const c = on === 1 ? LIT : on === 2 ? DIM : OFF;
      d[k * 4] = c[0];
      d[k * 4 + 1] = c[1];
      d[k * 4 + 2] = c[2];
      d[k * 4 + 3] = 255;
    }
    bufG.putImageData(img, 0, 0);
    const g = lcd.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(buf, 0, 0, lcd.width, lcd.height);
    if (sharp && !noiseAmt) sharpPics(g, sharp);
    g.drawImage(grid, 0, 0);
    glow.getContext("2d").drawImage(buf, 0, 0);
  }
  let sharp = null; // the screen whose pictures are drawn at the fine dot size (none while a transition runs)
  function sharpPics(g, s) {
    const c = PITCH * dpr,
      sc = Math.round(s.scroll),
      y0 = BAR * c,
      y1 = BH * c;
    for (const p of s.bm.pics) {
      const y = (p.y - sc + BAR) * c,
        h = p.h * c;
      if (y + h <= y0 || y >= y1) continue;
      g.save();
      g.beginPath();
      g.rect(0, y0, lcd.width, y1 - y0);
      g.clip();
      g.drawImage(p.c, p.x * c, y, p.w * c, h);
      g.fillStyle = "rgba(12,5,0,.38)"; // the gaps between the fine dots, as the grid does for the big ones
      for (let k = 0; k < p.w; k++) g.fillRect(Math.round((p.x + k + 0.5) * c) - 1, y, 1, h);
      for (let k = 0; k < p.h; k++) g.fillRect(p.x * c, Math.round(y + (k + 0.5) * c) - 1, p.w * c, 1);
      g.restore();
    }
  }
  let frameBits = null;
  function draw() {
    if (!buf) return;
    const out = frameBits && frameBits.length === BW * BH ? frameBits : (frameBits = new Uint8Array(BW * BH));
    out.fill(0);
    let noiseAmt = 0;
    if (anim) {
      const t = Math.min(1, (performance.now() - anim.t0) / anim.dur);
      if (anim.kind === "push" && anim.from) {
        // slide, snapped to whole pixels
        const e = 1 - Math.pow(1 - t, 3),
          shift = Math.round(e * BW) * anim.dir;
        compose(out, top(), anim.dir > 0 ? BW - Math.abs(shift) : -(BW - Math.abs(shift)));
        const tmp = anim.from;
        for (let y = BAR; y < BH; y++)
          for (let x = 0; x < BW; x++) {
            const xs = x + shift;
            if (xs >= 0 && xs < BW) out[y * BW + x] = tmp[y * BW + xs];
          }
      } else if (anim.kind === "tune") {
        // old picture collapses to a line, static, new picture opens
        const mid = (BH + BAR) / 2;
        if (t < 0.45 && anim.from) {
          const k = 1 - t / 0.45,
            half = Math.max(1, Math.round(((BH - BAR) / 2) * k));
          for (let y = BAR; y < BH; y++)
            for (let x = 0; x < BW; x++) {
              const src = Math.round(mid + (y - mid) / k);
              out[y * BW + x] = Math.abs(y - mid) <= half && src >= BAR && src < BH ? anim.from[src * BW + x] : 0;
            }
          noiseAmt = 0.04;
        } else {
          compose(out, top());
          const k = Math.max(0.02, (t - 0.45) / 0.55),
            half = Math.round(((BH - BAR) / 2) * k);
          for (let y = BAR; y < BH; y++) if (Math.abs(y - mid) > half) for (let x = 0; x < BW; x++) out[y * BW + x] = 0;
          noiseAmt = 0.08 * (1 - k);
        }
      }
      if (t >= 1) anim = null;
    } else if (turn) compose(out, turnScreen());
    else compose(out, top());
    if (performance.now() < powerNoise) noiseAmt = Math.max(noiseAmt, (0.2 * (powerNoise - performance.now())) / 480);
    statusBar(out);
    sharp = anim || turn ? null : top();
    blit(out, noiseAmt);
  }

  // A phone held sideways is too short for the device: the tube asks to turn it upright, and the paper hides until then.
  // (A web page cannot lock the orientation in iOS Safari.) A small desktop window keeps the handheld as it is.
  const turnQuery = matchMedia(
    "(pointer: coarse) and (hover: none) and (orientation: landscape) and (max-height: 500px)",
  );
  let turn = false,
    turnBm = null,
    turnH = 0;
  function setTurn() {
    turn = !DESK && turnQuery.matches;
    document.getElementById("device").toggleAttribute("data-turn", turn);
    kick();
  }
  turnQuery.addEventListener("change", setTurn);
  function turnScreen() {
    if (!turnBm || turnBm.w !== BW || turnH !== BH) {
      turnH = BH;
      turnBm = layout(({ text, gap }) => {
        gap(Math.max(0, Math.round((BH - BAR) / 2 - 30)));
        text("Turn the phone upright");
        gap(4);
        text("This device works standing up", "small");
      });
    }
    return { bm: turnBm, scroll: 0 };
  }

  /* ---------- touch scrolling with momentum and rubber band ---------- */
  let dragging = false,
    startY = 0,
    startX = 0,
    startScroll = 0,
    lastY = 0,
    lastT = 0,
    moved = false,
    pressHit = null;
  const maxScroll = (s) => Math.max(0, s.bm.h - (BH - BAR));
  function clampScroll(s, hard) {
    if (hard) s.scroll = Math.min(Math.max(0, s.scroll), maxScroll(s));
  }
  function rubber(over) {
    return Math.sign(over) * (1 - 1 / ((Math.abs(over) * 0.55) / (BH - BAR) + 1)) * (BH - BAR) * 0.5;
  } // iOS-like resistance
  screenEl.addEventListener("pointerdown", (e) => {
    if (!stack.length || !power || turn) return;
    screenEl.setPointerCapture(e.pointerId);
    dragging = true;
    moved = false;
    startY = lastY = e.clientY;
    startX = e.clientX;
    lastT = performance.now();
    const s = top();
    s.vel = 0;
    startScroll = s.scroll;
    const r = screenEl.getBoundingClientRect(),
      by = (e.clientY - r.top - (r.height - BH * PITCH) / 2) / PITCH;
    const cy = by - BAR + s.scroll;
    pressHit = by > BAR ? s.bm.hits.find((h) => cy >= h.y0 && cy < h.y1) : null;
    kick();
  });
  screenEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const s = top();
    if (Math.abs(e.clientY - startY) > 6 || Math.abs(e.clientX - startX) > 6) {
      moved = true;
      pressHit = null;
    }
    const raw = startScroll - (e.clientY - startY) / PITCH,
      max = maxScroll(s);
    s.scroll = raw < 0 ? rubber(raw) : raw > max ? max + rubber(raw - max) : raw;
    const now = performance.now(),
      dt = Math.max(1, now - lastT);
    s.vel = -((e.clientY - lastY) / PITCH) / dt;
    lastY = e.clientY;
    lastT = now;
    kick();
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    const s = top();
    const dx = e.clientX - startX,
      dy = e.clientY - startY;
    if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && stack.length > 1) {
      s.vel = 0;
      back();
      return;
    } // swipe right = back
    if (!moved && pressHit) {
      s.vel = 0;
      flashRow = { hit: pressHit, until: performance.now() + 90 };
      const act = pressHit.action;
      pressHit = null;
      kick();
      setTimeout(() => act(), reduce ? 0 : 90);
      return;
    }
    if (performance.now() - lastT > 80) s.vel = 0; // finger rested before lifting
    pressHit = null;
    kick();
  };
  screenEl.addEventListener("pointerup", release);
  screenEl.addEventListener("pointercancel", release);
  let flashRow = null;

  /* ---------- physics loop, runs only while something moves ---------- */
  let raf = 0,
    lastFrame = 0;
  function loop(now) {
    raf = 0;
    const dt = Math.min(50, lastFrame ? now - lastFrame : 16);
    lastFrame = now;
    let busy = !!anim || dragging || performance.now() < msgUntil || performance.now() < powerNoise;
    const s = top();
    if (s && !dragging) {
      const max = maxScroll(s);
      // substeps keep this stable at any frame rate
      for (let n = 0, steps = Math.ceil(dt / 4), h = dt / steps; n < steps; n++) {
        if (s.scroll < 0 || s.scroll > max) {
          const target = s.scroll < 0 ? 0 : max;
          const a = (target - s.scroll) * 0.00045 - s.vel * 0.045;
          s.vel += a * h;
          s.scroll += s.vel * h;
          if (Math.abs(target - s.scroll) < 0.3 && Math.abs(s.vel) < 0.01) {
            s.scroll = target;
            s.vel = 0;
          }
        } else if (Math.abs(s.vel) > 0.002) {
          s.scroll += s.vel * h;
          s.vel *= Math.pow(0.9975, h);
          if (s.scroll < 0 || s.scroll > max) s.vel *= 0.6;
        } else s.vel = 0;
      }
      if (s.vel !== 0 || s.scroll < 0 || s.scroll > max) busy = true;
    }
    draw();
    if (pressHit || (flashRow && now < flashRow.until)) {
      highlight(pressHit || flashRow.hit);
      busy = busy || !!flashRow;
    }
    if (busy) raf = requestAnimationFrame(loop);
    else lastFrame = 0;
  }
  function invert(out, h) {
    // invert a row, the way a selected line looks on an old LCD
    const sc = Math.round(top().scroll);
    for (let y = Math.max(BAR, h.y0 - sc + BAR); y < Math.min(BH, h.y1 - sc + BAR); y++)
      for (let x = 2; x < BW - 2; x++) out[y * BW + x] = out[y * BW + x] === 1 ? 0 : 1;
  }
  function highlight(h) {
    invert(frameBits, h);
    blit(frameBits);
  }
  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  /* ---------- keys ---------- */
  cols.forEach((c) => {
    const k = c.firstElementChild as HTMLElement;
    const isBack = k.hasAttribute("data-back");
    const here = () => !!k.dataset.view && k.dataset.view === section;
    k.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      c.dataset.st = "down";
      animKey(c, 4);
      sfx.key(true);
    });
    const up = () => {
      if (c.dataset.st === "down") {
        c.dataset.st = "up";
        animKey(c, 0);
        sfx.key(false);
      }
    };
    // the key of the section on the screen, pressed again: like tapping the current tab on iOS.
    // A printout is cut off first; with no printout, the screen goes back to the start of the section.
    const again = () => {
      if (livePaper()) back();
      else if (cur !== ROOT[k.dataset.view]) navigate(ROOT[k.dataset.view], "section");
    };
    k.addEventListener("pointerup", up);
    k.addEventListener("pointerleave", up);
    k.addEventListener("pointercancel", up);
    k.addEventListener("click", () => {
      if (isBack) back();
      else if (here()) again();
      else go(k.dataset.view);
      up();
    });
  });
  /* ---------- screen power: the rocker turns the tube on and off ---------- */
  const snd = document.getElementById("snd"),
    tube = document.getElementById("tube"),
    spot = document.getElementById("spot");
  let power = true,
    powerNoise = 0;
  function tubeOn() {
    if (reduce) return;
    // a bright dot opens to a line, the line opens to the picture, then the static settles
    tube.animate(
      [
        { transform: "scale(.04,.006)", filter: "brightness(5)" },
        { transform: "scale(1,.006)", filter: "brightness(3.5)", offset: 0.3 },
        { transform: "scale(1,1.03)", filter: "brightness(1.6)", offset: 0.65 },
        { transform: "scale(1,1)", filter: "brightness(1)" },
      ],
      { duration: 620, easing: "cubic-bezier(.2,.7,.3,1)" },
    );
    powerNoise = performance.now() + 480;
    kick();
  }
  function setPower(on) {
    if (on === power) return;
    power = on;
    snd.setAttribute("aria-pressed", String(on));
    document.getElementById("device").dataset.power = on ? "on" : "off";
    if (!DESK) document.getElementById("foot").dataset.power = on ? "on" : "off";
    tape.power(on);
    sfx.rocker();
    screenEl.classList.toggle("off", !on);
    for (const a of [...tube.getAnimations(), ...spot.getAnimations()]) a.cancel();
    if (on) {
      sfx.crtOn();
      tube.style.opacity = "";
      tubeOn();
    } else {
      sfx.crtOff();
      if (reduce) {
        tube.style.opacity = "0";
      } else {
        // the picture collapses to a bright line, then to a dot that fades slowly
        tube.animate(
          [
            { transform: "scale(1,1)", filter: "brightness(1)" },
            { transform: "scale(1,.006)", filter: "brightness(3)", offset: 0.4 },
            { transform: "scale(.03,.006)", filter: "brightness(5)", offset: 0.75 },
            { transform: "scale(0,0)", filter: "brightness(5)", opacity: 0 },
          ],
          { duration: 480, easing: "ease-in", fill: "forwards" },
        );
        spot.animate(
          [
            { opacity: 0, transform: "scale(1)" },
            { opacity: 0, offset: 0.2 },
            { opacity: 1, offset: 0.24, transform: "scale(1)" },
            { opacity: 0, transform: "scale(.3)" },
          ],
          { duration: 1600, easing: "ease-out" },
        );
      }
    }
    sr.textContent = on ? "Screen on" : "Screen off";
  }
  // roll the rocker with a finger (left = I = on, right = O = off), back and forth if you like; a tap or the keyboard flips it
  let rk = null;
  snd.addEventListener("pointerdown", (e) => {
    snd.setPointerCapture(e.pointerId);
    const r = snd.getBoundingClientRect();
    rk = { x0: e.clientX, mid: r.left + r.width / 2, moved: false };
  });
  snd.addEventListener("pointermove", (e) => {
    if (!rk) return;
    if (Math.abs(e.clientX - rk.x0) > 6) rk.moved = true;
    if (rk.moved) setPower(e.clientX < rk.mid);
  });
  const rkEnd = (e) => {
    if (!rk) return;
    if (!rk.moved && e.type === "pointerup") {
      const r = snd.getBoundingClientRect();
      setPower(e.clientX < r.left + r.width / 2);
    }
    rk = null;
    snd.dataset.ptr = "1";
  };
  snd.addEventListener("pointerup", rkEnd);
  snd.addEventListener("pointercancel", rkEnd);
  snd.addEventListener("click", () => {
    if (snd.dataset.ptr) {
      delete snd.dataset.ptr;
      return;
    }
    setPower(!power);
  });

  /* ---------- printer: a line on the screen prints its page; the page rises out of a slot above the keys, over the screen ---------- */
  const PP = 1.5; // css px between print-head dots
  const HOLE = 22; // tractor-feed strip on each side
  const LEAD = DESK ? 208 : 200; // paper still inside the printer: above the perforation on the desktop (whole hole steps), below it on the phone
  const REST = 20; // a page stops with its top perforation this far from the slit
  const STICK = 9; // with no page out, this much paper sticks out of the slot
  const HP = 1.9; // the tear hint's dot pitch: a little bigger than print
  const TEAR_LEN = 150,
    TILT_MAX = 7,
    RIP = 0.12; // past RIP the paper has begun to tear, and a let-go finishes the tear // how far a sideways swipe runs to tear the page, and how far the page swings
  const pwin = document.getElementById("pwin"),
    fallLayer = document.getElementById("fall");
  let paper = null,
    pending = null,
    lead = null,
    leadOut = STICK,
    leadTo = null,
    falling = [],
    praf = 0,
    plast = 0,
    pdrag = null;
  let stamp = null,
    fibre = null,
    toolsDpr = 0;
  const livePaper = () => (paper && !paper.leaving ? paper : null);
  let slitX = 0,
    slitW = 300,
    TOP0 = 20;
  const printerEl = document.getElementById("printer"); // phone only
  const SLIT_Y = 12.3,
    SLIT_IN = 11; // from the phone's slot render
  function placePaper() {
    // the paper is as wide as the slit under the printer
    if (DESK) {
      slitX = Math.round((META.paper[0] - winL()) * K);
      slitW = Math.round((META.paper[2] - META.paper[0]) * K);
    } else {
      // the window runs from the top of the face down to the middle of the slit
      const dr = document.getElementById("device").getBoundingClientRect(),
        r = printerEl.getBoundingClientRect();
      pwin.style.top = "0px";
      pwin.style.bottom = dr.bottom - (r.top + SLIT_Y) + "px";
      slitX = Math.round(r.left - dr.left + SLIT_IN);
      slitW = Math.round(r.width - 2 * SLIT_IN);
      TOP0 = Math.round(screenEl.getBoundingClientRect().top - dr.top + 2); // a long page stops with its top at the top of the glass
    }
    pwin.style.setProperty("--sl", slitX + "px");
    pwin.style.setProperty("--sw", slitW + "px");
  }
  const paperW = () => slitW; // as wide as the slit
  const SL = () => pwin.clientHeight; // the slit, in window coordinates
  // Desktop: the slit is at the top of the window. A page comes out end first and stops with its top just under the
  // slit; a long page runs on down into the paper catch. Scrolling (sy) draws it back up so its lower part shows.
  // Phone: the slit is at the bottom of the window. A page rises out of it, and a long page stops with its top at the
  // top of the glass; scrolling (sy) draws more of it out.
  const CATCH = 6;
  const restOut = (P) => (DESK ? P.H + REST : Math.min(P.H + REST, SL() - TOP0)); // how much paper is out when the page stops
  const maxSy = (P) => Math.max(0, P.H + REST - (DESK ? SL() - CATCH : restOut(P)));
  const sheetY = (P) => (DESK ? P.out - P.H - P.sy : SL() - P.out - P.sy);

  function tools() {
    // one ink dot, and paper fibre, made once per pixel ratio
    if (toolsDpr === dpr) return;
    toolsDpr = dpr;
    const r = 0.96 * dpr,
      s = Math.ceil(r * 2 + 2);
    stamp = document.createElement("canvas");
    stamp.width = stamp.height = s;
    const g = stamp.getContext("2d"),
      gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, r);
    gr.addColorStop(0, "rgba(28,24,20,1)");
    gr.addColorStop(0.72, "rgba(28,24,20,1)");
    gr.addColorStop(1, "rgba(28,24,20,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    fibre = document.createElement("canvas");
    fibre.width = fibre.height = 128;
    const f = fibre.getContext("2d"),
      d = f.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 60 : 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = Math.random() * 16;
    }
    f.putImageData(d, 0, 0);
  }
  function paperCanvas(W, H) {
    const c = document.createElement("canvas");
    c.width = Math.round(W * dpr);
    c.height = Math.max(1, Math.round(H * dpr));
    c.style.width = W + "px";
    c.style.height = H + "px";
    const g = c.getContext("2d");
    g.fillStyle = "#ece5d5";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = g.createPattern(fibre, "repeat");
    g.fillRect(0, 0, c.width, c.height);
    const sh = g.createLinearGradient(0, 0, c.width, 0); // edges a little darker, as paper is
    sh.addColorStop(0, "rgba(90,70,40,.12)");
    sh.addColorStop(0.07, "rgba(90,70,40,0)");
    sh.addColorStop(0.93, "rgba(90,70,40,0)");
    sh.addColorStop(1, "rgba(90,70,40,.12)");
    g.fillStyle = sh;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(80,64,40,.2)"; // perforations along the tractor strips
    for (const x of [HOLE, W - HOLE])
      for (let y = 1; y < H; y += 4)
        g.fillRect(Math.round(x * dpr), Math.round(y * dpr), Math.max(1, Math.round(dpr * 0.6)), Math.round(2 * dpr));
    return [c, g] as const;
  }
  function holes(g, W, y0, y1, phase) {
    // tractor holes every 16 px, cut through so the screen shows
    g.globalCompositeOperation = "destination-out";
    for (let y = phase + Math.ceil((y0 - 6 - phase) / 16) * 16; y < y1 + 6; y += 16)
      for (const x of [HOLE / 2, W - HOLE / 2]) {
        g.beginPath();
        g.arc(x * dpr, (y - y0) * dpr, 3.2 * dpr, 0, 7);
        g.fill();
      }
    g.globalCompositeOperation = "source-over";
  }
  function perforation(g, W, y) {
    // the tear line: short cuts with paper ties between them; each side keeps half
    g.globalCompositeOperation = "destination-out";
    for (let x = 1.5; x < W - 1; x += 5) g.fillRect(x * dpr, (y - 0.9) * dpr, 3 * dpr, 1.8 * dpr);
    g.globalCompositeOperation = "source-over";
  }
  // ink rows ra..rb of a dot bitmap into a canvas piece that spans y0..y1 (css px)
  function inkRows(g, bm, y0, y1, x0 = 0, pp = PP, ra = 0, rb = Infinity) {
    const { pw, bits } = bm,
      k = pp / PP,
      s = stamp.width * k,
      half = s / 2;
    const r0 = Math.max(ra, 0, Math.floor((y0 - 2) / pp)),
      r1 = Math.min(rb, bm.h, Math.ceil((y1 + 2) / pp));
    for (let r = r0; r < r1; r++) {
      g.globalAlpha = 0.9 + 0.07 * Math.sin(r * 0.05 + 1.3) * Math.sin(r * 0.013); // the ribbon gets a little lighter and darker
      const cy = ((r + 0.5) * pp - y0) * dpr - half,
        row = r * pw;
      for (let x = 0; x < pw; x++) if (bits[row + x]) g.drawImage(stamp, (x0 + (x + 0.5) * pp) * dpr - half, cy, s, s);
    }
    g.globalAlpha = 1;
  }

  const PICF = 3; // picture dots per text dot
  function inkPic(g, q, y0) {
    // the dots go into a small canvas once, then it is scaled onto each paper piece with a little softness, like ink
    if (!q.c) {
      q.c = document.createElement("canvas");
      q.c.width = q.w;
      q.c.height = q.h;
      const cg = q.c.getContext("2d"),
        id = cg.createImageData(q.w, q.h);
      for (let k = 0; k < q.bits.length; k++)
        if (q.bits[k]) {
          id.data[k * 4] = 28;
          id.data[k * 4 + 1] = 24;
          id.data[k * 4 + 2] = 20;
          id.data[k * 4 + 3] = 235;
        }
      cg.putImageData(id, 0, 0);
    }
    g.imageSmoothingEnabled = true;
    g.drawImage(q.c, q.x * PP * dpr, (q.y * PP - y0) * dpr, ((q.w * PP) / PICF) * dpr, ((q.h * PP) / PICF) * dpr);
  }
  // a link that leaves the site gets the arrow after its last word, as part of the link
  function outLinks({ text, links }: ReturnType<typeof parseLinks>) {
    let shift = 0;
    const out = links.map((k) => {
      const start = k.start + shift;
      if (k.url.startsWith("/")) return { ...k, start, end: k.end + shift };
      text = text.slice(0, k.end + shift) + OUT + text.slice(k.end + shift);
      shift++;
      return { ...k, start, end: k.end + shift };
    });
    return { text, links: out };
  }
  // a printout is laid out as a one-bit dot bitmap, like the screen, at the print head's dot pitch
  function paperLayout(spec, W) {
    const PW = Math.floor(W / PP),
      M = Math.ceil((HOLE + 9) / PP),
      TW = PW - 2 * M,
      CAP = 9000,
      bits = new Uint8Array(PW * CAP);
    let y = 30;
    const hits = [],
      words = [],
      anchors = {},
      pics = []; // room for the tear hint
    const put = (x, yy) => {
      if (x >= 0 && x < PW && yy >= 0 && yy < CAP) bits[yy * PW + x] = 1;
    };
    const text = (t, sty = "body", o: any = {}) => {
      const st = STY[sty],
        ind = o.indent || 0,
        { text: plain, links } = outLinks(parseLinks(t)),
        s = clean(keepCode(sty === "small" ? plain.toUpperCase() : plain));
      let inCode = false,
        from = 0;
      for (const l of wrap(s, TW - ind, st)) {
        const x = o.center ? M + Math.round((TW - measure(l, st)) / 2) : M + ind,
          at = s.indexOf(l, from); // where this line starts in the text
        inCode = drawRich(put, l, x, y, st, inCode);
        // a link: dotted underline, and its words can be tapped
        for (const k of links) {
          const a = Math.max(k.start, at) - at,
            b = Math.min(k.end, at + l.length) - at;
          if (b <= a) continue;
          const x0 = x + (a ? measure(l.slice(0, a), st) + st[2] * st[1] : 0),
            x1 = x + measure(l.slice(0, b), st);
          // the underline stops at the arrow; the arrow can be tapped too
          const xu = l[b - 1] === OUT ? x + measure(l.slice(0, b - 1), st) : x1;
          for (let xx = x0; xx < xu; xx += 2) put(xx, y + st[3] - 1);
          hits.push({ y0: y - 2, y1: y + st[3] + 2, x0: x0 - 2, x1: x1 + 2, act: () => open(k.url) });
        }
        from = at + l.length;
        y += st[3];
      }
      words.push(plain.replace(/`/g, "").replaceAll(OUT, ""));
    };
    const gap = (h) => {
      y += h;
    };
    const rule = () => {
      for (let x = M; x < M + TW; x += 3) put(x, y);
      y += 1;
    };
    const bullet = (t) => {
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) put(M + 1 + b, y + 8 + a);
      text(t, "body", { indent: 9 });
      y += 3;
    };
    const icon = (k, sc) => {
      const ic = ICONS[k];
      if (!ic) return;
      ic.forEach((r, yy) => {
        for (let xx = 0; xx < 16; xx++)
          if (r[xx] === "#")
            for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) put(M + xx * sc + b, y + yy * sc + a);
      });
      y += 16 * sc + 8;
    };
    const pic = (key) => {
      // a screenshot, in ink dots at three times the density of the text, where the picture is dark
      const im = loaded[key];
      if (!im) return;
      const iw = TW * PICF,
        ih = Math.round((iw * im.height) / im.width);
      pics.push({ x: M, y, w: iw, h: ih, bits: atkinson(picLum(im, iw, ih).L, iw, ih, true) });
      y += Math.ceil(ih / PICF) + 12;
    };
    const link = (label, sub, act) => {
      // a dotted box, like a coupon, with an arrow: it opens outside this page
      const y0 = y;
      y += 7;
      for (const l of wrap(label, TW - 24, STY.body)) {
        drawStr(put, l, M + 6, y, STY.body);
        y += 19;
      }
      if (sub) {
        y += 1;
        for (const l of wrap(sub.toUpperCase(), TW - 24, STY.small)) {
          drawStr(put, l, M + 6, y, STY.small);
          y += 11;
        }
      }
      y += 5;
      for (let x = M; x < M + TW; x += 2) {
        put(x, y0);
        put(x, y);
      }
      for (let yy = y0; yy <= y; yy += 2) {
        put(M, yy);
        put(M + TW - 1, yy);
      }
      const ax = M + TW - 14,
        ay = Math.round((y0 + y) / 2) - 3;
      for (let i = 0; i < 7; i++) {
        put(ax + i, ay + 6 - i);
        put(ax + i + 1, ay + 6 - i);
      }
      for (let i = 2; i < 8; i++) {
        put(ax + i, ay);
        put(ax + 7, ay + i - 2);
      }
      hits.push({ y0, y1: y + 1, act });
      words.push(label + (sub ? ", " + sub : ""));
      y += 1;
    };
    const anchor = (n) => {
      anchors[n] = y;
    };
    const code = (t) => {
      const y0 = y;
      text(t, "code", { indent: 10 });
      for (let yy = y0 + 3; yy < y - 3; yy += 2) put(M + 3, yy);
    };
    spec({ text, gap, rule, bullet, icon, pic, link, anchor, code });
    y += 40; // room for the tear hint
    return { pw: PW, h: y, m: M, tw: TW, bits: bits.slice(0, PW * y), hits, words, anchors, pics };
  }

  function buildLead() {
    // the strip below the tear line, still in the printer; the next page is printed on it
    tools();
    const W = paperW();
    if (lead && lead.W === W && lead.dpr === dpr) return;
    if (lead) lead.el.remove();
    const [c, g] = paperCanvas(W, LEAD);
    holes(g, W, 0, LEAD, 8);
    perforation(g, W, DESK ? LEAD : 0);
    c.className = "lead";
    pwin.prepend(c);
    lead = { el: c, W, dpr };
  }
  function buildSheet(P) {
    tools();
    const W = P.W,
      bm = P.bm,
      H = Math.ceil((bm.h * PP) / 16) * 16,
      el = document.createElement("div"); // only as long as the page, in whole hole pitches
    el.className = "sheet";
    el.style.width = W + "px";
    el.style.height = H + "px";
    for (let y0 = 0; y0 < H; y0 += 1024) {
      // in pieces, so no canvas gets too tall for a phone
      const y1 = Math.min(H, y0 + 1024),
        [c, g] = paperCanvas(W, y1 - y0);
      inkRows(g, bm, y0, y1);
      for (const q of bm.pics) inkPic(g, q, y0);
      holes(g, W, y0, y1, 8);
      if (y0 === 0) perforation(g, W, 0);
      if (y1 === H) perforation(g, W, y1 - y0);
      el.appendChild(c);
    }
    P.el = el;
    P.H = H;
    el.appendChild(hintCanvas(W, "top"));
    el.appendChild(hintCanvas(W, "end"));
    pwin.insertBefore(el, ghost);
  }
  function hintCanvas(W, where) {
    // a faint printed note: < SWIPE SIDEWAYS TO TEAR OFF >
    const st = STY.small,
      s = DESK ? "DRAG SIDEWAYS TO TEAR OFF" : "SWIPE SIDEWAYS TO TEAR OFF",
      w = measure(s, st) + 30,
      h = 11,
      bits = new Uint8Array(w * h);
    const put = (x, y) => {
      if (x >= 0 && x < w && y >= 0 && y < h) bits[y * w + x] = 1;
    };
    drawStr(put, s, 15, 1, st);
    for (let i = 0; i < 5; i++) {
      const dx = i <= 2 ? i : 4 - i;
      put(4 - dx, 3 + i);
      put(5 - dx, 3 + i);
      put(w - 5 + dx, 3 + i);
      put(w - 6 + dx, 3 + i);
    } // side arrows
    const c = document.createElement("canvas");
    c.className = "hint " + where;
    c.width = Math.round(w * HP * dpr);
    c.height = Math.round(h * HP * dpr);
    c.style.width = w * HP + "px";
    c.style.height = h * HP + "px";
    c.style.left = (W - w * HP) / 2 + "px";
    inkRows(c.getContext("2d"), { pw: w, h, bits }, 0, h * HP, 0, HP);
    return c;
  }
  // a short note just above the slot, not printed ("Copied"); it fades after a while
  const ghost = document.createElement("canvas");
  ghost.className = "ghost";
  pwin.appendChild(ghost);
  const hand = document.createElement("div");
  hand.className = "hand";
  pwin.appendChild(hand);
  let ghostT: ReturnType<typeof setTimeout>,
    ghostText = "";
  function showGhost(t, ms) {
    if (t !== ghostText || ghost.dataset.dpr !== String(dpr)) {
      ghostText = t;
      ghost.dataset.dpr = String(dpr);
      const st = STY.small,
        s = t.toUpperCase(),
        w = measure(s, st) + 30,
        h = 11,
        bits = new Uint8Array(w * h);
      const put = (x, y) => {
        if (x >= 0 && x < w && y >= 0 && y < h) bits[y * w + x] = 1;
      };
      drawStr(put, s, 15, 1, st);
      for (let i = 0; i < 5; i++) {
        const dx = i <= 2 ? i : 4 - i;
        put(4 - dx, 3 + i);
        put(w - 5 + dx, 3 + i);
        put(5 - dx, 3 + i);
        put(w - 6 + dx, 3 + i);
      } // side arrows
      tools();
      ghost.width = Math.round(w * HP * dpr);
      ghost.height = Math.round(h * HP * dpr);
      ghost.style.width = w * HP + "px";
      ghost.style.height = h * HP + "px";
      inkRows(ghost.getContext("2d"), { pw: w, h, bits }, 0, h * HP, 0, HP);
    }
    ghost.classList.add("show");
    clearTimeout(ghostT);
    ghostT = setTimeout(() => ghost.classList.remove("show"), ms);
  }
  const hideGhost = () => {
    clearTimeout(ghostT);
    ghost.classList.remove("show");
  };
  function toast(t) {
    if (livePaper()) showGhost(t, 1400);
  }

  function print(r) {
    if (paper) {
      pending = r;
      return;
    }
    startPrint(r);
  }
  function startPrint(r) {
    buildLead();
    const W = lead.W;
    const P: any = {
      r,
      doc: r.doc,
      anchor: r.anchor,
      W,
      sx: slitX,
      bm: r.build(W),
      out: STICK,
      sy: 0,
      vel: 0,
      p: 0,
      dir: 0,
      tearY: null,
      pClick: 0,
      target: null,
      leaving: false,
      auto: null,
      f: null,
    };
    buildSheet(P);
    P.state = "feed";
    paper = P;
    pwin.classList.add("on");
    tape.run([[1, 900]]);
    if (reduce) {
      P.out = restOut(P);
      rest(P);
    }
    announce();
    kick();
    kickP();
  }
  function rest(P) {
    P.state = "rest";
    if (P.anchor) seek(P, P.anchor);
    if (!swipedBefore()) hand.classList.add("show");
  }
  // the hand shows until the visitor has torn a page off with a swipe once (remembered in this browser only)
  const swipedBefore = () => {
    try {
      return localStorage.getItem("jp-swiped") === "1";
    } catch {
      return false;
    }
  };
  function swiped() {
    try {
      localStorage.setItem("jp-swiped", "1");
    } catch {}
  }
  function seek(P, anchor) {
    // scroll so the anchor sits near the top of the glass
    P.anchor = anchor;
    if (P.state !== "rest") return;
    P.target =
      anchor && P.bm.anchors[anchor] != null
        ? Math.max(0, Math.min(maxSy(P), (DESK ? REST : SL() - restOut(P) - TOP0) + P.bm.anchors[anchor] * PP - 14))
        : 0;
    P.vel = 0;
    kickP();
  }
  function feed(P, dt) {
    // the printed page rises out of the slot: fast at first, then slowing to a stop
    const to = restOut(P),
      f = P.f || (P.f = { t: 0, from: P.out, dur: Math.min(1100, Math.max(420, (to - P.out) * 0.5)), next: 0 });
    f.t += dt;
    const k = Math.min(1, f.t / f.dur),
      e = 1 - Math.pow(1 - k, 3);
    P.out = f.from + (to - f.from) * e;
    if (k < 0.9 && f.t >= f.next) {
      f.next = f.t + 44;
      sfx.print();
    } // the head buzzes pass after pass until the paper slows to a stop
    if (k >= 1) {
      P.out = to;
      rest(P);
    }
  }
  // tearing: the page swings sideways about the corner it is still held by, at the slit (or at its perforation, if that is out)
  function startTear(P, dir) {
    P.dir = dir;
    P.vel = 0;
    P.target = null;
    if (DESK) {
      P.tearY = Math.max(0, -sheetY(P));
      P.el.style.clipPath = P.tearY > 0 ? `inset(${P.tearY}px 0 0 0)` : "";
    } // the part still in the printer stays there
    else {
      P.tearY = Math.min(P.H, P.out + P.sy);
      P.el.style.clipPath = P.tearY < P.H ? `inset(0 0 ${P.H - P.tearY}px 0)` : "";
    }
    P.el.style.transformOrigin = `${dir > 0 ? P.W : 0}px ${P.tearY}px`;
  }
  function endTear(P) {
    P.dir = 0;
    P.p = 0;
    P.pClick = 0;
    P.tearY = null;
    P.el.style.clipPath = "";
  }
  function autoTear() {
    // a key, BACK, Escape or the address: the page tears off by itself
    const P = livePaper();
    if (!P) return;
    P.leaving = true;
    clearFlash();
    hideGhost();
    hand.classList.remove("show");
    if (reduce) {
      tearOff(0);
      return;
    }
    if (!P.dir) startTear(P, 1);
    P.auto = { t: 0 };
    kickP();
  }
  function ticks(P) {
    if (P.p < RIP) return;
    if (P.pClick < RIP) P.pClick = RIP;
    let n = 0;
    while (P.pClick < P.p && n++ < 3) {
      P.pClick += 0.03;
      sfx.tear();
    }
    if (P.pClick < P.p) P.pClick = P.p;
  }
  function tearOff(v) {
    const P = paper;
    if (!P) return;
    paper = null;
    P.leaving = true;
    pdrag = null;
    pwin.classList.remove("on");
    hideGhost();
    hand.classList.remove("show");
    const atPerf = P.tearY == null || (DESK ? P.tearY <= 0 : P.tearY >= P.H);
    if (reduce) P.el.remove();
    else {
      // the page leaves the window and falls past the device
      sfx.rip();
      const wr = pwin.getBoundingClientRect();
      fallLayer.appendChild(P.el);
      P.el.style.left = wr.left + "px";
      P.el.style.top = wr.top + "px";
      // the desktop's page hangs from the slit and drops; the phone's page is flung off sideways
      if (DESK)
        falling.push({
          el: P.el,
          x: P.sx,
          y: sheetY(P),
          a: -P.dir * P.p * TILT_MAX,
          vx: P.dir * Math.min(0.03, 0.01 + Math.abs(v) * 0.02),
          vy: 0.05,
          va: -P.dir * 0.012,
          age: 0,
        });
      else
        falling.push({
          el: P.el,
          x: P.sx,
          y: sheetY(P),
          a: P.dir * P.p * TILT_MAX,
          vx: P.dir * Math.max(0.08, Math.abs(v)),
          vy: -0.12,
          va: P.dir * 0.05,
          age: 0,
        });
    }
    leadOut = atPerf ? (DESK ? sheetY(P) : P.out + P.sy - P.H) : 0;
    leadTo = STICK; // what is left in the slot feeds out to a short stub
    kick();
    kickP();
  }
  function kickP() {
    if (!praf) praf = requestAnimationFrame(ploop);
  }
  function ploop(now) {
    praf = 0;
    const dt = Math.min(40, plast ? now - plast : 16);
    plast = now;
    let busy = false;
    const P = paper;
    if (P) {
      if (P.auto) {
        busy = true;
        P.p = Math.min(1, P.p + dt / 260);
        ticks(P);
        if (P.p >= 1) tearOff(0.12);
      } else if (P.state === "feed") {
        busy = true;
        feed(P, dt);
      } else if (!pdrag) {
        const max = maxSy(P);
        if (P.target != null) {
          const d = P.target - P.sy;
          P.sy += d * Math.min(1, dt * 0.012);
          if (Math.abs(d) < 0.5) {
            P.sy = P.target;
            P.target = null;
          }
          busy = true;
        } else
          for (let n = 0, steps = Math.ceil(dt / 4), h = dt / steps; n < steps; n++) {
            // momentum and rubber band, like the screen
            if (P.sy < 0 || P.sy > max) {
              const tg = P.sy < 0 ? 0 : max,
                a = (tg - P.sy) * 0.00045 - P.vel * 0.045;
              P.vel += a * h;
              P.sy += P.vel * h;
              if (Math.abs(tg - P.sy) < 0.3 && Math.abs(P.vel) < 0.01) {
                P.sy = tg;
                P.vel = 0;
              }
            } else if (Math.abs(P.vel) > 0.002) {
              P.sy += P.vel * h;
              P.vel *= Math.pow(0.9975, h);
              if (P.sy < 0 || P.sy > max) P.vel *= 0.6;
            } else P.vel = 0;
          }
        if (P.p > 0) {
          P.p *= Math.pow(0.975, dt);
          if (P.p < 0.01) endTear(P);
          busy = true;
        } // let go before it began to rip: the page swings back
        if (P.vel !== 0 || P.sy < 0 || P.sy > max) busy = true;
      }
    }
    if (leadTo !== null) {
      leadOut += (leadTo - leadOut) * Math.min(1, dt * 0.018);
      if (Math.abs(leadTo - leadOut) < 0.5) {
        leadOut = leadTo;
        leadTo = null;
        if (pending && !paper) {
          const r = pending;
          pending = null;
          startPrint(r);
        }
      } else busy = true;
    }
    for (const f of falling) {
      f.age += dt;
      if (DESK) {
        f.vy = Math.min(1.5, f.vy + 0.0024 * dt);
        f.vx *= Math.pow(0.997, dt);
        f.va *= Math.pow(0.998, dt);
      } // air holds the sheet back
      else f.vy += 0.0032 * dt;
      f.x += (f.vx + Math.sin(f.age * 0.006) * (DESK ? 0.012 : 0.05)) * dt;
      f.y += f.vy * dt;
      f.a += f.va * dt;
      f.el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0) rotate(${f.a}deg)`;
      if (f.y > innerHeight + 60) {
        f.el.remove();
        f.dead = true;
      }
    }
    falling = falling.filter((f) => !f.dead);
    if (falling.length) busy = true;
    pRender();
    if (busy) praf = requestAnimationFrame(ploop);
    else plast = 0;
  }
  // the tractor gears turn with the paper. Slow: about one click per 10 px. Faster: the clicks come more often, but the rate
  // levels off at 16 a second (GEAR_MAX), so a fast pull ticks like a ratchet instead of buzzing
  const GEAR_MAX = 0.016,
    GEAR_V = 0.16; // clicks per ms at full speed; the speed (px/ms) where the rate starts to level off
  let gearPos = null,
    gearT = 0,
    gearPh = 0;
  function gearTrack(P) {
    if (!P || P.state !== "rest") {
      gearPos = null;
      return;
    }
    const now = performance.now(),
      pos = P.sy;
    if (gearPos === null) {
      gearPos = pos;
      gearT = now;
      return;
    }
    const dt = Math.max(1, now - gearT),
      v = Math.abs(pos - gearPos) / dt;
    gearPos = pos;
    gearT = now;
    gearPh += dt * GEAR_MAX * (1 - Math.exp(-v / GEAR_V));
    if (gearPh >= 1) {
      gearPh %= 1;
      sfx.gear(1, v);
    }
  }
  function pRender() {
    const P = paper;
    gearTrack(P);
    if (P) {
      const y = Math.round(sheetY(P) * dpr) / dpr; // whole device pixels, so the canvas pieces join without a seam
      P.el.style.transform = `translate3d(${P.sx}px, ${y}px, 0) rotate(${(DESK ? -1 : 1) * P.dir * P.p * TILT_MAX}deg)`; // on the desktop it hangs from the slit, so it swings the other way
      leadOut = DESK ? sheetY(P) : P.out + P.sy - P.H; // the paper is one strip: the next page follows this one
    }
    const ly = Math.round((DESK ? leadOut : SL() - leadOut) * dpr) / dpr; // the line where the blank paper in the printer meets the page
    if (lead) lead.el.style.transform = `translate3d(${slitX}px, ${DESK ? ly - LEAD : ly}px, 0)`;
  }
  function reflowPaper() {
    // a new size (rotation): print the page again at the new width, already out
    placePaper();
    const P0 = livePaper();
    if (P0) P0.sx = slitX;
    if (!lead) return;
    const W = paperW();
    if (lead.W === W && lead.dpr === dpr) {
      if (P0 && P0.state === "rest") {
        P0.out = restOut(P0);
        P0.sy = Math.min(P0.sy, maxSy(P0));
      }
      pRender();
      return;
    }
    buildLead();
    const P = livePaper();
    if (P) {
      P.el.remove();
      P.W = W;
      P.sx = slitX;
      P.bm = P.r.build(W);
      buildSheet(P);
      P.auto = null;
      endTear(P);
      P.out = restOut(P);
      P.state = "rest";
      P.sy = Math.min(P.sy, maxSy(P));
    }
    pRender();
  }

  // drag the paper up and down to scroll it; swipe it sideways to tear it off at the slot
  let flashEl = null;
  function flashBox(P, h) {
    clearFlash();
    const b = P.bm;
    flashEl = document.createElement("div");
    flashEl.className = "flashbox";
    Object.assign(flashEl.style, {
      left: (h.x0 ?? b.m) * PP + "px",
      top: h.y0 * PP + "px",
      width: (h.x0 == null ? b.tw : h.x1 - h.x0) * PP + "px",
      height: (h.y1 - h.y0) * PP + "px",
    });
    P.el.appendChild(flashEl);
  }
  function clearFlash() {
    if (flashEl) {
      flashEl.remove();
      flashEl = null;
    }
  }
  const rubberP = (over) => {
    const WH = pwin.clientHeight;
    return Math.sign(over) * (1 - 1 / ((Math.abs(over) * 0.55) / WH + 1)) * WH * 0.5;
  };
  // the link under the pointer: an inline link is hit only on its words; a link box across the page
  const hitAt = (P, e: PointerEvent) => {
    const wr = pwin.getBoundingClientRect(),
      cy = (e.clientY - wr.top - sheetY(P)) / PP,
      cx = (e.clientX - wr.left - P.sx) / PP;
    return P.bm.hits.find((h) => cy >= h.y0 && cy < h.y1 && (h.x0 == null || (cx >= h.x0 && cx < h.x1)));
  };
  pwin.addEventListener("pointerdown", (e) => {
    const P = livePaper();
    if (!P || P.state !== "rest" || e.button > 0) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    hand.classList.remove("show");
    const hit = hitAt(P, e);
    pdrag = {
      x0: e.clientX,
      y0: e.clientY,
      sy0: P.sy,
      lastY: e.clientY,
      lastT: performance.now(),
      vy: 0,
      mode: P.p > 0 ? "tear" : null,
      hit,
      xs: e.clientX - (P.p * TEAR_LEN + 4) * P.dir,
    }; // a page still swinging back is picked up where it is
    P.vel = 0;
    P.target = null;
    if (hit && !pdrag.mode) flashBox(P, hit);
    kickP();
  });
  pwin.addEventListener("pointermove", (e) => {
    const P = livePaper(),
      d = pdrag;
    // a mouse over a link gets the pointing finger; the rest of the sheet keeps the open hand for dragging
    if (P && !d && e.pointerType === "mouse") P.el.style.cursor = P.state === "rest" && hitAt(P, e) ? "pointer" : "";
    if (!P || !d) return;
    const dx = e.clientX - d.x0,
      dy = e.clientY - d.y0;
    if (!d.mode) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        d.mode = "tear";
        startTear(P, Math.sign(dx));
        d.xs = e.clientX;
      } else if (Math.hypot(dx, dy) > 6) d.mode = "scroll";
      if (!d.mode) return;
      clearFlash();
    }
    if (d.mode === "scroll") {
      const now = performance.now(),
        dt = Math.max(1, now - d.lastT);
      d.vy = (e.clientY - d.lastY) / dt;
      P.vel = -d.vy;
      d.lastY = e.clientY;
      d.lastT = now;
      const raw = d.sy0 - dy,
        max = maxSy(P);
      P.sy = raw < 0 ? rubberP(raw) : raw > max ? max + rubberP(raw - max) : raw;
    } else {
      let m = (e.clientX - d.xs) * P.dir;
      if (m < 0 && P.p < 0.02) {
        startTear(P, -P.dir);
        d.xs = e.clientX;
        m = 0;
      } // changed direction before it began to tear
      const np = Math.max(0, Math.min(1, (m - 4) / TEAR_LEN));
      P.p = P.p >= RIP ? Math.max(P.p, np) : np;
      ticks(P);
      if (P.p >= 1) {
        swiped();
        tearOff(Math.abs(e.movementX || 0) / 16);
        afterTear();
        return;
      }
    }
    kickP();
  });
  const pEnd = (e) => {
    const P = livePaper(),
      d = pdrag;
    pdrag = null;
    if (!P || !d) return;
    clearFlash();
    if (!d.mode && d.hit && e.type === "pointerup") {
      flashBox(P, d.hit);
      setTimeout(clearFlash, 120);
      sfx.tap();
      P.vel = 0;
      d.hit.act();
      return;
    }
    if (d.mode === "tear" && P.p >= RIP) {
      swiped();
      P.leaving = true;
      P.auto = { t: 0 };
      afterTear();
      kickP();
      return;
    } // it has begun to rip: it finishes tearing by itself
    if (performance.now() - d.lastT > 80) P.vel = 0;
    kickP();
  };
  pwin.addEventListener("pointerup", pEnd);
  pwin.addEventListener("pointercancel", pEnd);
  const wheelPx = (e) => e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
  pwin.addEventListener(
    "wheel",
    (e) => {
      const P = livePaper();
      if (!P || P.state !== "rest") return;
      e.preventDefault();
      P.target = null;
      P.vel = 0;
      P.sy = Math.min(maxSy(P), Math.max(0, P.sy + wheelPx(e)));
      kickP();
    },
    { passive: false },
  );
  screenEl.addEventListener(
    "wheel",
    (e) => {
      const s = top();
      if (!s || !power) return;
      e.preventDefault();
      s.vel = 0;
      s.scroll = Math.min(maxScroll(s), Math.max(0, s.scroll + wheelPx(e) / PITCH));
      kick();
    },
    { passive: false },
  );

  const cutk = document.getElementById("cutk"),
    cutb = document.getElementById("cutb"); // desktop only
  if (cutb)
    cutb.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      cutk.dataset.st = "down";
      animKey(cutk, 4);
      sfx.key(true);
    });
  const cutUp = () => {
    if (cutk.dataset.st === "down") {
      cutk.dataset.st = "up";
      animKey(cutk, 0);
      sfx.key(false);
    }
  };
  if (cutb) for (const ev of ["pointerup", "pointerleave", "pointercancel"]) cutb.addEventListener(ev, cutUp);
  if (cutb)
    cutb.addEventListener("click", () => {
      if (livePaper()) {
        autoTear();
        afterTear();
      } else sfx.edge();
      cutUp();
    });

  addEventListener("keydown", (e) => {
    // keyboard: arrows scroll the paper or the screen, Escape tears off or goes back
    const P = livePaper(),
      s = top();
    if (!s) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const v = e.key === "ArrowDown" ? 1 : -1;
      if (P) {
        if (P.state === "rest") {
          P.target = null;
          P.vel = 0.9 * v;
          kickP();
        }
      } else {
        s.vel = 0.35 * v;
        kick();
      }
      e.preventDefault();
    }
    if (e.key === "Escape" || e.key === "Backspace") back();
  });

  /* ---------- start ---------- */
  if (!DESK) splitKeys();
  setTurn();
  void Promise.all(
    Object.keys(IMGS).map((k) =>
      getImg(k).then((i) => {
        loaded[k] = i;
      }),
    ),
  ).then(() => {
    resize();
    placePaper();
    buildLead();
    pRender();
    const p = pathNow(),
      known = !!R[p]; // an unknown address (the 404 page) shows the first screen
    history.replaceState({ from: null }, "", known ? p + location.search + location.hash : "/");
    show(known ? p : "/");
    draw();
    // the page opens as the screen powers on: the tube opens from a dot and the tape reads the first screen
    tubeOn();
    tape.power(true);
    if (!known) flash("PAGE NOT FOUND");
    if (DESK)
      addEventListener("resize", () => {
        resize();
      });
    else
      new ResizeObserver(() => {
        resize();
      }).observe(screenEl);
  });
}
