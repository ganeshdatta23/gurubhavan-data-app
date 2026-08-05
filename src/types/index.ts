export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'member';
export type RecordStatus = 'clean' | 'needs_review' | 'duplicate';
export type CampaignStatus = 'draft' | 'queued' | 'running' | 'completed' | 'failed' | 'scheduled';
export type DeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'skipped_opted_out'
  | 'skipped_no_phone';

export interface SessionPayload {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  sourceGroupId: number | null;
}

export interface LookupOption {
  id: number;
  name: string;
}

export interface DevoteeListItem {
  id: number;
  fullName: string;
  primaryPhone: string | null;
  cityName: string | null;
  stateName: string | null;
  countryName: string | null;
  sourceGroupName: string;
  recordStatus: RecordStatus;
  whatsappOptedOut: boolean;
  flags: string[];
}

export interface DevoteeDetail extends DevoteeListItem {
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  postalCode: string | null;
  cityId: number | null;
  stateId: number | null;
  countryId: number | null;
  sourceGroupId: number;
  phones: Array<{ id: number; phoneNumber: string; isPrimary: boolean; countryCode: string }>;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DevoteeFilters {
  q?: string;
  status?: RecordStatus;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  sourceGroupId?: number;
  hasFlags?: boolean;
  whatsappOptedIn?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExportRow {
  serial: number;
  name: string;
  primaryPhone: string;
  secondaryPhones: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  chapter: string;
  status: RecordStatus;
  flags: string;
}

export interface AudiencePreview {
  total: number;
  noPhone: number;
  optedOut: number;
  eligible: number;
}
