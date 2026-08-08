/** WhatsApp Cloud API (Meta Graph) text sending. */

const DEFAULT_API_VERSION = 'v23.0';

export type WhatsappConfig = { phoneNumberId: string; token: string; apiVersion: string };

/** Returns null when the Cloud API credentials are not configured. */
export function getWhatsappConfig(): WhatsappConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !token) return null;
  return { phoneNumberId, token, apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION };
}

/** Fill the placeholders an admin can type in the message body. */
export function renderMessageBody(template: string, fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  return template.replace(/\{first_?name\}/gi, firstName).replace(/\{name\}/gi, fullName);
}

export type SendResult = { ok: true; messageId: string | null } | { ok: false; error: string };

type GraphResponse = {
  messages?: { id?: string }[];
  error?: { message?: string; code?: number; error_data?: { details?: string } };
};

/** Meta error codes worth explaining in plain language. */
const friendlyErrors: Record<number, string> = {
  190: 'The WhatsApp access token is not valid or has expired. Update WHATSAPP_ACCESS_TOKEN.',
  131026: 'This number cannot receive WhatsApp messages.',
  131030: 'This number is not in the allowed list of your WhatsApp test number.',
  131047: 'This person has not written to you in the last 24 hours, so WhatsApp needs an approved template instead.',
  131051: 'WhatsApp does not allow this message type for this number.',
  132000: 'WhatsApp rejected the message. Check the message text.',
  133010: 'The sending number is not registered with the WhatsApp Cloud API.',
  80007: 'WhatsApp rate limit reached. Wait a minute and send the rest.',
};

export async function sendWhatsappText(config: WhatsappConfig, to: string, body: string): Promise<SendResult> {
  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: 'Could not reach WhatsApp. Check the internet connection.' };
  }

  const payload = (await response.json().catch(() => null)) as GraphResponse | null;
  if (!response.ok) {
    const code = payload?.error?.code;
    const friendly = typeof code === 'number' ? friendlyErrors[code] : undefined;
    return {
      ok: false,
      error: friendly
        ?? payload?.error?.error_data?.details
        ?? payload?.error?.message
        ?? `WhatsApp rejected the message (HTTP ${response.status}).`,
    };
  }
  return { ok: true, messageId: payload?.messages?.[0]?.id ?? null };
}
