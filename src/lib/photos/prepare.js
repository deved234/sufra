// Getting a photo ready in the browser, before it goes anywhere. The arithmetic is plain
// functions; the last two draw on a canvas. Redrawing also drops what the camera wrote
// into the file, like where the photo was taken.

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

// How much to scale the photo so it just covers the frame
export const coverScale = (natural, frame) => Math.max(frame.width / natural.width, frame.height / natural.height);

// How far the photo may slide before an edge of the frame would show nothing
export function clampPan({ x, y }, scale, natural, frame) {
  const limitX = Math.max(0, (natural.width * scale - frame.width) / 2);
  const limitY = Math.max(0, (natural.height * scale - frame.height) / 2);
  return { x: Math.min(limitX, Math.max(-limitX, x)), y: Math.min(limitY, Math.max(-limitY, y)) };
}

// The part of the original photo that's showing in the frame
export function visibleArea({ x, y }, scale, natural, frame) {
  const width = frame.width / scale;
  const height = frame.height / scale;
  return { x: natural.width / 2 - x / scale - width / 2, y: natural.height / 2 - y / scale - height / 2, width, height };
}

// Fails with a readable reason for files a browser can't open, like some HEIC photos
export async function openPhoto(file) {
  if (!file.type.startsWith("image/") && file.type !== "") throw new Error("photoNotImage");
  if (file.size > MAX_FILE_BYTES) throw new Error("photoTooLarge");
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("photoUnsupported");
  }
}

function encode(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("photoUnsupported"))), type, quality));
}

function draw(bitmap, area, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, width, height);
  return canvas;
}

// The cropped photo as a file, no wider than the kind needs, and never enlarged.
// Browsers that can't write WebP hand back a PNG, so that's checked for: JPEG is far
// smaller for a photo.
export async function exportPhoto(bitmap, area, { ratio, maxWidth }) {
  const width = Math.min(maxWidth, Math.round(area.width));
  const height = Math.round((width * ratio[1]) / ratio[0]);
  const canvas = draw(bitmap, area, width, height);
  const webp = await encode(canvas, "image/webp", 0.85);
  return webp.type === "image/webp" ? webp : encode(canvas, "image/jpeg", 0.85);
}

// A tiny version shown blurred while the real photo loads. It's small enough to be
// stored with the photo's details.
export function exportBlur(bitmap, area, { ratio }) {
  const canvas = draw(bitmap, area, 16, Math.round((16 * ratio[1]) / ratio[0]));
  const webp = canvas.toDataURL("image/webp", 0.5);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.5);
}
