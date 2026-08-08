export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'member';
export type RecordStatus = 'clean' | 'needs_review' | 'duplicate';
export type CampaignStatus = 'draft' | 'queued' | 'running' | 'completed' | 'failed' | 'scheduled';
export type DeliveryStatus =
  | 'queued' | 'sent' | 'delivered' | 'read'
  | 'failed' | 'skipped_opted_out' | 'skipped_no_phone';
export type BulkUploadStatus =
  | 'pending' | 'validating' | 'preview_ready' | 'processing' | 'completed' | 'failed';
export type ReviewFlagType =
  | 'state_not_certain' | 'city_not_certain' | 'postal_missing'
  | 'missing_mobile' | 'district_not_certain';

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
  cityId: number | null;
  cityName: string | null;
  districtId: number | null;
  districtName: string | null;
  stateId: number | null;
  stateName: string | null;
  countryId: number | null;
  countryName: string | null;
  sourceGroupId: number;
  sourceGroupName: string | null;
  recordStatus: RecordStatus;
  whatsappOptedOut: boolean;
  flags: string[];
  addressLine1: string | null;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DevoteeDetail extends DevoteeListItem {
  serialNo: number | null;
  addressLine2: string | null;
  addressLine3: string | null;
  rawAddressText: string | null;
  notes: string | null;
  phones: Array<{ id: number; phoneNumber: string; isPrimary: boolean; countryCode: string }>;
  reviewFlags: Array<{ id: number; flag: string; resolvedAt: Date | null }>;
}

export interface DevoteeFilters {
  q?: string;
  status?: RecordStatus;
  countryId?: number;
  stateId?: number;
  districtId?: number;
  cityId?: number;
  sourceGroupId?: number;
  hasFlags?: boolean;
  whatsappOptedIn?: boolean;
  createdAfter?: string;
  createdBefore?: string;
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
  district: string;
  state: string;
  country: string;
  postalCode: string;
  chapter: string;
  status: RecordStatus;
  flags: string;
  createdAt: string;
}

export interface BulkUploadValidationResult {
  jobId: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: BulkUploadRowError[];
}

export interface BulkUploadRowError {
  rowNumber: number;
  fieldName: string | null;
  errorType: string;
  errorMessage: string;
  rawValue: string | null;
}

export interface AudiencePreview {
  total: number;
  noPhone: number;
  optedOut: number;
  eligible: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  warnings: string[];
  existingRecord: { id: number; name: string; chapter: string } | null;
}
