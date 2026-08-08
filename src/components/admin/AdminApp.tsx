'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, LogOut, MessageCircle, Pencil, Search, Trash2, UserPlus, UsersRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DevoteeForm } from '@/components/devotees/DevoteeForm';
import { LookupCombobox } from '@/components/shared/LookupCombobox';
import { formatMobileDisplay, telHref } from '@/lib/phone';
import type { DevoteeListItem, LookupOption, MessageSendResult } from '@/types';

type Tab = 'add' | 'people';
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
const emptyPagination: Pagination = { page: 1, pageSize: 50, total: 0, totalPages: 1 };
const pageSizes = [50, 100, 200];
/** People per request to /api/messages/send; each request streams one result per person. */
const sendBatchSize = 25;
const messageMaxLength = 3000;

export function AdminApp({ userName, countries, initialTab }: { userName: string; countries: LookupOption[]; initialTab: Tab }) {
  const router = useRouter();
  const indiaId = countries.find((country) => country.iso2?.toUpperCase() === 'IN')?.id;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [rows, setRows] = useState<DevoteeListItem[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [countryId, setCountryId] = useState('');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [states, setStates] = useState<LookupOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [cities, setCities] = useState<LookupOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<DevoteeListItem | null>(null);
  const [deleting, setDeleting] = useState<DevoteeListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [selected, setSelected] = useState<Map<number, DevoteeListItem>>(new Map());
  const [showSend, setShowSend] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendTotal, setSendTotal] = useState(0);
  const [sendProcessed, setSendProcessed] = useState(0);
  const [sendOk, setSendOk] = useState(0);
  const [sendFailures, setSendFailures] = useState<MessageSendResult[]>([]);
  const stopSending = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1); clearSelection(); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      setLoadingStates(false);
      return;
    }
    const controller = new AbortController();
    setLoadingStates(true);
    void fetch(`/api/lookup/states?countryId=${countryId}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('states');
        return response.json() as Promise<LookupOption[]>;
      })
      .then((rows) => {
        if (!controller.signal.aborted) setStates(Array.isArray(rows) ? rows : []);
      })
      .catch((cause) => {
        if (cause instanceof Error && cause.name === 'AbortError') return;
        setStates([]);
        setError('Could not load states.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStates(false);
      });
    return () => controller.abort();
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      setLoadingCities(false);
      return;
    }
    const controller = new AbortController();
    setLoadingCities(true);
    void fetch(`/api/lookup/cities?stateId=${stateId}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('cities');
        return response.json() as Promise<LookupOption[]>;
      })
      .then((rows) => {
        if (!controller.signal.aborted) setCities(Array.isArray(rows) ? rows : []);
      })
      .catch((cause) => {
        if (cause instanceof Error && cause.name === 'AbortError') return;
        setCities([]);
        setError('Could not load cities.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCities(false);
      });
    return () => controller.abort();
  }, [stateId]);

  const params = useMemo(() => new URLSearchParams({
    page: String(page), pageSize: String(pageSize),
    ...(search ? { q: search } : {}),
    ...(countryId ? { countryId } : {}),
    ...(stateId ? { stateId } : {}),
    ...(cityId ? { cityId } : {}),
  }), [page, pageSize, search, countryId, stateId, cityId]);

  useEffect(() => {
    if (tab !== 'people') return;
    const controller = new AbortController();
    async function load() {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/devotees?${params}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load people.');
        setRows(result.data);
        setPagination(result.pagination);
      } catch (cause) {
        if (cause instanceof Error && cause.name !== 'AbortError') setError(cause.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [params, reloadKey, tab]);

  /** A new search or location filter builds a different list, so the old ticks no longer apply. */
  function clearSelection() {
    setSelected((previous) => (previous.size ? new Map() : previous));
  }

  function toggleOne(row: DevoteeListItem) {
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(row.id)) next.delete(row.id);
      else next.set(row.id, row);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelected((previous) => {
      const next = new Map(previous);
      for (const row of rows) {
        if (checked) next.set(row.id, row);
        else next.delete(row.id);
      }
      return next;
    });
  }

  function selectTab(next: Tab) {
    setTab(next);
    setNotice('');
    router.replace(next === 'people' ? '/admin?tab=people' : '/admin', { scroll: false });
  }

  function clearFilters() {
    setQuery(''); setSearch(''); setCountryId(''); setStateId(''); setCityId(''); setStates([]); setCities([]); setPage(1); clearSelection();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  async function removePerson() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const response = await fetch(`/api/devotees/${deleting.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Could not delete this person.'); return; }
      setNotice(`${deleting.fullName} was deleted.`);
      setSelected((previous) => {
        if (!previous.has(deleting.id)) return previous;
        const next = new Map(previous);
        next.delete(deleting.id);
        return next;
      });
      setDeleting(null);
      if (rows.length === 1 && page > 1) setPage((value) => value - 1);
      else setReloadKey((value) => value + 1);
    } catch {
      setError('Could not delete. Check internet and try again.');
    } finally {
      setDeleteBusy(false);
    }
  }

  function openSend() {
    setShowSend(true);
    setSendDone(false);
    setSendError('');
    setSendTotal(0);
    setSendProcessed(0);
    setSendOk(0);
    setSendFailures([]);
  }

  function closeSend() {
    if (sending) return;
    if (sendDone && sendFailures.length === 0) setSelected(new Map());
    setShowSend(false);
  }

  async function runSend(recipients: { id: number; name: string }[]) {
    const body = messageBody.trim();
    if (!recipients.length || !body) return;
    stopSending.current = false;
    setSending(true);
    setSendDone(false);
    setSendError('');
    setSendTotal(recipients.length);
    setSendProcessed(0);
    setSendOk(0);
    setSendFailures([]);

    let processed = 0;
    let succeeded = 0;
    const failures: MessageSendResult[] = [];
    const reported = new Set<number>();
    try {
      for (let start = 0; start < recipients.length; start += sendBatchSize) {
        if (stopSending.current) break;
        const batch = recipients.slice(start, start + sendBatchSize);
        const controller = new AbortController();
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch.map((person) => person.id), body }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const failed = await response.json().catch(() => ({}));
          throw new Error(failed.error || 'Could not send the messages.');
        }

        // One JSON line per person, so the bar moves with every message.
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffered = '';
        let stopped = false;
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffered += decoder.decode(value, { stream: true });
          const lines = buffered.split('\n');
          buffered = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const item = JSON.parse(line) as MessageSendResult;
            reported.add(item.id);
            processed += 1;
            if (item.ok) succeeded += 1;
            else failures.push(item);
          }
          setSendProcessed(processed);
          setSendOk(succeeded);
          setSendFailures([...failures]);
          if (stopSending.current) {
            stopped = true;
            await reader.cancel().catch(() => {});
            controller.abort();
          }
        }
        if (stopped) break;
      }
      const untouched = recipients.filter((person) => !reported.has(person.id));
      if (stopSending.current && untouched.length) {
        for (const person of untouched) {
          failures.push({ id: person.id, name: person.name, ok: false, error: 'Not sent — the run was stopped.' });
        }
        setSendFailures([...failures]);
      }
      setSendDone(true);
      setNotice(`WhatsApp: ${succeeded.toLocaleString()} sent${failures.length ? `, ${failures.length.toLocaleString()} not sent` : ''}.`);
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Could not send the messages.');
    } finally {
      setSending(false);
    }
  }

  async function download(format: 'excel' | 'csv') {
    setDownloadBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/export/${format}?${params}`);
      if (!response.ok) throw new Error((await response.json()).error || 'Could not download the file.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `guru-bhavan-people.${format === 'excel' ? 'xlsx' : 'csv'}`;
      link.click();
      URL.revokeObjectURL(url);
      setShowDownload(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download the file.');
    } finally {
      setDownloadBusy(false);
    }
  }

  const filtersOn = Boolean(query || countryId || stateId || cityId);
  const firstShown = pagination.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastShown = Math.min(pagination.page * pagination.pageSize, pagination.total);
  const selectedCount = selected.size;
  const selectedOnPage = rows.filter((row) => selected.has(row.id)).length;
  const allPageSelected = rows.length > 0 && selectedOnPage === rows.length;
  const somePageSelected = selectedOnPage > 0 && !allPageSelected;
  const sendCount = sending || sendDone ? sendTotal : selectedCount;
  const sendPercent = sendTotal ? Math.round((sendProcessed / sendTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div><div className="flex items-center gap-2"><UsersRound className="text-accent" size={22} /><p className="text-lg font-bold tracking-tight">Guru Bhavan</p></div><p className="mt-0.5 max-w-[180px] truncate text-sm text-muted sm:max-w-none">Logged in as {userName}</p></div>
          <button onClick={() => void logout()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-sm font-semibold transition hover:bg-gray-50"><LogOut size={17} /><span className="hidden min-[360px]:inline">Logout</span></button>
        </div>
      </header>

      <nav aria-label="Main sections" className="border-b border-border bg-white">
        <div role="tablist" className="mx-auto grid max-w-[1120px] grid-cols-2 gap-2 px-4 py-3 sm:px-6 md:flex">
          <TabButton active={tab === 'add'} icon={<UserPlus size={19} />} onClick={() => selectTab('add')}>Add person</TabButton>
          <TabButton active={tab === 'people'} icon={<UsersRound size={19} />} onClick={() => selectTab('people')}>People</TabButton>
        </div>
      </nav>

      <main className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8">
        {tab === 'add' ? <section className="mx-auto max-w-3xl rounded-xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-bold tracking-tight">Add a person</h1>
          <p className="mt-2 text-base text-muted">Fill the form and tap Save. You can add the next person right away.</p>
          <div className="mt-7"><DevoteeForm countries={countries} defaultCountryId={indiaId} onSaved={() => setReloadKey((value) => value + 1)} /></div>
        </section> : <section>
          <div><h1 className="text-2xl font-bold tracking-tight">People</h1><p className="mt-1 text-base text-muted">Find, update, or download people.</p></div>
          {notice && <p role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
          {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="mt-5 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <label className="block font-semibold">Search people
              <span className="relative mt-2 block"><Search className="pointer-events-none absolute left-3.5 top-3.5 text-muted" size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or mobile" className="h-12 w-full rounded-lg border border-border bg-white pl-11 pr-11 text-base outline-none focus:border-accent focus:ring-4 focus:ring-amber-100" />{query && <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-gray-100"><X size={18} /></button>}</span>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <FilterSelect label="Country" value={countryId} options={countries} onChange={(value) => { setCountryId(value); setStateId(''); setCityId(''); setStates([]); setCities([]); setPage(1); clearSelection(); }} />
              <LookupCombobox
                label="State"
                value={stateId}
                options={states}
                disabled={!countryId}
                loading={loadingStates}
                allowEmpty
                emptyLabel="All states"
                placeholder={countryId ? 'Type state name' : 'Select country first'}
                onChange={(value) => { setStateId(value); setCityId(''); setCities([]); setPage(1); clearSelection(); }}
                className="text-sm"
              />
              <LookupCombobox
                label="City"
                value={cityId}
                options={cities}
                disabled={!stateId}
                loading={loadingCities}
                allowEmpty
                emptyLabel="All cities"
                placeholder={stateId ? 'Type city name' : 'Select state first'}
                onChange={(value) => { setCityId(value); setPage(1); clearSelection(); }}
                className="text-sm"
              />
            </div>
            {filtersOn && <button onClick={clearFilters} className="mt-4 min-h-11 text-sm font-semibold text-accent underline underline-offset-4">Clear filters</button>}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button disabled={!selectedCount || sending} onClick={openSend} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-clean px-3 font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50 sm:w-auto sm:min-w-[180px]"><MessageCircle size={19} />Send messages{selectedCount ? ` (${selectedCount.toLocaleString()})` : ''}</button>
            <button disabled={!pagination.total} onClick={() => setShowDownload(true)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-50 sm:w-auto sm:min-w-[180px]"><Download size={19} />Download</button>
            <p className="text-sm text-muted sm:ml-1">{selectedCount ? <>{selectedCount.toLocaleString()} selected · <button onClick={clearSelection} className="font-semibold text-accent underline underline-offset-4">Clear selection</button></> : 'Tick people below to send WhatsApp messages.'}</p>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <p aria-live="polite">{loading ? 'Loading people…' : `Showing ${firstShown.toLocaleString()}–${lastShown.toLocaleString()} of ${pagination.total.toLocaleString()} ${pagination.total === 1 ? 'person' : 'people'} · by city`}</p>
                {rows.length > 0 && <label className="flex min-h-8 items-center gap-2 font-semibold text-foreground lg:hidden"><SelectAllBox checked={allPageSelected} indeterminate={somePageSelected} onChange={togglePage} label="Select everyone on this page" />Select all {rows.length} on this page</label>}
              </div>
              <label className="flex items-center gap-2">Rows <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-10 rounded-lg border border-border bg-white px-2">{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            </div>

            {!loading && rows.length === 0 ? <div className="px-5 py-14 text-center"><UsersRound className="mx-auto text-gray-300" size={38} /><p className="mt-3 font-semibold">{filtersOn ? 'No one matches.' : 'No people yet.'}</p><p className="mt-1 text-sm text-muted">{filtersOn ? 'Clear filters or try another name.' : 'Go to Add person to register someone.'}</p></div> : <>
              <div className="divide-y divide-border lg:hidden">{rows.map((row) => <PersonCard key={row.id} row={row} selected={selected.has(row.id)} onToggle={() => toggleOne(row)} onEdit={() => setEditing(row)} onDelete={() => setDeleting(row)} />)}</div>
              <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1090px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted"><tr><th className="w-12 px-4 py-3"><SelectAllBox checked={allPageSelected} indeterminate={somePageSelected} onChange={togglePage} label="Select everyone on this page" /></th><th className="px-4 py-3">Name</th><th className="px-3 py-3">Mobile</th><th className="px-3 py-3">Address</th><th className="px-3 py-3">City</th><th className="px-3 py-3">State</th><th className="px-3 py-3">PIN</th><th className="px-3 py-3">Country</th><th className="px-3 py-3">Email</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id} className={`align-top hover:bg-amber-50/35 ${selected.has(row.id) ? 'bg-amber-50/60' : ''}`}><td className="px-4 py-4"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row)} aria-label={`Select ${row.fullName}`} className="h-5 w-5 cursor-pointer accent-accent" /></td><td className="px-4 py-4 font-semibold">{row.fullName}</td><td className="px-3 py-4"><a className="whitespace-nowrap text-accent hover:underline" href={telHref(row.mobile)}>{formatMobile(row.mobile)}</a></td><td className="max-w-[220px] px-3 py-4 text-muted">{row.address}</td><td className="px-3 py-4">{row.cityName}</td><td className="px-3 py-4">{row.stateName}</td><td className="px-3 py-4 font-mono">{row.postalCode || '—'}</td><td className="px-3 py-4">{row.countryName}</td><td className="max-w-[180px] break-words px-3 py-4">{row.email || '—'}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><SmallAction onClick={() => setEditing(row)}><Pencil size={16} />Edit</SmallAction><SmallAction danger onClick={() => setDeleting(row)}><Trash2 size={16} />Delete</SmallAction></div></td></tr>)}</tbody></table></div>
            </>}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-border p-3"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-border px-3 font-semibold disabled:opacity-40"><ChevronLeft size={17} />Previous</button><span className="whitespace-nowrap text-sm font-medium">Page {pagination.page} of {pagination.totalPages}</span><button disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-border px-3 font-semibold disabled:opacity-40">Next<ChevronRight size={17} /></button></div>
          </div>
        </section>}
      </main>

      {editing && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 md:p-6"><section role="dialog" aria-modal="true" aria-labelledby="edit-title" className="min-h-full bg-white p-5 md:mx-auto md:my-6 md:min-h-0 md:max-w-3xl md:rounded-xl md:p-7 md:shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 id="edit-title" className="text-2xl font-bold">Edit person</h2><p className="mt-1 text-muted">Update the details and save.</p></div><button onClick={() => setEditing(null)} aria-label="Close edit" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border"><X size={20} /></button></div><DevoteeForm devotee={editing} countries={countries} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice('Updated.'); setReloadKey((value) => value + 1); }} /></section></div>}
      {deleting && <ConfirmDialog title={`Delete ${deleting.fullName}?`} onCancel={() => setDeleting(null)}><p>Remove {deleting.fullName} from the list? You can ask an admin if this was a mistake.</p><button onClick={() => void removePerson()} disabled={deleteBusy} className="mt-6 h-12 w-full rounded-lg bg-red-600 px-5 font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleteBusy ? 'Deleting…' : 'Delete person'}</button></ConfirmDialog>}
      {showSend && <ConfirmDialog wide closeDisabled={sending} title={`Send WhatsApp to ${sendCount.toLocaleString()} ${sendCount === 1 ? 'person' : 'people'}`} onCancel={closeSend}>
        <label className="block text-sm font-semibold text-foreground">Message
          <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={5} maxLength={messageMaxLength} disabled={sending} placeholder="Namaste {name}, this Sunday's satsang starts at 6 pm at Guru Bhavan." className="mt-2 w-full rounded-lg border border-border p-3 text-base leading-6 text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-amber-100 disabled:bg-gray-100" />
        </label>
        <p className="mt-2 text-xs text-muted">Type <span className="font-mono">{'{name}'}</span> to include the person&apos;s name · {messageBody.length.toLocaleString()}/{messageMaxLength.toLocaleString()} characters</p>
        <p className="mt-2 text-xs text-muted">WhatsApp accepts a plain message only for people who wrote to you in the last 24 hours. Anyone else needs an approved template, and those show up as failed below.</p>

        {(sending || sendDone) && <div className="mt-5">
          <div className="flex items-center justify-between text-sm font-semibold text-foreground"><span>{sending ? 'Sending…' : 'Finished'}</span><span>{sendProcessed.toLocaleString()} of {sendTotal.toLocaleString()}</span></div>
          <div role="progressbar" aria-label="WhatsApp sending progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sendPercent} className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-clean transition-[width] duration-300" style={{ width: `${sendPercent}%` }} /></div>
          <p className="mt-2 text-sm">{sendOk.toLocaleString()} sent{sendFailures.length ? ` · ${sendFailures.length.toLocaleString()} not sent` : ''}</p>
          {sendFailures.length > 0 && <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{sendFailures.map((failure) => <li key={failure.id}><span className="font-semibold">{failure.name}</span> — {failure.error}</li>)}</ul>}
        </div>}
        {sendError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{sendError}</p>}

        <div className="mt-6 grid gap-3">
          {!sendDone && <button onClick={() => void runSend([...selected.values()].map((person) => ({ id: person.id, name: person.fullName })))} disabled={sending || !messageBody.trim() || !selectedCount} className="h-12 rounded-lg bg-clean px-5 font-semibold text-white hover:bg-green-800 disabled:opacity-60">{sending ? `Sending ${sendProcessed.toLocaleString()} of ${sendTotal.toLocaleString()}…` : `Send to ${selectedCount.toLocaleString()} ${selectedCount === 1 ? 'person' : 'people'}`}</button>}
          {sending && <button onClick={() => { stopSending.current = true; }} className="h-12 rounded-lg border border-border px-5 font-semibold hover:bg-gray-50">Stop sending</button>}
          {sendDone && sendFailures.length > 0 && <button onClick={() => void runSend(sendFailures.map((failure) => ({ id: failure.id, name: failure.name })))} className="h-12 rounded-lg bg-accent px-5 font-semibold text-white hover:bg-accent-hover">Try again for {sendFailures.length.toLocaleString()} not sent</button>}
          {sendDone && <button onClick={closeSend} className="h-12 rounded-lg border border-border px-5 font-semibold hover:bg-gray-50">Close</button>}
        </div>
      </ConfirmDialog>}
      {showDownload && <ConfirmDialog title={`Download ${pagination.total.toLocaleString()} ${pagination.total === 1 ? 'person' : 'people'}?`} onCancel={() => setShowDownload(false)}><p>{filtersOn ? 'The download will include everyone matching the current filters, not only this page.' : 'The download will include all active people.'}</p><div className="mt-6 grid gap-3"><button onClick={() => void download('excel')} disabled={downloadBusy} className="h-12 rounded-lg bg-accent px-5 font-semibold text-white hover:bg-accent-hover disabled:opacity-60">{downloadBusy ? 'Preparing…' : 'Download Excel'}</button><button onClick={() => void download('csv')} disabled={downloadBusy} className="h-12 rounded-lg border border-border px-5 font-semibold hover:bg-gray-50">Download CSV</button></div></ConfirmDialog>}
    </div>
  );
}

function TabButton({ active, icon, onClick, children }: { active: boolean; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return <button role="tab" aria-selected={active} onClick={onClick} className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 font-semibold transition md:min-w-40 ${active ? 'bg-amber-100 text-amber-900 shadow-inner' : 'text-muted hover:bg-gray-50 hover:text-foreground'}`}>{icon}{children}</button>;
}

function filterEmptyLabel(label: string) {
  const labels: Record<string, string> = {
    Country: 'All countries',
    State: 'All states',
    City: 'All cities',
  };
  return labels[label] ?? `All ${label.toLowerCase()}s`;
}

function FilterSelect({ label, value, options, onChange, disabled }: { label: string; value: string; options: LookupOption[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="block text-sm font-semibold"><span className="mb-2 block">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-12 w-full rounded-lg border border-border bg-white px-3 text-base outline-none focus:border-accent focus:ring-4 focus:ring-amber-100 disabled:bg-gray-100 disabled:text-gray-500"><option value="">{filterEmptyLabel(label)}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}

function SelectAllBox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <input type="checkbox" checked={checked} ref={(node) => { if (node) node.indeterminate = indeterminate; }} onChange={(event) => onChange(event.target.checked)} aria-label={label} className="h-5 w-5 cursor-pointer accent-accent" />;
}

function PersonCard({ row, selected, onToggle, onEdit, onDelete }: { row: DevoteeListItem; selected: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className={`p-4 ${selected ? 'bg-amber-50/60' : ''}`}><div className="flex items-start gap-3"><input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${row.fullName}`} className="mt-1.5 h-5 w-5 shrink-0 cursor-pointer accent-accent" /><div className="min-w-0 flex-1"><h2 className="text-lg font-bold">{row.fullName}</h2><a href={telHref(row.mobile)} className="mt-1 inline-block text-base font-semibold text-accent">{formatMobile(row.mobile)}</a><p className="mt-2 text-sm font-medium">{row.cityName} · {row.stateName}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{row.address}</p>{row.email && <p className="mt-1 break-all text-sm text-muted">{row.email}</p>}</div></div><div className="mt-4 grid grid-cols-2 gap-3"><button onClick={onEdit} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border font-semibold hover:bg-gray-50"><Pencil size={17} />Edit</button><button onClick={onDelete} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 font-semibold text-red-700 hover:bg-red-50"><Trash2 size={17} />Delete</button></div></article>;
}

function SmallAction({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 font-semibold ${danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-border hover:bg-gray-50'}`}>{children}</button>;
}

function ConfirmDialog({ title, children, onCancel, wide, closeDisabled }: { title: string; children: React.ReactNode; onCancel: () => void; wide?: boolean; closeDisabled?: boolean }) {
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"><section role="alertdialog" aria-modal="true" className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-xl sm:p-6 ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'}`}><div className="flex items-start justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button onClick={onCancel} disabled={closeDisabled} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border disabled:opacity-40"><X size={18} /></button></div><div className="mt-3 text-base leading-6 text-muted">{children}</div></section></div>;
}

function formatMobile(mobile: string) {
  return formatMobileDisplay(mobile);
}
