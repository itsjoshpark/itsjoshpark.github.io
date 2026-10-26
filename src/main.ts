// Picks the device for the window: the desktop wall for a large window, the handheld for a phone or a narrow window.
// Each device loads its own code, styles and renders. When the window changes enough to need the other device, the page
// loads again; the address keeps the page that was open.
const wide = () => innerWidth >= 900 && innerHeight >= 560 && innerWidth / innerHeight >= 0.85;

// A tablet held upright gets the handheld at tablet size: the page is laid out TABLET_W px wide and the browser scales
// it up to the screen, so the device, its text and its paper all grow together. phone.css fills the window with the
// device when data-zoom is set, and the engine draws its canvases at the zoomed pixel ratio.
const TABLET_W = 640;
function fitTablet() {
  const touch = matchMedia("(pointer: coarse) and (hover: none)").matches,
    short = Math.min(screen.width, screen.height),
    upright = screen.orientation ? screen.orientation.type.startsWith("portrait") : innerHeight > innerWidth,
    zoom = touch && upright ? short / TABLET_W : 1;
  const on = zoom > 1.05; // phones are narrower than TABLET_W, so they stay at their own width
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      "content",
      on ? `width=${TABLET_W}, viewport-fit=cover` : "width=device-width, initial-scale=1, viewport-fit=cover",
    );
  if (on) document.documentElement.dataset.zoom = String(zoom);
  else delete document.documentElement.dataset.zoom;
}
fitTablet();
const desk = wide();

// Two separate loaders, not one if/else: the minifier would join the two imports into one call and load the phone's
// styles for the desktop.
const devices = { desk: () => import("./device/desktop.ts"), phone: () => import("./device/phone.ts") };
void devices[desk ? "desk" : "phone"]();

let timer: ReturnType<typeof setTimeout>;
addEventListener("resize", () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fitTablet();
    if (wide() !== desk) location.reload();
  }, 250);
});
