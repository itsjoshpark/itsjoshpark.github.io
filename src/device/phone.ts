// The handheld: a near-black device with an orange screen, three keys, a power rocker and a small printer.
import "./phone.css";
import { byName, pics } from "./assets.ts";
import { startDevice } from "./engine.ts";

const sprites = byName(
  import.meta.glob<string>("./assets/phone/*.webp", { eager: true, query: "?url", import: "default" }),
);

document.body.insertAdjacentHTML(
  "afterbegin",
  `
<div class="device" id="device" data-layout="cover" data-power="on">
  <div class="upper">
    <div class="bezel"><svg class="frame" id="frame" aria-hidden="true"></svg>
      <div class="screen" id="screen" role="application" aria-label="Screen. Drag to scroll, tap a line to print it."><div class="tube" id="tube"><canvas class="glow" id="glow" aria-hidden="true"></canvas><canvas id="lcd" aria-hidden="true"></canvas><div class="scan" aria-hidden="true"></div></div><span class="spot" id="spot" aria-hidden="true"></span><svg class="dome" id="dome" aria-hidden="true"></svg></div>
    </div>
    <div class="printer" id="printer" aria-hidden="true"></div>
  </div>
  <div class="keys" role="group" aria-label="Keys">
    <div class="col" data-on><button data-view="about" aria-current="page">About</button></div>
    <div class="col"><button data-view="work">Work</button></div>
    <div class="col"><button data-view="personal">Personal</button></div>
  </div>
  <div class="foot" id="foot" data-power="on"><span class="grille" aria-hidden="true"></span><span class="pwr" aria-hidden="true"></span>
    <button class="snd" id="snd" aria-pressed="true" aria-label="Screen power"><span class="rocker" aria-hidden="true"></span></button></div>
  <div class="pwin" id="pwin" role="document" aria-label="Printout. Drag it up or down to scroll it. Swipe it sideways to tear it off."></div>
</div>
<div class="fall" id="fall" aria-hidden="true"></div>
<div class="sr" id="sr" aria-live="polite"></div>
`,
);
startDevice({ desk: false, sprites, pics });
