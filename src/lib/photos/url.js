// What each kind of photo is, and the address of one at a given width. Shared by the
// server and the browser, so the cloud name is the only setting here, and it's public:
// it's part of every photo's address.

export const PHOTO_KINDS = {
  dish: { ratio: [4, 3], maxWidth: 1600, widths: [400, 800, 1200] },
  cover: { ratio: [16, 9], maxWidth: 1920, widths: [640, 1280, 1920] },
  logo: { ratio: [1, 1], maxWidth: 512, widths: [96, 192] },
  block: { ratio: [4, 3], maxWidth: 1600, widths: [400, 800, 1200] },
};

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Cloudinary makes each size the first time it's asked for and keeps it. Asking only for
// these few widths keeps that count low, since each new size uses up allowance.
// f_auto and q_auto pick the best format and quality for the browser asking.
export function photoUrl(id, width) {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,c_limit,w_${width}/${id}`;
}

export const photoSrcSet = (id, kind = "dish") => PHOTO_KINDS[kind].widths.map((width) => `${photoUrl(id, width)} ${width}w`).join(", ");
