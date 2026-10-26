// The desktop: one wall of a 1970s mainframe room. A picture tube with the keys, a line printer, and a tape unit.
import "./desktop.css";
import { byName, pics } from "./assets.ts";
import metas from "./desk-metas.json";
import { startDevice } from "./engine.ts";

/** Where each part of a wall render is, in image px (made by the Blender script with the render). */
export type WallMeta = (typeof metas)[number];

// one set of sprites per wall render: the base wall, then two taller ones for taller windows
const files = import.meta.glob<string>("./assets/desk/*/*.webp", { eager: true, query: "?url", import: "default" });
const walls = metas.map((_, i) =>
  byName(Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith(`./assets/desk/${i}/`)))),
);

document.body.insertAdjacentHTML(
  "afterbegin",
  `
<div class="stage" id="device" data-power="on">
  <div class="wall" id="wall">
    <div class="ext" id="extT" aria-hidden="true"></div><div class="ext" id="extB" aria-hidden="true"></div><div class="ext" id="extL" aria-hidden="true"></div><div class="ext" id="extR" aria-hidden="true"></div>
    <div class="bg" aria-hidden="true"></div>
    <svg class="deck" id="deck" aria-hidden="true"></svg>
    <div class="glassw" id="glassw" aria-hidden="true"></div><span class="lamp" id="readLamp" aria-hidden="true"></span><div class="plmp" id="rdyOff" aria-hidden="true"></div><div class="plmp" id="tlOff" aria-hidden="true"></div>
    <div class="halo" id="halo" aria-hidden="true"></div>
    <div class="screen" id="screen" role="application" aria-label="Screen. Drag to scroll, click a line to print it."><div class="tube" id="tube"><canvas class="glow" id="glow" aria-hidden="true"></canvas><canvas id="lcd" aria-hidden="true"></canvas><div class="scan" aria-hidden="true"></div></div><span class="spot" id="spot" aria-hidden="true"></span><svg class="dome" id="dome" aria-hidden="true"></svg></div>
    <div class="keys" id="keys" role="group" aria-label="Keys">
      <div class="col" data-on><button data-view="about" aria-current="page">About</button></div>
      <div class="col"><button data-view="work">Work</button></div>
      <div class="col"><button data-view="personal">Personal</button></div>
    </div>
    <div class="pwr" id="pwr" aria-hidden="true"></div>
    <button class="snd" id="snd" aria-pressed="true" aria-label="Screen power"></button>
    <div class="cutk" id="cutk"><button id="cutb" aria-label="Cut off the printout">Cut</button></div>
    <div class="pwin" id="pwin" role="document" aria-label="Printout. Drag it up or down to scroll it. Drag it sideways to tear it off."></div>
  </div>
</div>
<div class="fall" id="fall" aria-hidden="true"></div>
<div class="sr" id="sr" aria-live="polite"></div>
`,
);
startDevice({ desk: true, walls, metas, pics });
