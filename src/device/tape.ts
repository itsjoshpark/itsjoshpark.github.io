// The tape unit, after the IBM 729: two reels over two vacuum columns. The tape runs in short bursts, like a drive
// reading blocks; the loops in the columns take up the jerks, and tape moves from one reel to the other.
import type { WallMeta } from "./desktop.ts";
import { rnd, sfx } from "./sound.ts";

export interface Tape {
  run(p: [speed: number, ms: number][], loud?: boolean): void;
  power(on: boolean): void;
  kill(): void;
}

/** The phone has no tape unit. */
export const noTape: Tape = { run() {}, power() {}, kill() {} };

export function makeTape(META: WallMeta, reduce: boolean): Tape {
  const T = META.tape,
    CM = META.pxcm,
    svg = document.getElementById("deck"),
    readLamp = document.getElementById("readLamp");
  svg.setAttribute("viewBox", `0 0 ${META.img[0]} ${META.img[1]}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const R = T.R,
    HUB = T.hub,
    V = 85 * CM; // tape speed: image px per second
  const MIN = HUB + 1.2 * CM,
    MAX = R - 0.8 * CM,
    AREA = MIN * MIN + MAX * MAX; // pack radii: rL² + rR² stays the same
  const PER = (MAX * MAX - MIN * MIN) / (V * 3600); // the tape only runs forward: a whole reel takes an hour of running
  let rL = Math.sqrt(AREA * 0.64),
    rR = Math.sqrt(AREA - rL * rL);
  const reel = (i: number, [cx, cy]: number[]) => {
    // three wide windows with round corners (a path stroked with round joins), between .34 R and .9 R
    const RI = 0.34 * R + 0.5 * CM,
      RO = 0.9 * R - 0.5 * CM,
      HW = 31,
      RC = CM; // inset by the corner radius RC
    const P = (r, a) =>
      `${(cx + r * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(cy + r * Math.sin((a * Math.PI) / 180)).toFixed(1)}`;
    const winD = [-150, -30, 90]
      .map(
        (c) =>
          `M${P(RI, c - HW + 4)} L${P(RO, c - HW)} A${RO} ${RO} 0 0 1 ${P(RO, c + HW)} L${P(RI, c + HW - 4)} A${RI} ${RI} 0 0 0 ${P(RI, c - HW + 4)} Z`,
      )
      .join(" ");
    const win = (fill, w) =>
      `<path d="${winD}" fill="${fill}" stroke="${fill}" stroke-width="${w}" stroke-linejoin="round"/>`;
    const lugs = [0, 120, 240]
      .map(
        (a) =>
          `<rect transform="rotate(${a} ${cx} ${cy})" x="${cx - 0.28 * CM}" y="${cy - 0.95 * CM}" width="${0.56 * CM}" height="${0.6 * CM}" rx="${0.12 * CM}" fill="url(#chromeG)"/>`,
      )
      .join("");
    const holes = [60, 180, 300]
      .map(
        (a) =>
          `<circle cx="${P(0.2 * R, a).split(" ")[0]}" cy="${P(0.2 * R, a).split(" ")[1]}" r="${0.32 * CM}" fill="#2a2926" stroke="#e9e7e2" stroke-opacity=".5" stroke-width="${0.08 * CM}"/>`,
      )
      .join("");
    return `<g>
      <circle cx="${cx + 0.45 * CM}" cy="${cy + 0.8 * CM}" r="${R}" fill="#000" opacity=".38" filter="url(#reelShadow)"/>
      <circle class="pack" cx="${cx}" cy="${cy}" r="${i ? rR : rL}" fill="url(#packG)" stroke="#2a1a10" stroke-width="${0.2 * CM}"/>
      <circle cx="${cx}" cy="${cy}" r="${HUB}" fill="#77746e"/>
      <mask id="win${i}" maskUnits="userSpaceOnUse"><circle cx="${cx}" cy="${cy}" r="${R + CM}" fill="#fff"/>${win("#000", 2 * RC)}</mask>
      <g class="turn">
        <g mask="url(#win${i})">
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#metalG)"/>
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#ringsG)"/>
          ${win("none", 2 * RC + 0.55 * CM).replace('fill="none" stroke="none"', 'fill="none" stroke="#4d4b46" stroke-opacity=".75"')}
          ${win("none", 2 * RC + 0.25 * CM).replace('fill="none" stroke="none"', 'fill="none" stroke="#f4f2ec" stroke-opacity=".35"')}
          <circle cx="${cx}" cy="${cy}" r="${R - 0.3 * CM}" fill="none" stroke="#f1efe9" stroke-opacity=".3" stroke-width="${0.45 * CM}"/>
          <circle cx="${cx}" cy="${cy}" r="${R - 0.05 * CM}" fill="none" stroke="#55534e" stroke-width="${0.12 * CM}"/>
        </g>
        <circle cx="${cx}" cy="${cy}" r="${0.27 * R}" fill="url(#hubM)" stroke="#6b6963" stroke-width="${0.1 * CM}"/>
        <circle cx="${cx}" cy="${cy}" r="${0.24 * R}" fill="none" stroke="#fbfaf6" stroke-opacity=".35" stroke-width="${0.08 * CM}"/>${holes}
        <text x="${cx}" y="${cy - 0.58 * R}" text-anchor="middle" dominant-baseline="middle" font-family="Antonio, 'Arial Narrow', sans-serif" font-weight="700" font-size="${1.5 * CM}" letter-spacing="${0.25 * CM}" fill="#3c3b38" fill-opacity=".8">JP·70</text>
        <circle cx="${cx}" cy="${cy}" r="${1.15 * CM}" fill="#1f1e1c"/>${lugs}
        <circle cx="${cx}" cy="${cy}" r="${0.42 * CM}" fill="url(#chromeG)" stroke="#3a3935" stroke-width="${0.06 * CM}"/>
      </g>
      <mask id="hl${i}" maskUnits="userSpaceOnUse"><circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff"/><g class="hlw">${win("#000", 2 * RC)}</g></mask>
      <g mask="url(#hl${i})" pointer-events="none">${[-135, 45].map((a) => `<path d="M${cx} ${cy} L${P(R, a - 9)} A${R} ${R} 0 0 1 ${P(R, a + 9)} Z" fill="url(#spunG)"/><path d="M${cx} ${cy} L${P(R, a - 24)} A${R} ${R} 0 0 1 ${P(R, a + 24)} Z" fill="url(#spunG)" opacity=".4"/>`).join("")}
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#sheen)"/></g>
    </g>`;
  };
  svg.innerHTML = `<defs>
      <radialGradient id="packG" spreadMethod="repeat" r=".035"><stop offset="0" stop-color="#2c1b10"/><stop offset=".5" stop-color="#3a2516"/><stop offset="1" stop-color="#2c1b10"/></radialGradient>
      <radialGradient id="metalG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8f8d88"/><stop offset=".6" stop-color="#7d7b76"/><stop offset="1" stop-color="#6a6864"/></radialGradient>
      <radialGradient id="ringsG" spreadMethod="repeat" r=".012"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".13"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></radialGradient>
      <radialGradient id="hubM" cx=".42" cy=".38"><stop offset="0" stop-color="#9a9893"/><stop offset=".8" stop-color="#7a7873"/><stop offset="1" stop-color="#62605c"/></radialGradient>
      <radialGradient id="chromeG" cx=".35" cy=".3"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#b9b7b2"/><stop offset="1" stop-color="#5d5b57"/></radialGradient>
      <radialGradient id="spunG" gradientUnits="objectBoundingBox" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></radialGradient>
      <filter id="reelShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${0.7 * CM}"/></filter>
      <linearGradient id="sheen" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#fffaf0" stop-opacity=".12"/><stop offset=".38" stop-color="#fffaf0" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs>
    <path id="tapeL" fill="none" stroke="#3b2516" stroke-width="${0.3 * CM}" stroke-linejoin="round"/><path id="tapeR" fill="none" stroke="#3b2516" stroke-width="${0.3 * CM}" stroke-linejoin="round"/>
    <path id="tapeH" fill="none" stroke="#3b2516" stroke-width="${0.3 * CM}"/>
    ${T.reels.map((c, i) => reel(i, c)).join("")}`;
  const turns = [...svg.querySelectorAll<SVGElement>(".turn")],
    packs = [...svg.querySelectorAll<SVGElement>(".pack")],
    hlws = [...svg.querySelectorAll<SVGElement>(".hlw")];
  const pL = svg.querySelector("#tapeL"),
    pR = svg.querySelector("#tapeR"),
    pH = svg.querySelector("#tapeH");
  // the tape path: pack -> outer roller -> down into the column, round the loop, up -> inner roller -> capstan, head, capstan -> the other column -> the other pack
  const leg = T.leg + T.roller,
    top = T.rollerY,
    cap = T.capstan,
    hy = T.head[0][1] - cap;
  const loop = [0.55, 0.5],
    loopTo = [0.55, 0.5],
    colTop = (i) => T.cols[i][1] + leg,
    colBot = (i) => T.cols[i][3] - leg - 0.6 * CM;
  function draw() {
    const [cL, cR] = T.reels,
      xL = (T.cols[0][0] + T.cols[0][2]) / 2,
      xR = (T.cols[1][0] + T.cols[1][2]) / 2;
    const yL = colTop(0) + (colBot(0) - colTop(0)) * loop[0],
      yR = colTop(1) + (colBot(1) - colTop(1)) * loop[1];
    pL.setAttribute(
      "d",
      `M${cL[0] - rL} ${cL[1]} L${xL - leg} ${top} L${xL - leg} ${yL} A${leg} ${leg} 0 0 0 ${xL + leg} ${yL} L${xL + leg} ${top} L${T.head[0][0]} ${hy}`,
    );
    pH.setAttribute("d", `M${T.head[0][0]} ${hy} L${T.head[1][0]} ${hy}`);
    pR.setAttribute(
      "d",
      `M${T.head[1][0]} ${hy} L${xR - leg} ${top} L${xR - leg} ${yR} A${leg} ${leg} 0 0 0 ${xR + leg} ${yR} L${xR + leg} ${top} L${cR[0] + rR} ${cR[1]}`,
    );
    packs[0].setAttribute("r", rL.toFixed(1));
    packs[1].setAttribute("r", rR.toFixed(1));
    turns.forEach((t, i) => {
      const r = `rotate(${ang[i].toFixed(2)} ${T.reels[i][0]} ${T.reels[i][1]})`;
      t.setAttribute("transform", r);
      hlws[i].setAttribute("transform", r);
    }); // the spun-metal light stays put, off the windows
  }
  let v = 0,
    prog = [],
    seg = null,
    segT = 0,
    ang = [rnd(0, 360), rnd(0, 360)],
    raf = 0,
    last = 0,
    on = true,
    moving = false,
    jT = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(50, last ? now - last : 16);
    last = now;
    if (!seg && prog.length) {
      seg = prog.shift();
      segT = 0;
      moving = !!seg[0];
    }
    const target = seg ? seg[0] * V : 0;
    if (seg && (segT += dt) >= seg[1]) {
      seg = null;
      if (!prog.length && moving) moving = false;
    }
    v += (target - v) * (1 - Math.exp(-dt / 90)); // the reels are heavy: they take a moment to start and stop
    if (Math.abs(v) < 0.05 * CM && !seg && !prog.length) v = 0;
    const ds = (v * dt) / 1000; // tape moved, image px; forward winds it from the left reel onto the right one
    rL = Math.sqrt(Math.min(MAX * MAX, Math.max(MIN * MIN, rL * rL - ds * PER)));
    rR = Math.sqrt(AREA - rL * rL);
    ang[0] -= ((ds / rL) * 180) / Math.PI;
    ang[1] -= ((ds / rR) * 180) / Math.PI; // both turn counterclockwise going forward
    // the loops in the vacuum columns rise and fall as the tape jerks
    if (v && (jT -= dt) <= 0) {
      jT = rnd(70, 180);
      loopTo[0] = rnd(0.25, 0.85);
      loopTo[1] = rnd(0.25, 0.85);
    }
    if (!v) {
      loopTo[0] = 0.55;
      loopTo[1] = 0.5;
    }
    for (let i = 0; i < 2; i++) loop[i] += (loopTo[i] - loop[i]) * (1 - Math.exp(-dt / 60));
    draw();
    readLamp.classList.toggle("on", Math.abs(v) > 4 * CM);
    sfx.hum(now < loudEnd ? Math.abs(v) / V : 0);
    if (v || seg || prog.length || Math.abs(loopTo[0] - loop[0]) > 0.005) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  // the hum plays only for a loud move (a new screen, power on), for as long as that move runs; printing turns the reels quietly
  let loudEnd = 0;
  function run(p, loud = false) {
    if (reduce || !on) return;
    if (loud) loudEnd = performance.now() + p.reduce((t, s) => t + s[1], 0) + 150;
    prog = p.slice();
    seg = null;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  draw();
  return {
    run,
    power(o) {
      on = o;
      if (!o) {
        prog = [];
        seg = null;
        moving = false;
        if (!raf) raf = requestAnimationFrame(frame);
      } else
        run(
          [
            [0, 120],
            [1, 600],
          ],
          true,
        );
    },
    kill() {
      cancelAnimationFrame(raf);
      raf = 0;
      sfx.hum(0);
    },
  };
}
