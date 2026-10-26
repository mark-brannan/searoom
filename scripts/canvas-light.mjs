// How a 3D canvas reads at night, against its median luminance (the sea):
//   seen   — pixels off the sea by more than SEEN_OFF_SEA either way, black
//            sky excluded, so the default hull's dark silhouette counts
//   bright — pixels more than BRIGHT_OVER_SEA above the sea: lights and a lit hull
// Shared by e2e.mjs and lit-canvas.mjs (searoom#218).
// The pass bar, hard-coded on purpose and never re-baselined (searoom#218).
// Measured on c17e6d0, 1280x900 swiftshader, two runs each, identical:
//   hull hint   0: 0.467% seen, 0.102% bright (the masthead light alone)
//   hull hint  30: 1.231% seen, 0.103% bright (the default)
//   hull hint  70: 1.399% seen, 0.583% bright
//   hull hint 100: 1.901% seen, 1.019% bright
export const MIN_SEEN_FRACTION = 0.008;
export const MAX_BRIGHT_FRACTION = 0.003;
const SEEN_OFF_SEA = 2; // of 255
const BRIGHT_OVER_SEA = 4; // of 255
const BLACK = 0.5; // the night sky at sky 0 renders as pure black

export async function canvasLight(page, png) {
  return page.evaluate(
    async ([b64, seenOff, brightOver, black]) => {
      const im = new Image();
      await new Promise((res, rej) => {
        im.onload = res;
        im.onerror = rej;
        im.src = 'data:image/png;base64,' + b64;
      });
      const c = document.createElement('canvas');
      c.width = im.width;
      c.height = im.height;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height).data;
      const lum = new Float32Array(d.length / 4);
      for (let i = 0; i < lum.length; i++) {
        lum[i] = 0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2];
      }
      const sea = Float32Array.from(lum).sort()[lum.length >> 1];
      let seen = 0;
      let bright = 0;
      for (const v of lum) {
        if (v > black && Math.abs(v - sea) > seenOff) seen++;
        if (v > sea + brightOver) bright++;
      }
      return { seen: seen / lum.length, bright: bright / lum.length };
    },
    [png.toString('base64'), SEEN_OFF_SEA, BRIGHT_OVER_SEA, BLACK],
  );
}
