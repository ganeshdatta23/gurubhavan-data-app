import { NextRequest, NextResponse } from 'next/server';
import { listDevoteeIds, listDevoteesForMessaging } from '@/db/queries/devotees';
import { requireAdmin } from '@/lib/auth';
import { normalizeAndCheckMobile } from '@/lib/phone';
import { sendMessagesSchema } from '@/lib/validators';
import { getWhatsappConfig, renderMessageBody, sendWhatsappText } from '@/lib/whatsapp';
import type { MessageSendResult } from '@/types';
import { isSameOriginMutation } from '@/lib/mutation-origin';

export const runtime = 'nodejs';

/**
 * Sends WhatsApp text messages one by one and streams a JSON line per person
 * (NDJSON) so the People tab can move its progress bar as each message goes out.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  await requireAdmin();
  const parsed = sendMessagesSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const config = getWhatsappConfig();
  if (!config) {
    return NextResponse.json({
      error: 'WhatsApp is not set up yet. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN, then restart the app.',
    }, { status: 503 });
  }

  const ids = parsed.data.all ? await listDevoteeIds(parsed.data.filters) : parsed.data.ids;
  const people = await listDevoteesForMessaging(ids);
  const byId = new Map(people.map((person) => [person.id, person]));
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function write(result: MessageSendResult) {
        controller.enqueue(encoder.encode(`${JSON.stringify(result)}\n`));
      }
      try {
        for (const id of ids) {
          // The caller closed the connection (Stop, or the tab went away).
          if (request.signal.aborted) break;
          const person = byId.get(id);
          if (!person) {
            write({ id, name: `Person #${id}`, ok: false, error: 'This person is no longer in the list.' });
            continue;
          }
          const check = normalizeAndCheckMobile(person.mobile, person.iso2);
          if (!check.ok) {
            write({ id, name: person.fullName, ok: false, error: check.error ?? 'Mobile number is not valid for WhatsApp.' });
            continue;
          }
          const outcome = await sendWhatsappText(config, check.normalized, renderMessageBody(parsed.data.body, person.fullName));
          write(outcome.ok
            ? { id, name: person.fullName, ok: true }
            : { id, name: person.fullName, ok: false, error: outcome.error });
        }
        controller.close();
      } catch {
        // The client went away mid-stream; nothing left to report to.
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
