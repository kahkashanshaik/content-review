import { connect as netConnect, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";

export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

export type SmtpMessage = {
  to: string;
  subject: string;
  text: string;
};

const SMTP_TIMEOUT_MS = 20_000;

export function smtpSettingsFromEnv(
  env: Record<string, string | undefined> = process.env,
): SmtpSettings | undefined {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASS?.replaceAll(" ", "") ?? "";
  const from = env.MAIL_FROM?.trim() || user;
  const portValue = env.SMTP_PORT?.trim();
  const port = portValue === undefined || portValue.length === 0 ? 587 : Number(portValue);

  if (
    host === undefined ||
    host.length === 0 ||
    user === undefined ||
    user.length === 0 ||
    password.length === 0 ||
    from === undefined ||
    from.length === 0 ||
    !Number.isInteger(port) ||
    port <= 0
  ) {
    return undefined;
  }

  return { host, port, user, password, from };
}

export function authPlainToken(user: string, password: string): string {
  return Buffer.from(`\u0000${user}\u0000${password}`, "utf8").toString("base64");
}

export function authLoginToken(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

export function buildSmtpData(from: string, message: SmtpMessage): string {
  const subject = encodeHeader(message.subject);
  const body = message.text.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n");
  const stuffed = body
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");

  return [
    `From: ${from}`,
    `To: ${message.to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    stuffed,
    ".",
  ].join("\r\n");
}

export async function sendSmtpMail(settings: SmtpSettings, message: SmtpMessage): Promise<void> {
  const socket = await openSocket(settings);
  try {
    await readReply(socket, [220]);
    await sendCommand(socket, `EHLO content-review`, [250]);
    if (settings.port !== 465) {
      await sendCommand(socket, "STARTTLS", [220]);
      const secure = await upgradeTls(socket, settings.host);
      try {
        await sendMailOnSocket(secure, settings, message);
      } finally {
        secure.destroy();
      }
      return;
    }

    await sendMailOnSocket(socket, settings, message);
  } finally {
    socket.destroy();
  }
}

async function sendMailOnSocket(
  socket: Socket | TLSSocket,
  settings: SmtpSettings,
  message: SmtpMessage,
): Promise<void> {
  await sendCommand(socket, `EHLO content-review`, [250]);
  await authenticate(socket, settings);
  await sendCommand(socket, `MAIL FROM:<${settings.from}>`, [250]);
  await sendCommand(socket, `RCPT TO:<${message.to}>`, [250, 251]);
  await sendCommand(socket, "DATA", [354]);
  await sendCommand(socket, buildSmtpData(settings.from, message), [250]);
  await sendCommand(socket, "QUIT", [221, 250]);
}

async function authenticate(socket: Socket | TLSSocket, settings: SmtpSettings): Promise<void> {
  await sendCommand(socket, "AUTH LOGIN", [334]);
  await sendCommand(socket, authLoginToken(settings.user), [334]);
  await sendCommand(socket, authLoginToken(settings.password), [235]);
}

function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function openSocket(settings: SmtpSettings): Promise<Socket | TLSSocket> {
  if (settings.port === 465) {
    return new Promise((resolve, reject) => {
      const socket = tlsConnect(
        { host: settings.host, port: settings.port, servername: settings.host },
        () => {
          resolve(socket);
        },
      );
      socket.setTimeout(SMTP_TIMEOUT_MS);
      socket.once("error", reject);
      socket.once("timeout", () => {
        reject(new Error("The SMTP connection timed out."));
      });
    });
  }

  return new Promise((resolve, reject) => {
    const socket = netConnect(settings.port, settings.host, () => {
      resolve(socket);
    });
    socket.setTimeout(SMTP_TIMEOUT_MS);
    socket.once("error", reject);
    socket.once("timeout", () => {
      reject(new Error("The SMTP connection timed out."));
    });
  });
}

function upgradeTls(socket: Socket, host: string): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const secure = tlsConnect({ socket, host, servername: host }, () => {
      resolve(secure);
    });
    secure.setTimeout(SMTP_TIMEOUT_MS);
    secure.once("error", reject);
    secure.once("timeout", () => {
      reject(new Error("The SMTP TLS upgrade timed out."));
    });
  });
}

async function sendCommand(
  socket: Socket | TLSSocket,
  command: string,
  expected: readonly number[],
): Promise<void> {
  await writeLine(socket, command);
  await readReply(socket, expected);
}

function writeLine(socket: Socket | TLSSocket, command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(`${command}\r\n`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function readReply(socket: Socket | TLSSocket, expected: readonly number[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString("utf8");
      const reply = parseSmtpReply(buffer);
      if (reply === undefined) {
        return;
      }

      cleanup();
      if (!expected.includes(reply.code)) {
        reject(new Error(smtpErrorMessage(reply.code, reply.text)));
        return;
      }

      resolve();
    };

    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    const onTimeout = (): void => {
      cleanup();
      reject(new Error("The SMTP server stopped responding."));
    };

    const cleanup = (): void => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

function parseSmtpReply(buffer: string): { code: number; text: string } | undefined {
  const lines = buffer.split("\r\n");
  if (lines.length < 2) {
    return undefined;
  }

  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    if (line === undefined || line.length < 4 || line[3] !== " ") {
      continue;
    }

    const code = Number(line.slice(0, 3));
    if (!Number.isInteger(code)) {
      continue;
    }

    return { code, text: line.slice(4) };
  }

  return undefined;
}

function smtpErrorMessage(code: number, text: string): string {
  if (code === 535 || code === 534) {
    return "Gmail rejected the SMTP login. Check SMTP_USER and the Google App Password.";
  }

  return `The SMTP server returned ${code}: ${text}`;
}
