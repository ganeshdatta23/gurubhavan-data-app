import { listDevoteesForExport } from '@/db/queries/devotees';
import type { DevoteeQuery } from '@/lib/validators';
import type { ExportRow } from '@/types';

export async function fetchForExport(filters: Pick<DevoteeQuery, 'q' | 'countryId' | 'stateId' | 'cityId'>): Promise<ExportRow[]> {
  return (await listDevoteesForExport(filters)).map((row) => ({
    fullName: row.fullName,
    mobile: row.mobile.startsWith('91') && row.mobile.length >= 12
      ? `+${row.mobile}`
      : row.mobile,
    address: row.address,
    city: row.cityName,
    state: row.stateName,
    postalCode: row.postalCode ?? '',
    country: row.countryName,
    email: row.email ?? '',
  }));
}
