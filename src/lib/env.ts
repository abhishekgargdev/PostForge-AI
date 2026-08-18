const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "COOKIE_NAME",
  "CLOUDINARY_URL",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

function readEnv(name: RequiredEnvVar): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check your .env file.`,
    );
  }
  return value;
}

let validated = false;

function validateEnv(): void {
  if (validated) {
    return;
  }

  const missing = REQUIRED_ENV_VARS.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Check your .env file.`,
    );
  }

  validated = true;
}

export function getEnv() {
  validateEnv();

  return {
    MONGODB_URI: readEnv("MONGODB_URI"),
    JWT_SECRET: readEnv("JWT_SECRET"),
    JWT_EXPIRES_IN: readEnv("JWT_EXPIRES_IN"),
    COOKIE_NAME: readEnv("COOKIE_NAME"),
    CLOUDINARY_URL: readEnv("CLOUDINARY_URL"),
    CRON_SECRET: readEnv("CRON_SECRET"),
    NEXT_PUBLIC_APP_URL: readEnv("NEXT_PUBLIC_APP_URL"),
  } as const;
}
