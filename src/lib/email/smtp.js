import "server-only";
import { connect } from "node:tls";
import { assertAddress } from "@/lib/email/mime";

// A minimal SMTP client (RFC 5321) for one job: hand a finished message to a mail
// server that relays it, such as Gmail's. The conversation is plain text lines:
//
//   server: 220 smtp.gmail.com ready
//   client: EHLO sufra                  server: 250-... 250 SMTPUTF8
//   client: AUTH PLAIN <base64>         server: 235 Accepted
//   client: MAIL FROM:<from>            server: 250 OK
//   client: RCPT TO:<to>                server: 250 OK
//   client: DATA                        server: 354 Go ahead
//   client: <message>\r\n.\r\n          server: 250 OK, queued
//   client: QUIT                        server: 221 Bye
//
// Port 465 is TLS from the first byte ("implicit TLS", RFC 8314), so the password
// never crosses the network in the clear.

const TIMEOUT_MS = 15_000;

// Turns the socket's byte stream into whole replies. A reply may span several lines:
// "250-first", "250-second", "250 last" (a space after the code marks the last one).
function replyReader(socket) {
  let buffer = "";
  let lines = [];
  let failure = null;
  const ready = [];
  const waiting = [];

  const settle = (reply) => (waiting.length ? waiting.shift().resolve(reply) : ready.push(reply));
  const fail = (error) => {
    failure ??= error;
    while (waiting.length) waiting.shift().reject(failure);
  };

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let end;
    while ((end = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      lines.push(line);
      if (line[3] !== "-") {
        settle({ code: Number(line.slice(0, 3)), text: lines.map((l) => l.slice(4)).join(" ") });
        lines = [];
      }
    }
  });
  socket.on("error", fail);
  socket.on("close", () => fail(new Error("SMTP connection closed")));

  return () => {
    if (ready.length) return Promise.resolve(ready.shift());
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => waiting.push({ resolve, reject }));
  };
}

// RFC 5321 4.5.2: a line of the message that starts with "." gets a second one,
// so it can't be mistaken for the "." line that ends the message
const dotStuff = (message) => message.replace(/(^|\r\n)\./g, "$1..");

export async function sendMail({ host, port, user, pass, from, to, message }) {
  assertAddress(from);
  assertAddress(to);

  const socket = connect({ host, port, servername: host });
  socket.setTimeout(TIMEOUT_MS, () => socket.destroy(new Error("SMTP timed out")));
  const nextReply = replyReader(socket);

  // Send one command and check the reply code is one of the expected ones
  const step = async (command, expected) => {
    if (command !== null) socket.write(`${command}\r\n`);
    const reply = await nextReply();
    if (!expected.includes(reply.code)) {
      // The AUTH line carries the password, so it's never echoed into an error
      const shown = command?.startsWith("AUTH") ? "AUTH" : command;
      throw new Error(`SMTP ${shown ?? "greeting"} failed: ${reply.code} ${reply.text}`);
    }
    return reply;
  };

  try {
    await step(null, [220]);
    await step("EHLO sufra", [250]);
    // AUTH PLAIN (RFC 4616): base64 of "\0user\0password"
    await step(`AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString("base64")}`, [235]);
    await step(`MAIL FROM:<${from}>`, [250]);
    await step(`RCPT TO:<${to}>`, [250, 251]);
    await step("DATA", [354]);
    const accepted = await step(`${dotStuff(message.replace(/\r\n$/, ""))}\r\n.`, [250]);
    await step("QUIT", [221]).catch(() => {}); // the message is already accepted
    return accepted.text;
  } finally {
    socket.destroy();
  }
}
