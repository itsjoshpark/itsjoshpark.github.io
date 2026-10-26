// The renders, photos and screenshots are image files, so the build gives them hashed names and they are cached.

/** "./assets/pics/photo.jpg" -> "photo" */
export const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.replace(/^.*\/|\.\w+$/g, ""), url]));

/** The photo and the app screenshots, dithered on the screen and the paper. */
export const pics = byName(
  import.meta.glob<string>("./assets/pics/*.jpg", { eager: true, query: "?url", import: "default" }),
);
