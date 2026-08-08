'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FuzzyCombobox, type LookupOption } from '@/components/shared/FuzzyCombobox';
import { LocationCascade, type LocationValue } from '@/components/shared/LocationCascade';
import { devoteeFormSchema, type DevoteeFormInput } from '@/lib/validators/index';
import { formatPhone } from '@/lib/utils';
import type { DuplicateCheckResult } from '@/types';

const DRAFT_KEY = 'devotee-form-draft';
const STEPS = ['Personal Info', 'Address', 'Review & Confirm'];

interface Props {
  devoteeId?: number;
  onSuccess?: (id: number) => void;
  onCancel?: () => void;
}

export function DevoteeForm({ devoteeId, onSuccess, onCancel }: Props) {
  const isEdit = !!devoteeId;
  const [step, setStep] = useState(0);
  const [groups, setGroups] = useState<LookupOption[]>([]);
  const [dupeResult, setDupeResult] = useState<DuplicateCheckResult | null>(null);
  const [dupeLoading, setDupeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const dupeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = useForm<DevoteeFormInput>({
    resolver: zodResolver(devoteeFormSchema),
    defaultValues: {
      fullName: '',
      primaryPhone: '',
      secondaryPhones: [],
      primaryCountryCode: '+91',
      sourceGroupId: undefined,
      addressLine1: null,
      addressLine2: null,
      addressLine3: null,
      countryId: null,
      stateId: null,
      districtId: null,
      cityId: null,
      postalCode: null,
      notes: null,
    },
  });

  const { fields: secondaryFields, append, remove } = useFieldArray({
    control: undefined as never,
    name: 'secondaryPhones' as never,
  });

  const watchedValues = watch();
  const primaryPhone = watch('primaryPhone');
  const locationValue: LocationValue = {
    countryId: watch('countryId') ?? null,
    stateId: watch('stateId') ?? null,
    districtId: watch('districtId') ?? null,
    cityId: watch('cityId') ?? null,
  };

  // Load source groups
  useEffect(() => {
    fetch('/api/lookup/source-groups')
      .then((r) => r.json())
      .then((data: LookupOption[]) => setGroups(data))
      .catch(() => {});
  }, []);

  // Load existing record in edit mode
  useEffect(() => {
    if (!devoteeId) return;
    fetch(`/api/devotees/${devoteeId}`)
      .then((r) => r.json())
      .then((data) => {
        reset({
          fullName: data.fullName ?? '',
          primaryPhone: data.phones?.find((p: { isPrimary: boolean; phoneNumber: string }) => p.isPrimary)?.phoneNumber ?? '',
          secondaryPhones: data.phones?.filter((p: { isPrimary: boolean; phoneNumber: string }) => !p.isPrimary).map((p: { phoneNumber: string }) => p.phoneNumber) ?? [],
          primaryCountryCode: '+91',
          sourceGroupId: data.sourceGroupId,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          addressLine3: data.addressLine3,
          countryId: data.countryId,
          stateId: data.stateId,
          districtId: data.districtId,
          cityId: data.cityId,
          postalCode: data.postalCode,
          notes: data.notes,
        });
      })
      .catch(() => toast.error('Could not load record.'));
  }, [devoteeId, reset]);

  // Draft restore on mount (add mode only)
  useEffect(() => {
    if (isEdit) return;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setShowDraftBanner(true);
  }, [isEdit]);

  // Auto-save draft every 30s
  useEffect(() => {
    if (isEdit) return;
    draftTimer.current = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
    }, 30_000);
    return () => { if (draftTimer.current) clearInterval(draftTimer.current); };
  }, [isEdit, getValues]);

  // Duplicate check on primary phone
  useEffect(() => {
    if (!primaryPhone || primaryPhone.length < 7) { setDupeResult(null); return; }
    if (dupeTimer.current) clearTimeout(dupeTimer.current);
    dupeTimer.current = setTimeout(async () => {
      setDupeLoading(true);
      try {
        const res = await fetch('/api/devotees/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: primaryPhone.replace(/\D/g, ''), excludeId: devoteeId }),
        });
        const data: DuplicateCheckResult = await res.json();
        setDupeResult(data.isDuplicate ? data : null);
      } catch {
        setDupeResult(null);
      } finally {
        setDupeLoading(false);
      }
    }, 500);
    return () => { if (dupeTimer.current) clearTimeout(dupeTimer.current); };
  }, [primaryPhone, devoteeId]);

  function restoreDraft() {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) { reset(JSON.parse(draft) as DevoteeFormInput); }
    setShowDraftBanner(false);
  }

  async function onSubmit(data: DevoteeFormInput) {
    setSubmitting(true);
    try {
      const body = {
        ...data,
        primaryPhone: data.primaryPhone.replace(/\D/g, ''),
        secondaryPhones: (data.secondaryPhones ?? []).map((p) => p.replace(/\D/g, '')),
        fullName: data.fullName.trim().replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()),
      };

      const url = isEdit ? `/api/devotees/${devoteeId}` : '/api/devotees';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Something went wrong. Please try again.');
        return;
      }

      const result = await res.json();
      toast.success(isEdit ? 'Changes saved successfully.' : `Record saved! ID: ${result.id}`);
      localStorage.removeItem(DRAFT_KEY);
      if (!isEdit) { reset(); setStep(0); }
      onSuccess?.(isEdit ? devoteeId! : result.id);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (isDirty) {
      if (!window.confirm('Discard unsaved changes?')) return;
    }
    onCancel?.();
  }

  const stepContent = [
    // ── Step 1: Personal Info ──────────────────────────────────────
    <div key="step1" className="space-y-5">
      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          {...register('fullName')}
          onBlur={(e) => {
            const titled = e.target.value.trim().replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
            setValue('fullName', titled);
          }}
          className={`h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent ${errors.fullName ? 'border-red-400' : 'border-border'}`}
          placeholder="e.g. Venkata Rao Kotha"
          aria-describedby={errors.fullName ? 'fullName-error' : undefined}
        />
        {errors.fullName && <p id="fullName-error" className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
      </div>

      <div>
        <label htmlFor="primaryPhone" className="mb-1.5 block text-sm font-medium">
          Primary Mobile <span className="text-red-500">*</span>
        </label>
        <input
          id="primaryPhone"
          {...register('primaryPhone')}
          inputMode="numeric"
          className={`h-10 w-full rounded-md border px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent ${errors.primaryPhone ? 'border-red-400' : 'border-border'}`}
          placeholder="10-digit mobile number"
          aria-describedby={errors.primaryPhone ? 'primaryPhone-error' : undefined}
        />
        {errors.primaryPhone && <p id="primaryPhone-error" className="mt-1 text-xs text-red-600">{errors.primaryPhone.message}</p>}
        {dupeLoading && <p className="mt-1 text-xs text-muted">Checking for duplicates…</p>}
        {dupeResult && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Possible duplicate</p>
              <p className="mt-0.5 text-xs">{dupeResult.warnings[0]}</p>
              {dupeResult.existingRecord && (
                <a href={`/admin/devotees/${dupeResult.existingRecord.id}`} className="mt-1 block text-xs font-medium underline">
                  View existing record →
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Secondary Mobiles</label>
        {(watch('secondaryPhones') ?? []).map((_, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input
              {...register(`secondaryPhones.${i}`)}
              inputMode="numeric"
              className="h-10 flex-1 rounded-md border border-border px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Secondary number"
            />
            <button
              type="button"
              onClick={() => {
                const phones = getValues('secondaryPhones') ?? [];
                setValue('secondaryPhones', phones.filter((_, idx) => idx !== i));
              }}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted hover:bg-red-50 hover:text-red-600"
              aria-label="Remove phone"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {(watch('secondaryPhones') ?? []).length < 5 && (
          <button
            type="button"
            onClick={() => setValue('secondaryPhones', [...(getValues('secondaryPhones') ?? []), ''])}
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <Plus size={14} /> Add another number
          </button>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Chapter / Group <span className="text-red-500">*</span>
        </label>
        <FuzzyCombobox
          options={groups}
          value={watch('sourceGroupId') ?? null}
          onChange={(v) => setValue('sourceGroupId', v ?? undefined, { shouldValidate: true })}
          placeholder="Select chapter"
          aria-describedby={errors.sourceGroupId ? 'sourceGroupId-error' : undefined}
        />
        {errors.sourceGroupId && <p id="sourceGroupId-error" className="mt-1 text-xs text-red-600">{errors.sourceGroupId.message}</p>}
      </div>
    </div>,

    // ── Step 2: Address ────────────────────────────────────────────
    <div key="step2" className="space-y-5">
      {(['addressLine1', 'addressLine2', 'addressLine3'] as const).map((field, i) => (
        <div key={field}>
          <label htmlFor={field} className="mb-1.5 block text-sm font-medium">
            {['Address Line 1', 'Address Line 2', 'Address Line 3'][i]}
            {i === 0 && <span className="ml-1 text-xs text-muted">(Building / Door No.)</span>}
            {i === 1 && <span className="ml-1 text-xs text-muted">(Society / Layout)</span>}
            {i === 2 && <span className="ml-1 text-xs text-muted">(Area / Colony)</span>}
          </label>
          <input
            id={field}
            {...register(field)}
            className="h-10 w-full rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      ))}

      <LocationCascade
        value={locationValue}
        onChange={(v) => {
          setValue('countryId', v.countryId);
          setValue('stateId', v.stateId);
          setValue('districtId', v.districtId);
          setValue('cityId', v.cityId);
        }}
        required={{ country: false, state: false }}
      />

      <div>
        <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium">PIN / ZIP Code</label>
        <input
          id="postalCode"
          {...register('postalCode')}
          inputMode="numeric"
          className="h-10 w-full rounded-md border border-border px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="e.g. 560001"
        />
      </div>
    </div>,

    // ── Step 3: Review & Confirm ───────────────────────────────────
    <div key="step3" className="space-y-4">
      <div className="rounded-lg border border-border bg-gray-50 p-4 text-sm">
        <ReviewRow label="Full Name" value={watchedValues.fullName} />
        <ReviewRow label="Primary Mobile" value={watchedValues.primaryPhone ? formatPhone(watchedValues.primaryPhone) : ''} mono />
        {(watchedValues.secondaryPhones ?? []).filter(Boolean).map((p, i) => (
          <ReviewRow key={i} label={`Secondary Mobile ${i + 1}`} value={formatPhone(p)} mono />
        ))}
        <ReviewRow label="Chapter" value={groups.find((g) => g.id === watchedValues.sourceGroupId)?.name ?? ''} />
        <ReviewRow label="Address Line 1" value={watchedValues.addressLine1 ?? ''} />
        <ReviewRow label="Address Line 2" value={watchedValues.addressLine2 ?? ''} />
        <ReviewRow label="Address Line 3" value={watchedValues.addressLine3 ?? ''} />
        <ReviewRow label="PIN Code" value={watchedValues.postalCode ?? ''} mono />
      </div>
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={() => setStep(0)} className="text-accent hover:underline">← Edit Step 1</button>
        <button type="button" onClick={() => setStep(1)} className="text-accent hover:underline">← Edit Step 2</button>
      </div>
    </div>,
  ];

  return (
    <div className="w-full">
      {/* Draft banner */}
      {showDraftBanner && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>You have an unsaved draft. Restore it?</span>
          <div className="flex gap-3">
            <button onClick={restoreDraft} className="font-medium underline">Restore</button>
            <button onClick={() => { localStorage.removeItem(DRAFT_KEY); setShowDraftBanner(false); }} className="text-muted">Discard</button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!isEdit && (
        <div className="mb-6">
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                    i < step ? 'bg-accent text-white cursor-pointer' :
                    i === step ? 'bg-accent text-white' :
                    'bg-gray-200 text-muted cursor-default'
                  }`}
                >
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </button>
                <span className={`text-xs ${i === step ? 'font-medium' : 'text-muted'}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? 'bg-accent' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {isEdit ? (
          <div className="space-y-5">
            {stepContent[0]}
            <div className="border-t border-border pt-5">{stepContent[1]}</div>
          </div>
        ) : (
          stepContent[step]
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {onCancel && (
            <button type="button" onClick={handleCancel} className="h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
          )}
          <div className="ml-auto flex gap-3">
            {!isEdit && step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-gray-50">
                ← Back
              </button>
            )}
            {!isEdit && step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={async () => {
                  // Validate current step fields before advancing
                  const stepFields: (keyof DevoteeFormInput)[][] = [
                    ['fullName', 'primaryPhone', 'sourceGroupId'],
                    ['countryId'],
                  ];
                  const valid = stepFields[step]?.every((f) => !errors[f]) ?? true;
                  if (valid) setStep((s) => s + 1);
                }}
                className="h-10 rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {isEdit ? 'Saving…' : 'Submitting…'}
                  </span>
                ) : isEdit ? 'Save Changes' : 'Submit Record'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function ReviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 border-b border-gray-100 py-2 last:border-0">
      <span className="w-36 shrink-0 text-muted">{label}</span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  );
}
