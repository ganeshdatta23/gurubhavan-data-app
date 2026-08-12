const minimumSecretLength = 32;

export function getJwtSecret(): Uint8Array | null {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < minimumSecretLength) return null;
  return new TextEncoder().encode(value);
}

export function requireJwtSecret(): Uint8Array {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error(`JWT_SECRET must be set and contain at least ${minimumSecretLength} characters.`);
  }
  return secret;
}
