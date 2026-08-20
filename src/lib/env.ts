const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "COOKIE_NAME",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

const OPTIONAL_WARN_ENV_VARS = [
  "GEMINI_MODEL",
  "GEMINI_IMAGE_MODEL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
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

function warnOptionalEnvVars(): void {
  const missing = OPTIONAL_WARN_ENV_VARS.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length > 0) {
    console.warn(
      `[postforge-ai] Optional environment variables not set: ${missing.join(", ")}. ` +
        "Some features will use defaults or may be unavailable until configured.",
    );
  }
}

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

  warnOptionalEnvVars();
  validated = true;
}

export function getEnv() {
  validateEnv();

  return {
    MONGODB_URI: readEnv("MONGODB_URI"),
    JWT_SECRET: readEnv("JWT_SECRET"),
    JWT_EXPIRES_IN: readEnv("JWT_EXPIRES_IN"),
    COOKIE_NAME: readEnv("COOKIE_NAME"),
    CRON_SECRET: readEnv("CRON_SECRET"),
    NEXT_PUBLIC_APP_URL: readEnv("NEXT_PUBLIC_APP_URL"),
  } as const;
}
