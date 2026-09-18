import "server-only";

import type { Mailer, MailMessage } from "../../application/ports/mailer.ts";
import { sendSmtpMail, smtpSettingsFromEnv } from "./smtp.ts";

export function createMailer(): Mailer {
  const settings = smtpSettingsFromEnv();

  return {
    async send(message: MailMessage): Promise<void> {
      if (settings === undefined) {
        console.info(`[mail] to=${message.to} subject=${message.subject}\n${message.text}`);
        return;
      }

      await sendSmtpMail(settings, message);
    },
  };
}
