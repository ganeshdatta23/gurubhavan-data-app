'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Download, FileUp, LogOut, Pencil, Search, Trash2, UserPlus, UsersRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DevoteeForm } from '@/components/devotees/DevoteeForm';
import { ImportDialog } from '@/components/admin/ImportDialog';
import { Dashboard } from '@/components/admin/Dashboard';
import { LookupCombobox } from '@/components/shared/LookupCombobox';
import { formatMobileDisplay, telHref } from '@/lib/phone';
import type { DevoteeListItem, LookupOption } from '@/types';

export type Tab = 'overview' | 'add' | 'people';
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
const emptyPagination: Pagination = { page: 1, pageSize: 20, total: 0, totalPages: 1 };
const pageSizes = [10, 20, 50];

export function AdminApp({ userName, countries: initialCountries, initialTab }: { userName: string; countries: LookupOption[]; initialTab: Tab }) {
  const router = useRouter();
  const [countries, setCountries] = useState(initialCountries);
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
  const [pageSize, setPageSize] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<DevoteeListItem | null>(null);
  const [deleting, setDeleting] = useState<DevoteeListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const editDialogRef = useDialogFocus(Boolean(editing), () => setEditing(null));

  // Refresh countries when people list reloads (e.g. after adding a custom location).
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/lookup/countries', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('countries');
        return response.json() as Promise<LookupOption[]>;
      })
      .then((rows) => {
        if (!controller.signal.aborted && Array.isArray(rows) && rows.length) setCountries(rows);
      })
      .catch(() => {
        // Keep current list if refresh fails.
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!countryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  function selectTab(next: Tab) {
    setTab(next);
    setNotice('');
    router.replace(next === 'people' ? '/admin?tab=people' : next === 'add' ? '/admin?tab=add' : '/admin', { scroll: false });
  }

  function openPeopleFromDashboard(filters: { countryId?: string; stateId?: string; cityId?: string }) {
    setQuery('');
    setSearch('');
    setCountryId(filters.countryId ?? '');
    setStateId(filters.stateId ?? '');
    setCityId(filters.cityId ?? '');
    setPage(1);
    selectTab('people');
  }

  function clearFilters() {
    setQuery(''); setSearch(''); setCountryId(''); setStateId(''); setCityId(''); setStates([]); setCities([]); setPage(1);
  }

  async function logout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Could not log out.');
      router.replace('/login');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not log out. Try again.');
      setLogoutBusy(false);
    }
  }

  async function removePerson() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const response = await fetch(`/api/devotees/${deleting.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Could not delete this person.'); return; }
      setNotice(`${deleting.fullName} was deleted.`);
      setDeleting(null);
      if (rows.length === 1 && page > 1) setPage((value) => value - 1);
      else setReloadKey((value) => value + 1);
    } catch {
      setError('Could not delete. Check internet and try again.');
    } finally {
      setDeleteBusy(false);
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

  return (
    <div className="min-h-screen bg-bg text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div><div className="flex items-center gap-2"><UsersRound className="text-accent" size={22} /><p className="text-lg font-bold tracking-tight">Guru Bhavan</p></div><p className="mt-0.5 max-w-[180px] truncate text-sm text-muted sm:max-w-none">Logged in as {userName}</p></div>
          <button type="button" disabled={logoutBusy} onClick={() => void logout()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"><LogOut size={17} /><span>{logoutBusy ? 'Logging out…' : 'Logout'}</span></button>
        </div>
      </header>

       <nav aria-label="Main sections" className="border-b border-border bg-white" role="tablist">
         <div className="mx-auto grid max-w-[1120px] grid-cols-3 gap-2 px-4 py-3 sm:px-6 md:flex">
            <TabButton active={tab === 'overview'} icon={<BarChart3 size={19} />} onClick={() => selectTab('overview')}>Overview</TabButton>
            <TabButton active={tab === 'add'} icon={<UserPlus size={19} />} onClick={() => selectTab('add')}>Add person</TabButton>
           <TabButton active={tab === 'people'} icon={<UsersRound size={19} />} onClick={() => selectTab('people')}>People</TabButton>
        </div>
      </nav>

      <main className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8">
         {tab === 'overview' ? <Dashboard countries={countries} onOpenPeople={openPeopleFromDashboard} /> : tab === 'add' ? <section className="mx-auto max-w-3xl rounded-xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-bold tracking-tight">Add a person</h1>
          <p className="mt-2 text-base text-muted">Fill the form and tap Save. You can add the next person right away.</p>
          <div className="mt-7"><DevoteeForm countries={countries} defaultCountryId={indiaId} onSaved={() => setReloadKey((value) => value + 1)} /></div>
        </section> : <section>
          <div><h1 className="text-2xl font-bold tracking-tight">People</h1><p className="mt-1 text-base text-muted">Find, update, or download people.</p></div>
          {notice && <p role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
          {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

           <div className="mt-5 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
             <label htmlFor="people-search" className="block font-semibold">Search people
               <span className="relative mt-2 block"><Search className="pointer-events-none absolute left-3.5 top-3.5 text-muted" size={19} aria-hidden="true" /><input id="people-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or mobile" className="h-12 w-full rounded-lg border border-border bg-white pl-11 pr-11 text-base outline-none focus:border-accent focus:ring-4 focus:ring-amber-100" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-gray-100"><X size={18} /></button>}</span>
             </label>
             <button type="button" onClick={() => setShowFilters((open) => !open)} className="mt-3 min-h-11 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-gray-50 sm:hidden">{showFilters ? 'Hide filters' : 'Show filters'}{filtersOn ? ' · Active' : ''}</button>
             <div className={`${showFilters ? 'grid' : 'hidden'} mt-4 gap-4 sm:grid sm:grid-cols-3`}>
               <FilterSelect label="Country" value={countryId} options={countries} onChange={(value) => { setCountryId(value); setStateId(''); setCityId(''); setStates([]); setCities([]); setPage(1); }} />
              <LookupCombobox
                label="State"
                value={stateId}
                options={states}
                disabled={!countryId}
                loading={loadingStates}
                allowEmpty
                emptyLabel="All states"
                placeholder={countryId ? 'Type state name' : 'Select country first'}
                 onChange={(value) => { setStateId(value); setCityId(''); setCities([]); setPage(1); }}
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
                 onChange={(value) => { setCityId(value); setPage(1); }}
                className="text-sm"
              />
             </div>
             {filtersOn && <button type="button" onClick={clearFilters} className="mt-4 min-h-11 text-sm font-semibold text-accent underline underline-offset-4">Clear filters</button>}
          </div>

           <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
             <button type="button" onClick={() => setShowImport(true)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 font-semibold shadow-sm transition hover:bg-gray-50 sm:w-auto sm:min-w-[180px]"><FileUp size={19} />Upload Excel</button>
             <button type="button" disabled={!pagination.total} onClick={() => setShowDownload(true)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-50 sm:w-auto sm:min-w-[180px]"><Download size={19} />Download</button>
          </div>

            <div aria-busy={loading} className={`mt-4 overflow-hidden rounded-xl border border-border bg-white shadow-sm ${loading ? 'opacity-75' : ''}`}>
             <div className="flex flex-col gap-3 border-b border-border px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
               <p aria-live="polite">{loading ? 'Loading people…' : pagination.total ? `Showing ${firstShown.toLocaleString()}–${lastShown.toLocaleString()} of ${pagination.total.toLocaleString()} ${pagination.total === 1 ? 'person' : 'people'}` : 'No people found'}</p>
              </div>
              <label className="flex items-center gap-2">Rows <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-10 rounded-lg border border-border bg-white px-2">{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            </div>

             {loading && rows.length === 0 ? <DirectorySkeleton /> : !loading && rows.length === 0 ? <div className="px-5 py-14 text-center"><UsersRound className="mx-auto text-gray-300" size={38} aria-hidden="true" /><p className="mt-3 font-semibold">{filtersOn ? 'No one matches.' : 'No people yet.'}</p><p className="mt-1 text-sm text-muted">{filtersOn ? 'Clear filters or try another name.' : 'Add your first person to start building the registry.'}</p>{!filtersOn && <button type="button" onClick={() => selectTab('add')} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-hover">Add person</button>}</div> : <>
               <div className="divide-y divide-border lg:hidden">{rows.map((row) => <PersonCard key={row.id} row={row} onEdit={() => setEditing(row)} onDelete={() => setDeleting(row)} />)}</div>
               <div className="hidden overflow-x-auto lg:block"><table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[18%]" /><col className="w-[8%]" /><col className="w-[9%]" /><col className="w-[6%]" /><col className="w-[8%]" /><col className="w-[10%]" /><col className="w-[15%]" /></colgroup><thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Name</th><th className="px-2 py-3">Mobile</th><th className="px-2 py-3">Address</th><th className="px-2 py-3">City</th><th className="px-2 py-3">State</th><th className="px-2 py-3">PIN</th><th className="px-2 py-3">Country</th><th className="px-2 py-3">Email</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.id} className="align-top hover:bg-amber-50/35"><td className="break-words px-3 py-4 font-semibold"><div className="line-clamp-3">{row.fullName}</div></td><td className="px-2 py-4"><a className="break-words text-accent hover:underline" href={telHref(row.mobile)}>{formatMobile(row.mobile)}</a></td><td className="px-2 py-4 text-muted"><div className="line-clamp-3 break-words" title={row.address}>{row.address}</div></td><td className="break-words px-2 py-4">{row.cityName}</td><td className="break-words px-2 py-4">{row.stateName}</td><td className="break-words px-2 py-4 font-mono">{row.postalCode || '—'}</td><td className="break-words px-2 py-4">{row.countryName}</td><td className="break-words px-2 py-4"><div className="line-clamp-2" title={row.email || undefined}>{row.email || '—'}</div></td><td className="px-3 py-3"><div className="flex flex-wrap justify-end gap-2"><SmallAction onClick={() => setEditing(row)}><Pencil size={16} />Edit</SmallAction><SmallAction danger onClick={() => setDeleting(row)}><Trash2 size={16} />Delete</SmallAction></div></td></tr>)}</tbody></table></div>
            </>}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-border p-3"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-border px-3 font-semibold disabled:opacity-40"><ChevronLeft size={17} />Previous</button><span className="whitespace-nowrap text-sm font-medium">Page {pagination.page} of {pagination.totalPages}</span><button disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-border px-3 font-semibold disabled:opacity-40">Next<ChevronRight size={17} /></button></div>
          </div>
        </section>}
      </main>

      {editing && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 md:p-6"><section ref={editDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="edit-title" aria-describedby="edit-description" className="min-h-full bg-white p-5 focus:outline-none md:mx-auto md:my-6 md:min-h-0 md:max-w-3xl md:rounded-xl md:p-7 md:shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 id="edit-title" className="text-2xl font-bold">Edit {editing.fullName}</h2><p id="edit-description" className="mt-1 text-muted">Update the details and save your changes.</p></div><button type="button" onClick={() => setEditing(null)} aria-label="Close edit dialog" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border"><X size={20} aria-hidden="true" /></button></div><DevoteeForm devotee={editing} countries={countries} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice('Updated.'); setReloadKey((value) => value + 1); }} /></section></div>}
      {deleting && <ConfirmDialog title={`Delete ${deleting.fullName}?`} onCancel={() => setDeleting(null)}><p>Remove {deleting.fullName} from the list? You can ask an admin if this was a mistake.</p><button onClick={() => void removePerson()} disabled={deleteBusy} className="mt-6 h-12 w-full rounded-lg bg-red-600 px-5 font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleteBusy ? 'Deleting…' : 'Delete person'}</button></ConfirmDialog>}
      {showDownload && <ConfirmDialog title={`Download ${pagination.total.toLocaleString()} ${pagination.total === 1 ? 'person' : 'people'}?`} onCancel={() => setShowDownload(false)}><p>{filtersOn ? 'The download will include everyone matching the current filters, not only this page.' : 'The download will include all active people.'}</p><div className="mt-6 grid gap-3"><button onClick={() => void download('excel')} disabled={downloadBusy} className="h-12 rounded-lg bg-accent px-5 font-semibold text-white hover:bg-accent-hover disabled:opacity-60">{downloadBusy ? 'Preparing…' : 'Download Excel'}</button><button onClick={() => void download('csv')} disabled={downloadBusy} className="h-12 rounded-lg border border-border px-5 font-semibold hover:bg-gray-50">Download CSV</button></div></ConfirmDialog>}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} onImported={(count) => { setShowImport(false); setNotice(`Imported ${count.toLocaleString()} ${count === 1 ? 'person' : 'people'}.`); setReloadKey((value) => value + 1); }} />}
    </div>
  );
}

function TabButton({ active, icon, onClick, children }: { active: boolean; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
   return <button type="button" role="tab" aria-selected={active} tabIndex={active ? 0 : -1} onClick={onClick} className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 font-semibold transition md:min-w-40 ${active ? 'bg-amber-100 text-amber-900 shadow-inner' : 'text-muted hover:bg-gray-50 hover:text-foreground'}`}>{icon}{children}</button>;
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
  return <label htmlFor={`filter-${label.toLowerCase()}`} className="block text-sm font-semibold"><span className="mb-2 block">{label}</span><select id={`filter-${label.toLowerCase()}`} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-12 w-full rounded-lg border border-border bg-white px-3 text-base outline-none focus:border-accent focus:ring-4 focus:ring-amber-100 disabled:bg-gray-100 disabled:text-gray-500"><option value="">{filterEmptyLabel(label)}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}

function PersonCard({ row, onEdit, onDelete }: { row: DevoteeListItem; onEdit: () => void; onDelete: () => void }) {
  return <article className="p-4"><div className="min-w-0"><h2 className="text-lg font-bold">{row.fullName}</h2><a href={telHref(row.mobile)} className="mt-1 inline-block text-base font-semibold text-accent">{formatMobile(row.mobile)}</a><p className="mt-2 text-sm font-medium">{row.cityName} · {row.stateName}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{row.address}</p>{row.email && <p className="mt-1 break-all text-sm text-muted">{row.email}</p>}</div><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={onEdit} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border font-semibold hover:bg-gray-50"><Pencil size={17} />Edit</button><button type="button" onClick={onDelete} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 font-semibold text-red-700 hover:bg-red-50"><Trash2 size={17} />Delete</button></div></article>;
}

function SmallAction({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 font-semibold ${danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-border hover:bg-gray-50'}`}>{children}</button>;
}

function useDialogFocus<T extends HTMLElement>(active: boolean, onClose: () => void) {
  const dialogRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
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
  }, [active]);

  return dialogRef;
}

function DirectorySkeleton() {
  return <div role="status" aria-label="Loading people" className="divide-y divide-border"><span className="sr-only">Loading people…</span>{[1, 2, 3, 4].map((item) => <div key={item} className="flex animate-pulse items-center gap-4 px-4 py-5"><div className="h-5 w-5 rounded bg-gray-200" /><div className="min-w-0 flex-1 space-y-2"><div className="h-4 w-2/5 rounded bg-gray-200" /><div className="h-3 w-3/5 rounded bg-gray-100" /></div><div className="hidden h-9 w-20 rounded bg-gray-100 sm:block" /></div>)}</div>;
}

function ConfirmDialog({ title, children, onCancel, wide, closeDisabled }: { title: string; children: React.ReactNode; onCancel: () => void; wide?: boolean; closeDisabled?: boolean }) {
  const titleId = useId();
  const descriptionId = `${titleId}-description`;
  const dialogRef = useDialogFocus(true, closeDisabled ? () => {} : onCancel);
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl focus:outline-none sm:rounded-xl sm:p-6 ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'}`}><div className="flex items-start justify-between gap-4"><h2 id={titleId} className="text-xl font-bold text-foreground">{title}</h2><button type="button" onClick={onCancel} disabled={closeDisabled} aria-label="Close dialog" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border disabled:opacity-40"><X size={18} aria-hidden="true" /></button></div><div id={descriptionId} className="mt-3 text-base leading-6 text-muted">{children}</div></section></div>;
}

function formatMobile(mobile: string) {
  return formatMobileDisplay(mobile);
}
