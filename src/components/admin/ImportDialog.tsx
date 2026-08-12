'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Download, FileSpreadsheet, X } from 'lucide-react';

type ImportResult = { total: number; ready: number; problems: Array<{ row: number; name: string; reason: string }>; imported?: number };

export function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: (count: number) => void }) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState('');
   const dialogRef = useRef<HTMLElement>(null);
   const closeRef = useRef(onClose);

   useEffect(() => {
     closeRef.current = onClose;
   }, [onClose]);

   useEffect(() => {
     const previous = document.activeElement as HTMLElement | null;
     const dialog = dialogRef.current;
     if (!dialog) return;
     const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
     window.setTimeout(() => (focusable()[0] ?? dialog).focus(), 0);
     function onKeyDown(event: KeyboardEvent) {
       if (event.key === 'Escape') {
         event.preventDefault();
         closeRef.current();
         return;
       }
       if (event.key !== 'Tab') return;
       const items = focusable();
       if (!items.length) return;
       const first = items[0];
       const last = items[items.length - 1];
       if (event.shiftKey && document.activeElement === first) {
         event.preventDefault();
         last.focus();
       } else if (!event.shiftKey && document.activeElement === last) {
         event.preventDefault();
         first.focus();
       }
     }
     document.addEventListener('keydown', onKeyDown);
     return () => {
       document.removeEventListener('keydown', onKeyDown);
       previous?.focus();
     };
   }, []);

  async function check(action: 'preview' | 'import') {
    if (!file) return;
    setBusy(true);
    setError('');
    const body = new FormData();
    body.set('file', file);
    body.set('action', action);
    try {
      const response = await fetch('/api/import', { method: 'POST', body });
      const next = await response.json() as ImportResult & { error?: string };
      if (!response.ok) throw new Error(next.error || 'Could not check this file.');
      setResult(next);
      if (action === 'import') onImported(next.imported ?? 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not check this file.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
     <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="import-title" aria-describedby="import-description" className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl focus:outline-none sm:max-w-xl sm:rounded-xl sm:p-6">
       <div className="flex items-start justify-between gap-4"><div><h2 id="import-title" className="text-xl font-bold">Upload Excel</h2><p id="import-description" className="mt-1 text-sm text-muted">Check your list before adding people.</p></div><button type="button" onClick={onClose} aria-label="Close upload dialog" className="flex h-10 w-10 items-center justify-center rounded-lg border border-border"><X size={18} /></button></div>
       {!result && <div className="mt-6 rounded-xl border-2 border-dashed border-border bg-bg p-6 text-center"><FileSpreadsheet className="mx-auto text-accent" size={32} aria-hidden="true" /><label htmlFor={inputId} className="mt-3 block cursor-pointer font-semibold text-accent underline underline-offset-4">Choose an Excel file<input ref={fileRef} id={inputId} type="file" accept=".xlsx" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(''); }} /></label><p className="mt-2 text-sm text-muted">Use .xlsx files up to 5 MB and 5,000 rows.</p>{file && <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-medium">{file.name}</p>}</div>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {result && <div className="mt-6"><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-bg p-3"><p className="text-xl font-bold">{result.total}</p><p className="text-xs text-muted">Rows checked</p></div><div className="rounded-lg bg-green-50 p-3 text-green-800"><p className="text-xl font-bold">{result.ready}</p><p className="text-xs">Ready</p></div><div className="rounded-lg bg-red-50 p-3 text-red-800"><p className="text-xl font-bold">{result.problems.length}</p><p className="text-xs">Problems</p></div></div>{result.problems.length > 0 && <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-sm"><p className="font-semibold text-red-900">Fix these rows in the file and upload again:</p><ul className="mt-2 space-y-1 text-red-800">{result.problems.map((problem) => <li key={problem.row}>Row {problem.row}: {problem.name} — {problem.reason}</li>)}</ul></div>}{result.ready === 0 && <p className="mt-4 text-sm text-muted">There are no good rows to import yet.</p>}</div>}
      <div className="mt-6 grid gap-3 sm:flex sm:justify-end"><button type="button" onClick={() => { const link = document.createElement('a'); link.href = '/api/import/template'; link.download = 'guru-bhavan-import-template.xlsx'; link.click(); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 font-semibold hover:bg-gray-50"><Download size={17} />Download template</button>{!result ? <button type="button" disabled={!file || busy} onClick={() => void check('preview')} className="h-11 rounded-lg bg-accent px-5 font-semibold text-white disabled:opacity-50">{busy ? 'Checking…' : 'Check the list'}</button> : <><button type="button" disabled={busy} onClick={onClose} className="h-11 rounded-lg border border-border px-5 font-semibold">Cancel</button><button type="button" disabled={!result.ready || busy} onClick={() => void check('import')} className="h-11 rounded-lg bg-accent px-5 font-semibold text-white disabled:opacity-50">{busy ? 'Importing…' : `Import ${result.ready} good rows`}</button></>}</div>
    </section>
  </div>;
}
