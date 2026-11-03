import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt is built into Node and memory-hard, so guessing passwords on a GPU is slow.
// The parameters are stored with each hash, so they can be raised later without
// breaking existing users: scrypt$N$r$p$salt$hash (base64url).
const scryptAsync = promisify(scrypt);
// OWASP's scrypt recommendation: N=2^17, r=8, p=1. That needs 128 MiB per hash,
// above Node's 32 MiB default, so maxmem is raised to fit.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const MAXMEM = 256 * 1024 * 1024;
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, { ...PARAMS, maxmem: MAXMEM });
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
    maxmem: MAXMEM,
  });
  // Constant-time comparison: the time taken doesn't reveal how much matched
  return timingSafeEqual(actual, expected);
}

// True for hashes made with other settings than today's
export function needsRehash(stored) {
  const [, N, r, p] = stored.split("$");
  return Number(N) !== PARAMS.N || Number(r) !== PARAMS.r || Number(p) !== PARAMS.p;
}

// A real hash to compare against when the email doesn't exist, so a wrong email
// takes as long as a wrong password and response times don't reveal who has an account
let dummyHash;
export async function burnTime(password) {
  dummyHash ??= await hashPassword("not-a-real-password");
  await verifyPassword(password, dummyHash);
}
