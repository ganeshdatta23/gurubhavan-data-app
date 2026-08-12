'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, MapPin, RefreshCw, TrendingUp, UsersRound } from 'lucide-react';
import type { LookupOption } from '@/types';

type DashboardFilters = { countryId?: string; stateId?: string; cityId?: string };
type Summary = {
  total: number;
  countries: number;
  states: number;
  cities: number;
  addedRecently: number;
  requiredCompleteness: number;
  emailCompleteness: number;
  postalCompleteness: number;
};
type GeographyRow = { id: number; name: string; count: number; countryName?: string; stateName?: string };
type DashboardData = {
  summary: Summary;
  countries: GeographyRow[];
  states: GeographyRow[];
  cities: GeographyRow[];
  trend: Array<{ date: string; count: number }>;
};

type Props = {
  countries: LookupOption[];
  onOpenPeople: (filters: DashboardFilters) => void;
};

export function Dashboard({ countries, onOpenPeople }: Props) {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [days, setDays] = useState(30);
  const [states, setStates] = useState<LookupOption[]>([]);
  const [cities, setCities] = useState<LookupOption[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!filters.countryId) {
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/lookup/states?countryId=${filters.countryId}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<LookupOption[]> : [])
      .then((rows) => { if (!controller.signal.aborted) setStates(rows); })
      .catch(() => { if (!controller.signal.aborted) setStates([]); });
    return () => controller.abort();
  }, [filters.countryId]);

  useEffect(() => {
    if (!filters.stateId) {
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/lookup/cities?stateId=${filters.stateId}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<LookupOption[]> : [])
      .then((rows) => { if (!controller.signal.aborted) setCities(rows); })
      .catch(() => { if (!controller.signal.aborted) setCities([]); });
    return () => controller.abort();
  }, [filters.stateId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (filters.countryId) params.set('countryId', filters.countryId);
    if (filters.stateId) params.set('stateId', filters.stateId);
    if (filters.cityId) params.set('cityId', filters.cityId);
    params.set('days', String(days));
    try {
      const response = await fetch(`/api/analytics/overview?${params}`, { cache: 'no-store' });
      const result = await response.json() as DashboardData & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not load the overview.');
      setData(result);
    } catch (cause) {
      if (cause instanceof Error) setError(cause.message);
      else setError('Could not load the overview.');
    } finally {
      setLoading(false);
    }
  }, [days, filters.cityId, filters.countryId, filters.stateId]);

  useEffect(() => {
    async function refresh() {
      await Promise.resolve();
      await load();
    }
    void refresh();
  }, [load]);

  function updateFilter(key: keyof DashboardFilters, value: string) {
    if (key === 'countryId') {
      setStates([]);
      setCities([]);
    } else if (key === 'stateId') {
      setCities([]);
    }
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      ...(key === 'countryId' ? { stateId: undefined, cityId: undefined } : {}),
      ...(key === 'stateId' ? { cityId: undefined } : {}),
    }));
  }

  function clearFilters() {
    setFilters({});
    setStates([]);
    setCities([]);
  }

  if (loading && !data) return <DashboardSkeleton />;
  if (error && !data) return <section className="rounded-xl border border-red-200 bg-red-50 p-6" role="alert"><h1 className="text-xl font-bold text-red-900">Unable to load the overview</h1><p className="mt-2 text-red-800">{error}</p><button type="button" onClick={() => void load()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 font-semibold text-white"><RefreshCw size={17} />Try again</button></section>;
  if (!data) return null;

  const hasRecords = data.summary.total > 0;
  const selectedCountry = countries.find((item) => String(item.id) === filters.countryId);
  const selectedState = states.find((item) => String(item.id) === filters.stateId);
  const selectedCity = cities.find((item) => String(item.id) === filters.cityId);

  return <section aria-labelledby="overview-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Overview</p><h1 id="overview-title" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Know your registry at a glance</h1><p className="mt-2 max-w-2xl text-base text-muted">See where people are registered, what changed recently, and where the data needs attention.</p></div>
      <button type="button" onClick={() => onOpenPeople(filters)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-hover"><UsersRound size={17} />Open people</button>
    </div>

    <div className="mt-6 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-bold">Explore the data</h2><p className="mt-1 text-sm text-muted">These filters update every number and chart below.</p></div>{(filters.countryId || filters.stateId || filters.cityId) && <button type="button" onClick={clearFilters} className="min-h-10 self-start text-sm font-semibold text-accent underline underline-offset-4">Clear filters</button>}</div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-sm font-semibold">Country<select value={filters.countryId ?? ''} onChange={(event) => updateFilter('countryId', event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border bg-white px-3 text-base font-normal outline-none focus:border-accent focus:ring-4 focus:ring-amber-100"><option value="">All countries</option>{countries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">State<select value={filters.stateId ?? ''} disabled={!filters.countryId} onChange={(event) => updateFilter('stateId', event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border bg-white px-3 text-base font-normal outline-none focus:border-accent focus:ring-4 focus:ring-amber-100 disabled:bg-gray-100"><option value="">All states</option>{states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">City<select value={filters.cityId ?? ''} disabled={!filters.stateId} onChange={(event) => updateFilter('cityId', event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border bg-white px-3 text-base font-normal outline-none focus:border-accent focus:ring-4 focus:ring-amber-100 disabled:bg-gray-100"><option value="">All cities</option>{cities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Trend range<select value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-2 h-12 w-full rounded-lg border border-border bg-white px-3 text-base font-normal outline-none focus:border-accent focus:ring-4 focus:ring-amber-100"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select></label>
      </div>
      {(selectedCountry || selectedState || selectedCity) && <p className="mt-3 text-sm text-muted">Showing <span className="font-semibold text-foreground">{[selectedCountry?.name, selectedState?.name, selectedCity?.name].filter(Boolean).join(' · ')}</span></p>}
    </div>

    {!hasRecords ? <div className="mt-6 rounded-xl border border-border bg-white p-10 text-center shadow-sm"><UsersRound className="mx-auto text-gray-300" size={42} /><h2 className="mt-4 text-xl font-bold">No people match these filters</h2><p className="mt-2 text-muted">Clear the filters or add your first person to start seeing insights.</p><button type="button" onClick={() => onOpenPeople({})} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 font-semibold text-white">View people <ArrowRight size={17} /></button></div> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active people" value={data.summary.total.toLocaleString()} icon={<UsersRound size={19} />} detail="Current records" />
        <MetricCard label="Added in 30 days" value={data.summary.addedRecently.toLocaleString()} icon={<TrendingUp size={19} />} detail="Recent registrations" />
        <MetricCard label="Places represented" value={`${data.summary.cities.toLocaleString()} cities`} icon={<MapPin size={19} />} detail={`${data.summary.countries} countries · ${data.summary.states} states`} />
        <MetricCard label="Required data quality" value={`${data.summary.requiredCompleteness}%`} icon={<BarChart3 size={19} />} detail="Name, mobile, and address" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel title="Where are people registered?" description="Select a country or state to drill down, then open the matching people list.">
          <GeoBars title="Countries" rows={data.countries.slice(0, 8)} total={data.summary.total} onSelect={(row) => updateFilter('countryId', String(row.id))} />
          {filters.countryId && <GeoBars title="States in this country" rows={data.states.slice(0, 8)} total={data.summary.total} onSelect={(row) => updateFilter('stateId', String(row.id))} />}
          {filters.stateId && <GeoBars title="Cities in this state" rows={data.cities.slice(0, 8)} total={data.summary.total} onSelect={(row) => updateFilter('cityId', String(row.id))} />}
          <button type="button" onClick={() => onOpenPeople(filters)} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-accent">View matching people <ArrowRight size={16} /></button>
        </Panel>
        <Panel title="Records added" description={`Daily registrations across the last ${days === 365 ? 'year' : `${days} days`}.`}><TrendChart values={data.trend} days={days} /></Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Data quality" description="Completeness is calculated from active records. Required quality checks name, mobile, and address; postal code is checked only for India."><QualityRow label="Required fields" value={data.summary.requiredCompleteness} /><QualityRow label="Email" value={data.summary.emailCompleteness} /><QualityRow label="PIN where required" value={data.summary.postalCompleteness} /><p className="mt-4 text-xs leading-5 text-muted">A score reflects fields present in the database, not whether a person’s details are factually correct.</p></Panel>
        <Panel title="Most represented cities" description="The leading cities in the current filtered view."><div className="space-y-3">{data.cities.slice(0, 5).map((row) => <button type="button" key={row.id} onClick={() => updateFilter('cityId', String(row.id))} className="flex w-full items-center justify-between gap-3 rounded-lg p-2 text-left hover:bg-amber-50"><span className="min-w-0"><span className="block truncate font-semibold">{row.name}</span><span className="block truncate text-xs text-muted">{row.stateName} · {row.countryName}</span></span><span className="shrink-0 font-bold text-accent">{row.count.toLocaleString()}</span></button>)}{!data.cities.length && <p className="text-sm text-muted">No city data is available for this view.</p>}</div></Panel>
      </div>
    </>}
  </section>;
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <article className="rounded-xl border border-border bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-accent"><span className="text-sm font-semibold text-muted">{label}</span><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4e7eb]">{icon}</span></div><p className="mt-4 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></article>;
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5"><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p><div className="mt-5">{children}</div></section>;
}

function GeoBars({ title, rows, total, onSelect }: { title: string; rows: GeographyRow[]; total: number; onSelect: (row: GeographyRow) => void }) {
  const maximum = Math.max(...rows.map((row) => row.count), 1);
  return <div className="mt-5 first:mt-0"><h3 className="text-sm font-bold text-muted">{title}</h3><div className="mt-3 space-y-3">{rows.map((row) => <button type="button" key={row.id} onClick={() => onSelect(row)} className="group block w-full text-left"><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold group-hover:text-accent">{row.name}</span><span className="shrink-0 text-muted">{row.count.toLocaleString()} · {total ? Math.round((row.count / total) * 100) : 0}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(row.count / maximum) * 100}%` }} /></div></button>)}{!rows.length && <p className="text-sm text-muted">No location data is available.</p>}</div></div>;
}

function QualityRow({ label, value }: { label: string; value: number }) {
  return <div className="mt-4 first:mt-0"><div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{label}</span><span className="font-bold text-accent">{value}%</span></div><div className="mt-2 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} /></div></div>;
}

function TrendChart({ values, days }: { values: Array<{ date: string; count: number }>; days: number }) {
  const points = useMemo(() => {
    const byDate = new Map(values.map((item) => [item.date, item.count]));
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (days - 1 - index));
      const key = date.toISOString().slice(0, 10);
      return { date: key, count: byDate.get(key) ?? 0 };
    });
  }, [days, values]);
  const maximum = Math.max(...points.map((point) => point.count), 1);
  const polyline = points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 100},${100 - (point.count / maximum) * 84 - 8}`).join(' ');
  const total = points.reduce((sum, point) => sum + point.count, 0);
  return <div><div className="flex items-end justify-between"><div><p className="text-3xl font-bold">{total.toLocaleString()}</p><p className="text-xs text-muted">registrations in selected range</p></div><span className="text-xs text-muted">{points[0]?.date} to {points[points.length - 1]?.date}</span></div><div className="mt-5 overflow-hidden rounded-lg bg-[#fbf3e8] p-2"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full" role="img" aria-label={`Daily registrations over the last ${days} days`}><polyline fill="none" stroke="#7f1d3a" strokeWidth="2" vectorEffect="non-scaling-stroke" points={polyline} /></svg></div><div className="mt-2 flex justify-between text-xs text-muted"><span>{points[0]?.date}</span><span>Today</span></div></div>;
}

function DashboardSkeleton() {
  return <section aria-label="Loading overview" className="animate-pulse"><div className="h-9 w-72 rounded bg-gray-200" /><div className="mt-3 h-5 w-full max-w-xl rounded bg-gray-100" /><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-xl bg-gray-100" />)}</div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="h-96 rounded-xl bg-gray-100" /><div className="h-96 rounded-xl bg-gray-100" /></div></section>;
}

export type { DashboardFilters };
