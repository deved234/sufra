import "server-only";
import { createHash } from "node:crypto";

// Cloudinary's REST API, with fetch and node:crypto and no SDK.
// https://cloudinary.com/documentation/authentication_signatures

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;

export const photosEnabled = Boolean(CLOUD && KEY && SECRET);

const api = (path) => `https://api.cloudinary.com/v1_1/${CLOUD}/${path}`;
const adminAuth = () => `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}`;

// Every field sent, sorted by name, as name=value joined by &, with the secret on the
// end. Whoever sees the result can't work out the secret, or change a field without
// the signature failing, and it stops working after an hour.
export function signature(fields, secret = SECRET) {
  const text = Object.keys(fields)
    .sort()
    .map((name) => `${name}=${fields[name]}`)
    .join("&");
  return createHash("sha1").update(text + secret).digest("hex");
}

const now = () => Math.floor(Date.now() / 1000);

// What a browser needs to send one file straight to Cloudinary. Only the file is left
// for it to choose, and this limits that too: the name, the formats and the largest size.
export function signUpload(publicId) {
  const signed = {
    allowed_formats: "webp,jpg,jpeg,png",
    public_id: publicId,
    timestamp: now(),
    transformation: "c_limit,w_2048",
  };
  return {
    url: api("image/upload"),
    fields: { ...signed, api_key: KEY, signature: signature(signed) },
  };
}

// The stored photo's real size, or null if there's no such photo. What a browser says it
// uploaded isn't taken on trust.
export async function getPhoto(publicId) {
  const response = await fetch(api(`resources/image/upload/${publicId}`), {
    headers: { Authorization: adminAuth() },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Cloudinary answered ${response.status}`);
  const { width, height } = await response.json();
  return { width, height };
}

// Run after the response: a failure leaves a file behind and must not bother anyone
export async function deletePhotos(publicIds) {
  for (const public_id of publicIds) {
    try {
      const signed = { invalidate: "true", public_id, timestamp: now() };
      const response = await fetch(api("image/destroy"), {
        method: "POST",
        body: new URLSearchParams({ ...signed, api_key: KEY, signature: signature(signed) }),
      });
      if (!response.ok) console.error(`[photos] couldn't delete a photo: Cloudinary answered ${response.status}`);
    } catch (error) {
      console.error("[photos] couldn't delete a photo:", error);
    }
  }
}
