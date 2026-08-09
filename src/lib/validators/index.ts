import { z } from 'zod';

const positiveId = z.coerce.number().int().positive('Choose an option.');
const nullableEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().email('Enter a valid email address.').max(255).toLowerCase().nullable(),
);

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username.').max(50).toLowerCase(),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const devoteeFormSchema = z.object({
    fullName: z.string().trim().min(2, 'Enter at least 2 characters.').max(120, 'Use 120 characters or fewer.'),
    mobile: z.string().transform((value) => value.replace(/\D/g, '')).pipe(
      z.string().min(7, 'Enter a valid mobile number.').max(15, 'Enter a valid mobile number.'),
    ),
    address: z.string().trim().min(3, 'Enter the address.').max(500, 'Use 500 characters or fewer.'),
    countryId: positiveId,
    stateId: positiveId,
    cityId: positiveId,
    postalCode: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const digits = value.replace(/\D/g, '');
        return digits || null;
      },
      z.string().max(12, 'Use 12 digits or fewer.').nullable().optional(),
    ),
    email: nullableEmail.optional().default(null),
  });

export const devoteeQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  countryId: z.coerce.number().int().positive().optional(),
  stateId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine((value) => [50, 100, 200].includes(value), 'Choose 50, 100, or 200.').default(50),
});

export const sendMessagesSchema = z.object({
  ids: z.array(z.coerce.number().int().positive())
    .min(1, 'Select at least one person.')
    .max(25, 'Send to at most 25 people per request.'),
  body: z.string().trim().min(1, 'Type the message to send.').max(3000, 'Use 3,000 characters or fewer.'),
});

export const duplicateCheckSchema = z.object({
  mobile: z.string().transform((value) => value.replace(/\D/g, '')).pipe(z.string().min(7).max(15)),
  countryId: positiveId,
  excludeId: z.number().int().positive().optional(),
});

export const createCountrySchema = z.object({
  name: z.string().trim().min(2, 'Enter a country name (at least 2 characters).').max(100, 'Country name is too long (100 characters max).'),
});

export const createStateSchema = z.object({
  countryId: positiveId,
  name: z.string().trim().min(2, 'Enter a state name (at least 2 characters).').max(100, 'State name is too long (100 characters max).'),
});

export const createCitySchema = z.object({
  stateId: positiveId,
  name: z.string().trim().min(2, 'Enter a city name (at least 2 characters).').max(100, 'City name is too long (100 characters max).'),
});

export type DevoteeFormInput = z.input<typeof devoteeFormSchema>;
export type DevoteeFormData = z.output<typeof devoteeFormSchema>;
export type DevoteeQuery = z.infer<typeof devoteeQuerySchema>;
