// Bitmap fonts: proportional, one bit per pixel.
import PF from "./pixfonts.json"; // Handjet 17px and Tiny5 8px (both SIL Open Font License), pre-rasterized where they sit exactly on the pixel grid

const FONT: Record<string, { h: number; gl: Map<string, { adv: number; x0: number; w: number; bits: Uint8Array }> }> =
  {};
for (const [name, f] of Object.entries(
  PF as unknown as Record<string, { h: number; g: Record<string, [number, number, number, string]> }>,
)) {
  const gl = new Map();
  for (const [ch, [adv, x0, w, b64]] of Object.entries(f.g)) {
    const raw = atob(b64),
      bits = new Uint8Array(w * f.h);
    for (let i = 0; i < bits.length; i++) bits[i] = (raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
    gl.set(ch, { adv, x0, w, bits });
  }
  FONT[name] = { h: f.h, gl };
}
for (const ch of "ij") {
  const g = FONT.hj.gl.get(ch),
    w = g.w;
  for (let c = 0; c < w; c++) if (g.bits[3 * w + c] && !g.bits[4 * w + c] && g.bits[5 * w + c]) g.bits[3 * w + c] = 0;
}
// a north-east arrow after a link that leaves the site, drawn in the fonts' own one-dot strokes
export const OUT = "\u2197";
const ARROW = ["..#####", ".....##", "....#.#", "...#..#", "..#...#", ".#.....", "#......"];
for (const [name, top] of [
  ["hj", 5],
  ["t5", 1],
] as const) {
  const f = FONT[name],
    w = ARROW[0].length,
    bits = new Uint8Array(w * f.h);
  ARROW.forEach((r, y) => {
    for (let x = 0; x < w; x++) bits[(top + y) * w + x] = r[x] === "#" ? 1 : 0;
  });
  f.gl.set(OUT, { adv: w + 3, x0: 2, w, bits });
}
export const clean = (s: string) =>
  String(s)
    .replace(/[‘]/g, "'")
    .replace(/[“”]/g, '"');
const glyph = (f, ch) => f.gl.get(ch === "\u00a0" ? " " : ch) || f.gl.get("?");
// style: font, scale, tracking, line height
export type Style = [font: string, scale: number, tracking: number, lineHeight: number];
export const STY: Record<string, Style> = {
  body: ["hj", 1, 0, 19],
  title: ["hj", 2, 0, 36],
  small: ["t5", 1, 1, 11],
  code: ["hj", 1, 0, 19],
};
const CODE_TRACK = 1; // extra dots between the letters of inline code
export const measure = (s: string, [fn, sc, track]: Style) => {
  const f = FONT[fn];
  let w = 0,
    code = false;
  for (const ch of clean(s)) {
    if (ch === "`") {
      w += 2;
      code = !code;
    } else w += (glyph(f, ch).adv + track + (code ? CODE_TRACK : 0)) * sc;
  }
  return w - track * sc;
};
export function drawStr(put: (x: number, y: number) => void, s: string, x: number, y0: number, [fn, sc, track]: Style) {
  const f = FONT[fn];
  for (const ch of clean(s)) {
    if (ch === "`") continue;
    const g = glyph(f, ch);
    for (let r = 0; r < f.h; r++)
      for (let c = 0; c < g.w; c++)
        if (g.bits[r * g.w + c])
          for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) put(x + (g.x0 + c) * sc + b, y0 + r * sc + a);
    x += (g.adv + track) * sc;
  }
}
// inline `code`: struck twice, one dot apart, like a printer's emphasized mode, with more room between the letters.
// A backtick takes 2 dots of room, so code keeps clear of the words next to it. Returns whether the line ends inside code.
export function drawRich(
  put: (x: number, y: number) => void,
  l: string,
  x: number,
  y: number,
  st: Style,
  inCode: boolean,
) {
  let cx = x;
  l.split("`").forEach((s, i) => {
    if (i) {
      inCode = !inCode;
      cx += 2;
    }
    if (!s) return;
    const sty: Style = inCode ? [st[0], st[1], st[2] + CODE_TRACK, st[3]] : st,
      w = measure(s, sty);
    drawStr(put, s, cx, y, sty);
    if (inCode) drawStr(put, s, cx + 1, y, sty);
    cx += w + sty[2] * sty[1];
  });
  return inCode;
}
// code is never broken across lines: its spaces become no-break spaces
export const keepCode = (s: string) => s.replace(/`[^`]*`/g, (m) => m.replace(/ /g, "\u00a0"));
export function wrap(s: string, maxW: number, st: Style) {
  const out: string[] = [];
  let line = "";
  for (let w of clean(s).split(" ")) {
    while (measure(w, st) > maxW) {
      // a word longer than the line (a URL): break it after a slash or at the edge
      if (line) {
        out.push(line);
        line = "";
      }
      let n = w.length;
      while (n > 1 && measure(w.slice(0, n), st) > maxW) n--;
      const cut = w.lastIndexOf("/", n - 1);
      n = cut > 0 ? cut + 1 : n;
      out.push(w.slice(0, n));
      w = w.slice(n);
    }
    const t = line ? line + " " + w : w;
    if (measure(t, st) > maxW && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}
