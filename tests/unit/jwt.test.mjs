import { strict as assert } from "node:assert";
import { createHmac, createSign, generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { JwtError, verifyJwt } from "@/lib/auth/jwt";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
const NOW = Date.parse("2026-11-06T12:00:00Z");
const seconds = NOW / 1000;

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const claims = { iss: "https://accounts.google.com", aud: "client", exp: seconds + 3600, iat: seconds, nonce: "n", sub: "123" };

function sign({ header = { alg: "RS256", kid: "k" }, payload = claims, key = privateKey } = {}) {
  const body = `${encode(header)}.${encode(payload)}`;
  return `${body}.${createSign("RSA-SHA256").update(body).sign(key, "base64url")}`;
}

const options = { getKey: async (kid) => (kid === "k" ? publicKey : null), issuers: ["https://accounts.google.com"], audience: "client", nonce: "n", now: NOW };
const refusedFor = (message, token, extra = {}) =>
  assert.rejects(verifyJwt(token, { ...options, ...extra }), (error) => error instanceof JwtError && error.message === message);

test("a good token gives its claims", async () => {
  assert.equal((await verifyJwt(sign(), options)).sub, "123");
});

test("malformed tokens are refused", async () => {
  await refusedFor("malformed", "not-a-token");
  await refusedFor("malformed", null);
  await refusedFor("malformed", "a.b.c");
});

test("alg none is refused", async () => {
  const token = `${encode({ alg: "none", kid: "k" })}.${encode(claims)}.`;
  await refusedFor("algorithm", token);
});

test("an HMAC token signed with the public key is refused (algorithm confusion)", async () => {
  const body = `${encode({ alg: "HS256", kid: "k" })}.${encode(claims)}`;
  const secret = publicKey.export({ type: "spki", format: "pem" });
  await refusedFor("algorithm", `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`);
});

test("an unknown key is refused", async () => {
  await refusedFor("unknown key", sign({ header: { alg: "RS256", kid: "other" } }));
});

test("another key's signature is refused", async () => {
  await refusedFor("signature", sign({ key: other.privateKey }));
});

test("a changed payload breaks the signature", async () => {
  const [header, , signature] = sign().split(".");
  await refusedFor("signature", `${header}.${encode({ ...claims, sub: "attacker" })}.${signature}`);
});

test("a token for another site or issuer is refused", async () => {
  await refusedFor("audience", sign({ payload: { ...claims, aud: "another-site" } }));
  await refusedFor("issuer", sign({ payload: { ...claims, iss: "https://evil.example" } }));
});

test("expiry allows a minute of clock drift, and no more", async () => {
  assert.ok(await verifyJwt(sign({ payload: { ...claims, exp: seconds - 30 } }), options));
  await refusedFor("expired", sign({ payload: { ...claims, exp: seconds - 120 } }));
  await refusedFor("expired", sign({ payload: { ...claims, exp: undefined } }));
});

test("a token from the future is refused", async () => {
  await refusedFor("issued in the future", sign({ payload: { ...claims, iat: seconds + 300 } }));
});

test("the nonce ties it to this sign-in", async () => {
  await refusedFor("nonce", sign({ payload: { ...claims, nonce: "old" } }));
});
