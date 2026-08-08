'use client';

import { useEffect, useState } from 'react';
import { FuzzyCombobox, type LookupOption } from './FuzzyCombobox';

export interface LocationValue {
  countryId: number | null;
  stateId: number | null;
  districtId: number | null;
  cityId: number | null;
}

interface Props {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  required?: { country?: boolean; state?: boolean };
}

function useOptions(url: string | null) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) { setOptions([]); return; }
    setLoading(true);
    setError(false);
    fetch(url)
      .then((r) => r.json())
      .then((data: LookupOption[]) => setOptions(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [url]);

  return { options, loading, error };
}

export function LocationCascade({ value, onChange, disabled = false, required }: Props) {
  const countries = useOptions('/api/lookup/countries');
  const states = useOptions(value.countryId ? `/api/lookup/states?countryId=${value.countryId}` : null);
  const dists = useOptions(value.stateId ? `/api/lookup/districts?stateId=${value.stateId}` : null);
  const cities = useOptions(value.districtId ? `/api/lookup/cities?districtId=${value.districtId}` : value.stateId ? `/api/lookup/cities?stateId=${value.stateId}` : null);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Country{required?.country && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <FuzzyCombobox
          options={countries.options}
          value={value.countryId}
          onChange={(id) => onChange({ countryId: id, stateId: null, districtId: null, cityId: null })}
          placeholder="Select country"
          disabled={disabled || countries.loading}
        />
        {countries.error && <p className="mt-1 text-xs text-red-600">Failed to load countries.</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          State{required?.state && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <FuzzyCombobox
          options={states.options}
          value={value.stateId}
          onChange={(id) => onChange({ ...value, stateId: id, districtId: null, cityId: null })}
          placeholder="Select state"
          disabled={disabled || !value.countryId || states.loading}
        />
        {states.error && <p className="mt-1 text-xs text-red-600">Failed to load states.</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">District</label>
        <FuzzyCombobox
          options={dists.options}
          value={value.districtId}
          onChange={(id) => onChange({ ...value, districtId: id, cityId: null })}
          placeholder="Select district"
          disabled={disabled || !value.stateId || dists.loading}
        />
        {dists.error && <p className="mt-1 text-xs text-red-600">Failed to load districts.</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">City</label>
        <FuzzyCombobox
          options={cities.options}
          value={value.cityId}
          onChange={(id) => onChange({ ...value, cityId: id })}
          placeholder="Select city"
          disabled={disabled || !value.stateId || cities.loading}
        />
        {cities.error && <p className="mt-1 text-xs text-red-600">Failed to load cities.</p>}
      </div>
    </div>
  );
}
