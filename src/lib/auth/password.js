import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt is built into Node and memory-hard, so guessing passwords on a GPU is slow.
// The parameters are stored with each hash, so they can be raised later without
// breaking existing users: scrypt$N$r$p$salt$hash (base64url).
const scryptAsync = promisify(scrypt);
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  // Constant-time comparison: the time taken doesn't reveal how much matched
  return timingSafeEqual(actual, expected);
}

// A real hash to compare against when the email doesn't exist, so a wrong email
// takes as long as a wrong password and response times don't reveal who has an account
let dummyHash;
export async function burnTime(password) {
  dummyHash ??= await hashPassword("not-a-real-password");
  await verifyPassword(password, dummyHash);
}
