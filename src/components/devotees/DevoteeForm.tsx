'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { expectedPhoneHint, normalizeAndCheckMobile } from '@/lib/phone';
import { devoteeFormSchema } from '@/lib/validators';
import { LOOKUP_OTHER_ID, LookupCombobox } from '@/components/shared/LookupCombobox';
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

const OTHER = String(LOOKUP_OTHER_ID);

const blank = (countryId?: number): FormValues => ({
  fullName: '', mobile: '', address: '', countryId: countryId ? String(countryId) : '',
  stateId: '', cityId: '', postalCode: '', email: '',
});

type CreateLookupResponse = {
  id?: number;
  name?: string;
  iso2?: string;
  error?: string;
  existingId?: number;
};

export function DevoteeForm({ countries: initialCountries, defaultCountryId, devotee, onSaved, onCancel }: Props) {
  const [countryOptions, setCountryOptions] = useState<LookupOption[]>(initialCountries);
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
  const [customCountry, setCustomCountry] = useState('');
  const [customState, setCustomState] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [addingCountry, setAddingCountry] = useState(false);
  const [addingState, setAddingState] = useState(false);
  const [addingCity, setAddingCity] = useState(false);
  const firstErrorRef = useRef<HTMLDivElement>(null);
  const selectedCountry = useMemo(
    () => countryOptions.find((country) => String(country.id) === values.countryId),
    [countryOptions, values.countryId],
  );
  const isIndia = selectedCountry?.iso2?.toUpperCase() === 'IN';
  const countryIso2 = selectedCountry?.iso2?.toUpperCase() ?? '';
  const countryIsOther = values.countryId === OTHER;
  const stateIsOther = values.stateId === OTHER;
  const cityIsOther = values.cityId === OTHER;

  // Keep country list fresh after adds (and after remount on tab switch).
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
        if (!controller.signal.aborted && Array.isArray(rows) && rows.length) {
          setCountryOptions(rows);
        }
      })
      .catch(() => {
        // Keep the server-rendered list if refresh fails.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!values.countryId || values.countryId === OTHER) {
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
    if (!values.stateId || values.stateId === OTHER) {
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

  async function createLookup(
    kind: 'country' | 'state' | 'city',
    body: Record<string, string | number>,
  ): Promise<CreateLookupResponse & { ok: boolean; status: number }> {
    const path =
      kind === 'country' ? '/api/lookup/countries'
        : kind === 'state' ? '/api/lookup/states'
          : '/api/lookup/cities';
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as CreateLookupResponse;
    return { ...result, ok: response.ok, status: response.status };
  }

  async function addCustomCountry() {
    setErrors((current) => ({ ...current, countryId: '', customCountry: '' }));
    setServerError('');
    const name = customCountry.trim();
    if (name.length < 2) {
      setErrors((current) => ({ ...current, customCountry: 'Enter a country name (at least 2 characters).' }));
      return;
    }
    setAddingCountry(true);
    try {
      const result = await createLookup('country', { name });
      if (!result.ok || !result.id || !result.name) {
        if (result.status === 409 && result.existingId) {
          const existing = countryOptions.find((item) => item.id === result.existingId);
          setValues((current) => ({
            ...current,
            countryId: String(result.existingId),
            stateId: '',
            cityId: '',
          }));
          setCustomCountry('');
          setErrors((current) => ({
            ...current,
            customCountry: result.error || 'This country already exists. It has been selected for you.',
          }));
          if (!existing && result.name) {
            setCountryOptions((current) =>
              current.some((item) => item.id === result.existingId)
                ? current
                : [...current, { id: result.existingId!, name: result.name!, iso2: result.iso2 }].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  ),
            );
          }
          return;
        }
        setErrors((current) => ({ ...current, customCountry: result.error || 'Could not add country.' }));
        return;
      }
      const option: LookupOption = { id: result.id, name: result.name, iso2: result.iso2 };
      setCountryOptions((current) =>
        current.some((item) => item.id === option.id)
          ? current
          : [...current, option].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setValues((current) => ({
        ...current,
        countryId: String(result.id),
        stateId: '',
        cityId: '',
        postalCode: result.iso2?.toUpperCase() === 'IN' ? current.postalCode : '',
      }));
      setCustomCountry('');
      setStates([]);
      setCities([]);
      setSuccess(`Added country “${result.name}”. You can now pick or add a state.`);
    } catch {
      setErrors((current) => ({ ...current, customCountry: 'Could not add country. Check internet and try again.' }));
    } finally {
      setAddingCountry(false);
    }
  }

  async function addCustomState() {
    setErrors((current) => ({ ...current, stateId: '', customState: '' }));
    setServerError('');
    if (!values.countryId || values.countryId === OTHER) {
      setErrors((current) => ({ ...current, customState: 'Select a country first.' }));
      return;
    }
    const name = customState.trim();
    if (name.length < 2) {
      setErrors((current) => ({ ...current, customState: 'Enter a state name (at least 2 characters).' }));
      return;
    }
    setAddingState(true);
    try {
      const result = await createLookup('state', { countryId: Number(values.countryId), name });
      if (!result.ok || !result.id || !result.name) {
        if (result.status === 409 && result.existingId) {
          setValues((current) => ({ ...current, stateId: String(result.existingId), cityId: '' }));
          setCustomState('');
          setCities([]);
          setErrors((current) => ({
            ...current,
            customState: result.error || 'This state already exists. It has been selected for you.',
          }));
          setStates((current) =>
            current.some((item) => item.id === result.existingId)
              ? current
              : [...current, { id: result.existingId!, name: result.name || name }].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
          );
          return;
        }
        setErrors((current) => ({ ...current, customState: result.error || 'Could not add state.' }));
        return;
      }
      const option: LookupOption = { id: result.id, name: result.name };
      setStates((current) =>
        current.some((item) => item.id === option.id)
          ? current
          : [...current, option].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setValues((current) => ({ ...current, stateId: String(result.id), cityId: '' }));
      setCustomState('');
      setCities([]);
      setSuccess(`Added state “${result.name}”. You can now pick or add a city.`);
    } catch {
      setErrors((current) => ({ ...current, customState: 'Could not add state. Check internet and try again.' }));
    } finally {
      setAddingState(false);
    }
  }

  async function addCustomCity() {
    setErrors((current) => ({ ...current, cityId: '', customCity: '' }));
    setServerError('');
    if (!values.stateId || values.stateId === OTHER) {
      setErrors((current) => ({ ...current, customCity: 'Select a state first.' }));
      return;
    }
    const name = customCity.trim();
    if (name.length < 2) {
      setErrors((current) => ({ ...current, customCity: 'Enter a city name (at least 2 characters).' }));
      return;
    }
    setAddingCity(true);
    try {
      const result = await createLookup('city', { stateId: Number(values.stateId), name });
      if (!result.ok || !result.id || !result.name) {
        if (result.status === 409 && result.existingId) {
          setValues((current) => ({ ...current, cityId: String(result.existingId) }));
          setCustomCity('');
          setErrors((current) => ({
            ...current,
            customCity: result.error || 'This city already exists. It has been selected for you.',
          }));
          setCities((current) =>
            current.some((item) => item.id === result.existingId)
              ? current
              : [...current, { id: result.existingId!, name: result.name || name }].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
          );
          return;
        }
        setErrors((current) => ({ ...current, customCity: result.error || 'Could not add city.' }));
        return;
      }
      const option: LookupOption = { id: result.id, name: result.name };
      setCities((current) =>
        current.some((item) => item.id === option.id)
          ? current
          : [...current, option].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setValues((current) => ({ ...current, cityId: String(result.id) }));
      setCustomCity('');
      setSuccess(`Added city “${result.name}”.`);
    } catch {
      setErrors((current) => ({ ...current, customCity: 'Could not add city. Check internet and try again.' }));
    } finally {
      setAddingCity(false);
    }
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
    const nextErrors: Record<string, string> = {};

    if (countryIsOther) {
      nextErrors.countryId = 'Add the new country with the Add button, or pick an existing one.';
    }
    if (stateIsOther) {
      nextErrors.stateId = 'Add the new state with the Add button, or pick an existing one.';
    }
    if (cityIsOther) {
      nextErrors.cityId = 'Add the new city with the Add button, or pick an existing one.';
    }

    const parsed = devoteeFormSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.errors.forEach((error) => {
        const field = String(error.path[0]);
        if (!nextErrors[field]) nextErrors[field] = error.message;
      });
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
        setCustomCountry('');
        setCustomState('');
        setCustomCity('');
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
  const fieldClass = (field: keyof FormValues | 'customCountry' | 'customState' | 'customCity') =>
    `mt-2 min-h-12 w-full rounded-lg border bg-white px-3.5 text-base outline-none transition focus:ring-4 ${
      errors[field] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-border focus:border-accent focus:ring-amber-100'
    }`;
  const errorFor = (field: string) => errors[field] ? <p className="mt-1.5 text-sm text-red-700">{errors[field]}</p> : null;

  const otherInputClass = (field: 'customCountry' | 'customState' | 'customCity') =>
    `min-h-12 flex-1 rounded-lg border bg-white px-3.5 text-base outline-none transition focus:ring-4 ${
      errors[field] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-border focus:border-accent focus:ring-amber-100'
    }`;

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
        <div className="block font-semibold">
          <label className="block">
            Country <span className="text-red-600">*</span>
            <select
              value={values.countryId}
              onChange={(event) => {
                const next = event.target.value;
                setValues((current) => ({
                  ...current,
                  countryId: next,
                  stateId: '',
                  cityId: '',
                  postalCode:
                    next !== OTHER && countryOptions.find((item) => String(item.id) === next)?.iso2 === 'IN'
                      ? current.postalCode
                      : '',
                }));
                setStates([]);
                setCities([]);
                setCustomCountry('');
                setCustomState('');
                setCustomCity('');
                setErrors({});
                setSuccess('');
              }}
              className={fieldClass('countryId')}
            >
              <option value="">Choose country</option>
              {countryOptions.map((country) => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
              <option value={OTHER}>Others</option>
            </select>
          </label>
          {errorFor('countryId')}
          {countryIsOther ? (
            <div className="mt-3">
              <span className="block text-sm font-semibold text-foreground">New country name</span>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={customCountry}
                  onChange={(event) => {
                    setCustomCountry(event.target.value);
                    setErrors((current) => ({ ...current, customCountry: '', countryId: '' }));
                    setSuccess('');
                  }}
                  placeholder="e.g. Singapore"
                  autoComplete="off"
                  className={otherInputClass('customCountry')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void addCustomCountry();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={addingCountry}
                  onClick={() => void addCustomCountry()}
                  className="h-12 shrink-0 rounded-lg bg-accent px-4 font-semibold text-white shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {addingCountry ? 'Adding…' : 'Add country'}
                </button>
              </div>
              <span className="mt-1.5 block text-sm font-normal text-muted">
                This saves the country so it appears in the list next time.
              </span>
              {errorFor('customCountry')}
            </div>
          ) : null}
        </div>
        <div>
          <LookupCombobox
            label="State"
            required
            value={values.stateId}
            options={states}
            selectedLabel={devotee?.stateName}
            disabled={!values.countryId || countryIsOther}
            loading={loadingStates}
            placeholder={
              countryIsOther
                ? 'Add the country first'
                : values.countryId
                  ? 'Type state name'
                  : 'Select country first'
            }
            allowOther={Boolean(values.countryId) && !countryIsOther}
            onChange={(next) => {
              setValues((current) => ({ ...current, stateId: next, cityId: '' }));
              setCities([]);
              setCustomState('');
              setCustomCity('');
              setErrors((current) => ({ ...current, stateId: '', cityId: '', customState: '', customCity: '' }));
              setSuccess('');
            }}
            error={errors.stateId}
          />
          {stateIsOther ? (
            <div className="mt-3">
              <span className="block text-sm font-semibold text-foreground">New state name</span>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={customState}
                  onChange={(event) => {
                    setCustomState(event.target.value);
                    setErrors((current) => ({ ...current, customState: '', stateId: '' }));
                    setSuccess('');
                  }}
                  placeholder="e.g. California"
                  autoComplete="off"
                  className={otherInputClass('customState')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void addCustomState();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={addingState}
                  onClick={() => void addCustomState()}
                  className="h-12 shrink-0 rounded-lg bg-accent px-4 font-semibold text-white shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {addingState ? 'Adding…' : 'Add state'}
                </button>
              </div>
              <span className="mt-1.5 block text-sm font-normal text-muted">
                Saved under the selected country. It will appear in the state list next time.
              </span>
              {errorFor('customState')}
            </div>
          ) : null}
        </div>
        <div>
          <LookupCombobox
            label="City"
            required
            value={values.cityId}
            options={cities}
            selectedLabel={devotee?.cityName}
            disabled={!values.stateId || stateIsOther}
            loading={loadingCities}
            placeholder={
              stateIsOther
                ? 'Add the state first'
                : values.stateId
                  ? 'Type city name'
                  : 'Select state first'
            }
            allowOther={Boolean(values.stateId) && !stateIsOther}
            onChange={(next) => {
              update('cityId', next);
              setCustomCity('');
              setErrors((current) => ({ ...current, customCity: '' }));
            }}
            error={errors.cityId}
          />
          {cityIsOther ? (
            <div className="mt-3">
              <span className="block text-sm font-semibold text-foreground">New city name</span>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={customCity}
                  onChange={(event) => {
                    setCustomCity(event.target.value);
                    setErrors((current) => ({ ...current, customCity: '', cityId: '' }));
                    setSuccess('');
                  }}
                  placeholder="e.g. Fremont"
                  autoComplete="off"
                  className={otherInputClass('customCity')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void addCustomCity();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={addingCity}
                  onClick={() => void addCustomCity()}
                  className="h-12 shrink-0 rounded-lg bg-accent px-4 font-semibold text-white shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {addingCity ? 'Adding…' : 'Add city'}
                </button>
              </div>
              <span className="mt-1.5 block text-sm font-normal text-muted">
                Saved under the selected state. It will appear in the city list next time.
              </span>
              {errorFor('customCity')}
            </div>
          ) : null}
        </div>
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
