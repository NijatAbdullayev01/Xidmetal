const PLACEHOLDER_FRAGMENTS = [
  'change-me',
  'changeme',
  'replace-me',
  'your-secret',
  'secret-key',
] as const;

const MIN_PRODUCTION_LENGTH = 32;

export function isPlaceholderJwtSecret(secret: string): boolean {
  const normalized = secret.trim().toLowerCase();
  if (normalized.length < MIN_PRODUCTION_LENGTH) return true;
  return PLACEHOLDER_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/** Production boot-da zəif JWT_SECRET ilə işə düşmənin qarşısı */
export function assertJwtSecretForRuntime(secret: string, nodeEnv: string): void {
  if (nodeEnv !== 'production') return;
  if (!secret.trim() || isPlaceholderJwtSecret(secret)) {
    throw new Error(
      'JWT_SECRET production üçün etibarsızdır: ən azı 32 simvol və placeholder olmamalıdır',
    );
  }
}
