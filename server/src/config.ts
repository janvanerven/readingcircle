function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

// In development, allow fallback secrets for convenience
export const JWT_SECRET = isProduction
  ? requireEnv('JWT_SECRET')
  : (process.env.JWT_SECRET || 'dev-secret-change-me');

export const JWT_REFRESH_SECRET = isProduction
  ? requireEnv('JWT_REFRESH_SECRET')
  : (process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');

export const JWT_ALGORITHM = 'HS256' as const;

export const IS_PRODUCTION = isProduction;
