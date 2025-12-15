/**
 * Centralized environment configuration with validation.
 * All environment variables are read and validated at startup.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type GitHubConfig = {
  enabled: boolean;
  username?: string;
  token?: string;
  // TODO: Add baseUrl for GitHub Enterprise support
};

export type GitLabConfig = {
  enabled: boolean;
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

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value === "true" || value === "1";
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

function validateGitHubConfig(config: GitHubConfig): void {
  if (config.enabled && !config.token) {
    throw new EnvConfigError(
      "GITHUB_TOKEN is required when ENABLE_GITHUB is true. " +
      "Create a personal access token at https://github.com/settings/tokens"
    );
  }
}

function validateGitLabConfig(config: GitLabConfig): void {
  // GitLab can work without a token for public profiles,
  // but warn if enabled without token as rate limits are restrictive
  if (config.enabled && !config.token) {
    console.warn(
      "[config] WARNING: GITLAB_TOKEN not set. " +
      "GitLab API requests will be unauthenticated with restrictive rate limits."
    );
  }
}

function validateConfig(config: EnvConfig): void {
  if (!config.github.enabled && !config.gitlab.enabled) {
    throw new EnvConfigError(
      "At least one provider must be enabled. " +
      "Set ENABLE_GITHUB=true and/or ENABLE_GITLAB=true"
    );
  }

  validateGitHubConfig(config.github);
  validateGitLabConfig(config.gitlab);
}

// -----------------------------------------------------------------------------
// Configuration Loading
// -----------------------------------------------------------------------------

function loadGitHubConfig(): GitHubConfig {
  return {
    enabled: getEnvBoolean("ENABLE_GITHUB", true),
    username: getEnvString("GITHUB_USERNAME"),
    token: getEnvString("GITHUB_TOKEN"),
  };
}

function loadGitLabConfig(): GitLabConfig {
  return {
    enabled: getEnvBoolean("ENABLE_GITLAB", false),
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
