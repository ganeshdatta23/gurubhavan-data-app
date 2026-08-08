export type SessionPayload = {
  userId: number;
  username: string;
  name: string;
  role: 'admin';
};

export type LookupOption = {
  id: number;
  name: string;
  iso2?: string;
};

export type DevoteeListItem = {
  id: number;
  fullName: string;
  mobile: string;
  email: string | null;
  address: string;
  postalCode: string | null;
  countryId: number;
  stateId: number;
  cityId: number;
  countryName: string;
  stateName: string;
  cityName: string;
};

export type MessageSendResult = {
  id: number;
  name: string;
  ok: boolean;
  error?: string;
};

export type ExportRow = {
  fullName: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
};
