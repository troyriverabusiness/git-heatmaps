/**
 * Centralized environment configuration with validation.
 * All environment variables are read and validated at startup.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type GitHubConfig = {
  username?: string;
  token?: string;
  // TODO: Add baseUrl for GitHub Enterprise support
};

export type GitLabConfig = {
  username?: string;
  token?: string;
  baseUrl?: string;
  // TODO: Add paginationLimit configuration
};

export type ServerConfig = {
  port: number;
  // TODO: Add host binding configuration
  // TODO: Add cors origin configuration
  // TODO: Add request timeout configuration
};

export type EnvConfig = {
  server: ServerConfig;
  github: GitHubConfig;
  gitlab: GitLabConfig;
};

// -----------------------------------------------------------------------------
// Environment Variable Parsing
// -----------------------------------------------------------------------------

function getEnvString(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key]?.trim();
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new EnvConfigError(`${key} must be a valid number, got: "${value}"`);
  }
  return parsed;
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

class EnvConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvConfigError";
  }
}

function validateConfig(config: EnvConfig): void {
  // Warn about missing tokens - services will still work for public data
  // but with more restrictive rate limits
  if (!config.github.token) {
    console.warn(
      "[config] GITHUB_TOKEN not set. GitHub requests will fail (token required for GraphQL API)."
    );
  }
  if (!config.gitlab.token) {
    console.warn(
      "[config] GITLAB_TOKEN not set. GitLab API requests will be unauthenticated with restrictive rate limits."
    );
  }
}

// -----------------------------------------------------------------------------
// Configuration Loading
// -----------------------------------------------------------------------------

function loadGitHubConfig(): GitHubConfig {
  return {
    username: getEnvString("GITHUB_USERNAME"),
    token: getEnvString("GITHUB_TOKEN"),
  };
}

function loadGitLabConfig(): GitLabConfig {
  return {
    username: getEnvString("GITLAB_USERNAME"),
    token: getEnvString("GITLAB_TOKEN"),
    baseUrl: getEnvString("GITLAB_BASE_URL"),
  };
}

function loadServerConfig(): ServerConfig {
  return {
    port: getEnvNumber("PORT", 3000),
  };
}

/**
 * Loads and validates all environment configuration.
 * Throws EnvConfigError with descriptive message if validation fails.
 * 
 * Call this once at application startup before creating services.
 */
export function loadEnvConfig(): EnvConfig {
  const config: EnvConfig = {
    server: loadServerConfig(),
    github: loadGitHubConfig(),
    gitlab: loadGitLabConfig(),
  };

  validateConfig(config);

  return config;
}

// -----------------------------------------------------------------------------
// Singleton Export
// -----------------------------------------------------------------------------

let cachedConfig: EnvConfig | null = null;

/**
 * Returns the validated environment configuration.
 * Loads and validates on first access, then returns cached config.
 * 
 * @throws EnvConfigError if configuration is invalid
 */
export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = loadEnvConfig();
  }
  return cachedConfig;
}

/**
 * Clears the cached configuration.
 * Useful for testing with different environment configurations.
 */
export function resetEnvConfig(): void {
  cachedConfig = null;
}
