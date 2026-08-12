'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { expectedPhoneHint, normalizeAndCheckMobile } from '@/lib/phone';
import { devoteeFormSchema } from '@/lib/validators';
import { LookupCombobox } from '@/components/shared/LookupCombobox';
import type { DevoteeListItem, LookupOption } from '@/types';

type FormValues = {
  fullName: string;
  mobile: string;
  address: string;
  countryId: string;
  stateId: string;
  cityId: string;
  postalCode: string;
  email: string;
};

type Props = {
  countries: LookupOption[];
  defaultCountryId?: number;
  devotee?: DevoteeListItem;
  onSaved: () => void;
  onCancel?: () => void;
};

const blank = (countryId?: number): FormValues => ({
  fullName: '', mobile: '', address: '', countryId: countryId ? String(countryId) : '',
  stateId: '', cityId: '', postalCode: '', email: '',
});

export function DevoteeForm({ countries, defaultCountryId, devotee, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>(() => devotee ? {
    fullName: devotee.fullName,
    mobile: devotee.mobile,
    address: devotee.address,
    countryId: String(devotee.countryId),
    stateId: String(devotee.stateId),
    cityId: String(devotee.cityId),
    postalCode: devotee.postalCode ?? '',
    email: devotee.email ?? '',
  } : blank(defaultCountryId));
  const [states, setStates] = useState<LookupOption[]>([]);
  const [cities, setCities] = useState<LookupOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const firstErrorRef = useRef<HTMLDivElement>(null);
  const selectedCountry = useMemo(
    () => countries.find((country) => String(country.id) === values.countryId),
    [countries, values.countryId],
  );
  const isIndia = selectedCountry?.iso2?.toUpperCase() === 'IN';
  const countryIso2 = selectedCountry?.iso2?.toUpperCase() ?? '';

  useEffect(() => {
    if (!values.countryId) {
      setStates([]);
      return;
    }
    const controller = new AbortController();
    setLoadingStates(true);
    setServerError('');
    void fetch(`/api/lookup/states?countryId=${values.countryId}`, {
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
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setStates([]);
          setServerError('Could not load states. Check internet and try again.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStates(false);
      });
    return () => controller.abort();
  }, [values.countryId]);

  useEffect(() => {
    if (!values.stateId) {
      setCities([]);
      return;
    }
    const controller = new AbortController();
    setLoadingCities(true);
    setServerError('');
    void fetch(`/api/lookup/cities?stateId=${values.stateId}`, {
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
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setCities([]);
          setServerError('Could not load cities. Check internet and try again.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCities(false);
      });
    return () => controller.abort();
  }, [values.stateId]);

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setSuccess('');
    setDuplicateWarning('');
  }

  async function checkDuplicate() {
    if (!countryIso2) return;
    const check = normalizeAndCheckMobile(values.mobile, countryIso2);
    if (!check.ok || check.normalized.length < 7) return;
    try {
      const response = await fetch('/api/devotees/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: check.normalized, countryId: Number(values.countryId), ...(devotee ? { excludeId: devotee.id } : {}) }),
      });
      const result = await response.json();
      setDuplicateWarning(result.isDuplicate ? `This mobile is already saved for ${result.existingRecord.fullName}.` : '');
    } catch {
      // Submit still performs the authoritative duplicate check.
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setServerError('');
    setSuccess('');
    const parsed = devoteeFormSchema.safeParse(values);
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      parsed.error.errors.forEach((error) => { const field = String(error.path[0]); if (!nextErrors[field]) nextErrors[field] = error.message; });
    }
    if (isIndia && !/^\d{6}$/.test(values.postalCode.replace(/\D/g, ''))) {
      nextErrors.postalCode = 'Enter a 6-digit PIN code.';
    }
    if (countryIso2) {
      const phoneCheck = normalizeAndCheckMobile(values.mobile, countryIso2);
      if (!phoneCheck.ok) {
        nextErrors.mobile = phoneCheck.error || 'Enter a valid mobile for this country.';
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      window.setTimeout(() => {
        firstErrorRef.current?.focus();
        firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(devotee ? `/api/devotees/${devotee.id}` : '/api/devotees', {
        method: devotee ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.success ? parsed.data : values),
      });
      const result = await response.json();
      if (!response.ok) {
        setServerError(result.error || 'Could not save. Check internet and try again.');
        return;
      }
      if (devotee) {
        onSaved();
      } else {
        setValues((current) => ({ ...blank(Number(current.countryId)), stateId: current.stateId }));
        setSuccess('Saved. You can add another person.');
        onSaved();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setServerError('Could not save. Check internet and try again.');
    } finally {
      setSaving(false);
    }
  }

  const firstError = Object.keys(errors).find((field) => errors[field]);
  const fieldClass = (field: keyof FormValues) => `mt-2 min-h-12 w-full rounded-lg border bg-white px-3.5 text-base outline-none transition focus:ring-4 ${errors[field] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-border focus:border-accent focus:ring-amber-100'}`;
  const fieldId = (field: keyof FormValues) => `devotee-${field}`;
  const errorId = (field: keyof FormValues) => `${fieldId(field)}-error`;
  const errorFor = (field: keyof FormValues) => errors[field] ? <p id={errorId(field)} className="mt-1.5 text-sm text-red-700">{errors[field]}</p> : null;

  return (
    <form onSubmit={submit} noValidate>
      {firstError && <div ref={firstErrorRef} tabIndex={-1} role="alert" aria-labelledby="devotee-error-title" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 focus:outline-none focus:ring-4 focus:ring-red-100">
        <p id="devotee-error-title" className="font-semibold">Please correct the highlighted fields.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {Object.entries(errors).filter(([, message]) => message).map(([field, message]) => <li key={field}><a className="underline underline-offset-2" href={`#${fieldId(field as keyof FormValues)}`}>{message}</a></li>)}
        </ul>
      </div>}
      {success && <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800"><CheckCircle2 className="mt-0.5 shrink-0" size={19} /><span>{success}</span></div>}
      {serverError && <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p>}

      <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
        <label className="block font-semibold">Full name <span className="text-red-600">*</span>
          <input id={fieldId('fullName')} value={values.fullName} onChange={(event) => update('fullName', event.target.value)} autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? errorId('fullName') : undefined} required className={fieldClass('fullName')} />
          {errorFor('fullName')}
        </label>
        <label className="block font-semibold">Mobile number <span className="text-red-600">*</span>
          <input id={fieldId('mobile')} value={values.mobile} onChange={(event) => update('mobile', event.target.value)} onBlur={() => void checkDuplicate()} inputMode="tel" autoComplete="tel" aria-invalid={Boolean(errors.mobile)} aria-describedby={`devotee-mobile-hint${errors.mobile ? ` ${errorId('mobile')}` : ''}`} required className={fieldClass('mobile')} />
          <span id="devotee-mobile-hint" className="mt-1.5 block text-sm font-normal text-muted">
            {countryIso2 ? expectedPhoneHint(countryIso2) : 'Select a country, then enter the mobile number.'}
          </span>
          {errorFor('mobile')}
          {duplicateWarning && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-normal text-amber-800">{duplicateWarning}</p>}
        </label>
        <label className="block font-semibold md:col-span-2">Address <span className="text-red-600">*</span>
          <textarea id={fieldId('address')} value={values.address} onChange={(event) => update('address', event.target.value)} rows={3} autoComplete="street-address" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? errorId('address') : undefined} required className={`${fieldClass('address')} py-3`} />
          {errorFor('address')}
        </label>
        <label className="block font-semibold">Country <span className="text-red-600">*</span>
           <select id={fieldId('countryId')} value={values.countryId} onChange={(event) => {
            const next = event.target.value;
            setValues((current) => ({ ...current, countryId: next, stateId: '', cityId: '', postalCode: countries.find((item) => String(item.id) === next)?.iso2 === 'IN' ? current.postalCode : '' }));
            setStates([]); setCities([]); setErrors({}); setSuccess('');
           }} aria-invalid={Boolean(errors.countryId)} aria-describedby={errors.countryId ? errorId('countryId') : undefined} required className={fieldClass('countryId')}>
            <option value="">Choose country</option>
            {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
          </select>
          {errorFor('countryId')}
        </label>
        <LookupCombobox
          label="State"
          required
          value={values.stateId}
          options={states}
          selectedLabel={devotee?.stateName}
          inputId={fieldId('stateId')}
          errorId={errors.stateId ? errorId('stateId') : undefined}
          disabled={!values.countryId}
          loading={loadingStates}
          placeholder={values.countryId ? 'Type state name' : 'Select country first'}
          onChange={(next) => {
            setValues((current) => ({ ...current, stateId: next, cityId: '' }));
            setCities([]);
            setErrors((current) => ({ ...current, stateId: '', cityId: '' }));
          }}
          error={errors.stateId}
        />
        <LookupCombobox
          label="City"
          required
          value={values.cityId}
          options={cities}
          selectedLabel={devotee?.cityName}
          inputId={fieldId('cityId')}
          errorId={errors.cityId ? errorId('cityId') : undefined}
          disabled={!values.stateId}
          loading={loadingCities}
          placeholder={values.stateId ? 'Type city name' : 'Select state first'}
          onChange={(next) => update('cityId', next)}
          error={errors.cityId}
        />
        {isIndia && <label className="block font-semibold">PIN code <span className="text-red-600">*</span>
           <input id={fieldId('postalCode')} value={values.postalCode} onChange={(event) => update('postalCode', event.target.value)} inputMode="numeric" autoComplete="postal-code" maxLength={6} aria-invalid={Boolean(errors.postalCode)} aria-describedby={errors.postalCode ? errorId('postalCode') : undefined} required className={fieldClass('postalCode')} />
          {errorFor('postalCode')}
        </label>}
        <label className="block font-semibold md:col-span-2">Email <span className="font-normal text-muted">(optional)</span>
           <input id={fieldId('email')} value={values.email} onChange={(event) => update('email', event.target.value)} type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? errorId('email') : undefined} className={fieldClass('email')} />
          {errorFor('email')}
        </label>
      </div>

      <div className="sticky bottom-0 z-10 -mx-5 mt-7 flex gap-3 border-t border-border bg-white/95 px-5 py-4 backdrop-blur md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:px-0 md:pb-0">
        {onCancel && <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-lg border border-border px-5 font-semibold transition hover:bg-gray-50 md:flex-none">Cancel</button>}
        <button disabled={saving || Boolean(duplicateWarning)} className="h-12 flex-1 rounded-lg bg-accent px-6 font-semibold text-white shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-55 md:flex-none">
          {saving ? 'Saving…' : devotee ? 'Save changes' : 'Save person'}
        </button>
      </div>
    </form>
  );
}
