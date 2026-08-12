'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { MessageSendResult } from '@/types';

type Filters = { q?: string; countryId?: string; stateId?: string; cityId?: string };
type Props = {
  count: number;
  ids: number[];
  all: boolean;
  filters: Filters;
  onClose: () => void;
};

export function WhatsAppDialog({ count, ids, all, filters, onClose }: Props) {
  const [body, setBody] = useState('Namaste {firstName}, thank you for being part of Guru Bhavan.');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState<MessageSendResult[]>([]);
  const [error, setError] = useState('');

  async function send() {
    setSending(true);
    setError('');
    setSent(0);
    setFailed([]);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: all ? [] : ids, all, filters, body }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error || 'Could not start WhatsApp sending.');
      }
      if (!response.body) throw new Error('WhatsApp did not return a progress stream.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const result = JSON.parse(line) as MessageSendResult;
          if (result.ok) setSent((value) => value + 1);
          else setFailed((current) => [...current, result]);
        }
        if (chunk.done) break;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send WhatsApp messages.');
    } finally {
      setSending(false);
    }
  }

  const completed = sent + failed.length;
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="whatsapp-title" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-accent"><MessageCircle size={21} /><h2 id="whatsapp-title" className="text-xl font-bold text-foreground">Send WhatsApp message</h2></div><p className="mt-2 text-sm text-muted">{all ? `All ${count.toLocaleString()} matching users` : `${count.toLocaleString()} selected users`}</p></div><button type="button" onClick={onClose} disabled={sending} aria-label="Close WhatsApp dialog" className="flex h-10 w-10 items-center justify-center rounded-lg border border-border disabled:opacity-40"><X size={18} /></button></div>
      <label className="mt-5 block text-sm font-semibold">Message <span className="font-normal text-muted">Use {'{firstName}'} or {'{name}'} for personalization.</span><textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={sending} rows={5} className="mt-2 w-full resize-y rounded-lg border border-border p-3 text-base outline-none focus:border-accent focus:ring-4 focus:ring-[#f4e7eb]" /></label>
      {sending && <div className="mt-4" aria-live="polite"><div className="flex justify-between text-sm font-semibold"><span>Sending messages...</span><span>{completed} / {count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f4e7eb]"><div className="h-full bg-accent transition-all" style={{ width: `${count ? (completed / count) * 100 : 0}%` }} /></div></div>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!sending && completed > 0 && <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">Sent {sent.toLocaleString()} message{sent === 1 ? '' : 's'}{failed.length ? `, ${failed.length} failed.` : '.'}</p>}
      {failed.length > 0 && <div className="mt-3 max-h-28 overflow-y-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">{failed.map((item) => <p key={item.id}>{item.name}: {item.error}</p>)}</div>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={sending} className="h-11 rounded-lg border border-border px-4 font-semibold disabled:opacity-50">{completed ? 'Close' : 'Cancel'}</button><button type="button" onClick={() => void send()} disabled={sending || !body.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 font-semibold text-white hover:bg-accent-hover disabled:opacity-50"><MessageCircle size={17} />{sending ? 'Sending...' : 'Send messages'}</button></div>
    </section>
  </div>;
}
