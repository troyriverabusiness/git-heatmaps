// Core contribution aggregation service.
// Orchestrates GitHub and GitLab data sources into unified contribution data.

import type { GitHubService } from "../sources/github/githubService";
import type { GitLabService } from "../sources/gitlab/gitlabService";
import type { ContributionQuery, ContributionData } from "../domain/contributions";

// TODO: Add caching layer - cache by user + date range + enabled sources
// TODO: Add pagination support for large date ranges
// TODO: Add partial history support for incremental updates

/**
 * Unified contribution entry combining all sources.
 */
export type UnifiedContribution = {
  date: string; // YYYY-MM-DD
  github: number;
  gitlab: number;
  total: number;
};

/**
 * Configuration for the contribution service.
 */
export type ContributionServiceConfig = {
  enableGitHub: boolean;
  enableGitLab: boolean;
};

/**
 * Query parameters for fetching aggregated contributions.
 */
export type AggregatedContributionQuery = {
  githubUsername?: string;
  gitlabUsername?: string;
  fromDateIso?: string;
  toDateIso?: string;
};

/**
 * Result of fetching aggregated contributions.
 */
export type AggregatedContributionResult = {
  contributions: UnifiedContribution[];
  errors: SourceError[];
};

/**
 * Error from a specific source.
 */
export type SourceError = {
  source: "github" | "gitlab";
  message: string;
};

export type ContributionService = {
  fetchAggregatedContributions(
    query: AggregatedContributionQuery
  ): Promise<AggregatedContributionResult>;
};

type ContributionServiceDependencies = {
  githubService?: GitHubService;
  gitlabService?: GitLabService;
  config: ContributionServiceConfig;
};

/**
 * Creates a contribution service that aggregates data from multiple sources.
 *
 * TODO: Add cache injection for result caching
 * TODO: Add metrics/logging for source fetch times
 * TODO: Add support for user aliases (same person, different usernames per platform)
 */
export function createContributionService(
  deps: ContributionServiceDependencies
): ContributionService {
  const { githubService, gitlabService, config } = deps;

  return {
    async fetchAggregatedContributions(
      query: AggregatedContributionQuery
    ): Promise<AggregatedContributionResult> {
      const { fromDateIso, toDateIso } = resolveDateRange(
        query.fromDateIso,
        query.toDateIso
      );

      const errors: SourceError[] = [];
      const sourceResults: ContributionData[] = [];

      // TODO: Add caching check here before fetching
      // const cacheKey = buildCacheKey(query, config);
      // const cached = await cache.get(cacheKey);
      // if (cached) return cached;

      // Fetch from enabled sources in parallel
      const fetchPromises: Promise<void>[] = [];

      if (config.enableGitHub && githubService && query.githubUsername) {
        fetchPromises.push(
          fetchFromGitHub(
            githubService,
            query.githubUsername,
            fromDateIso,
            toDateIso
          )
            .then((data) => {
              sourceResults.push(data);
            })
            .catch((error) => {
              errors.push({
                source: "github",
                message: error instanceof Error ? error.message : String(error),
              });
            })
        );
      }

      if (config.enableGitLab && gitlabService && query.gitlabUsername) {
        fetchPromises.push(
          fetchFromGitLab(
            gitlabService,
            query.gitlabUsername,
            fromDateIso,
            toDateIso
          )
            .then((data) => {
              sourceResults.push(data);
            })
            .catch((error) => {
              errors.push({
                source: "gitlab",
                message: error instanceof Error ? error.message : String(error),
              });
            })
        );
      }

      await Promise.all(fetchPromises);

      // Merge and normalize results
      const contributions = mergeContributions(
        sourceResults,
        fromDateIso,
        toDateIso
      );

      // TODO: Cache the result here
      // await cache.set(cacheKey, { contributions, errors }, CACHE_TTL);

      return { contributions, errors };
    },
  };
}

/**
 * Resolves date range, defaulting to last 365 days if not specified.
 */
function resolveDateRange(
  fromDateIso?: string,
  toDateIso?: string
): { fromDateIso: string; toDateIso: string } {
  const today = new Date();
  const resolvedTo = toDateIso ?? formatDateIso(today);

  let resolvedFrom: string;
  if (fromDateIso) {
    resolvedFrom = fromDateIso;
  } else {
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setDate(oneYearAgo.getDate() + 1); // 365 days, not 366
    resolvedFrom = formatDateIso(oneYearAgo);
  }

  return { fromDateIso: resolvedFrom, toDateIso: resolvedTo };
}

/**
 * Formats a Date as YYYY-MM-DD string.
 */
function formatDateIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Fetches contribution data from GitHub.
 *
 * TODO: Add retry logic for transient failures
 * TODO: Add support for pagination if date range spans multiple years
 */
async function fetchFromGitHub(
  service: GitHubService,
  username: string,
  fromDateIso: string,
  toDateIso: string
): Promise<ContributionData> {
  const query: ContributionQuery = {
    provider: "github",
    user: username,
    fromDateIso,
    toDateIso,
  };

  return service.fetchContributionData(query);
}

/**
 * Fetches contribution data from GitLab.
 *
 * TODO: Add retry logic for transient failures
 * TODO: GitLab Events API only returns 90 days - consider workarounds
 */
async function fetchFromGitLab(
  service: GitLabService,
  username: string,
  fromDateIso: string,
  toDateIso: string
): Promise<ContributionData> {
  const query: ContributionQuery = {
    provider: "gitlab",
    user: username,
    fromDateIso,
    toDateIso,
  };

  return service.fetchContributionData(query);
}

/**
 * Merges contribution data from multiple sources into unified array.
 * Fills missing days with 0 contributions.
 */
function mergeContributions(
  sourceResults: ContributionData[],
  fromDateIso: string,
  toDateIso: string
): UnifiedContribution[] {
  // Build a map of date -> { github, gitlab }
  const contributionMap = new Map<string, { github: number; gitlab: number }>();

  // Initialize map with all days in range
  const allDates = generateDateRange(fromDateIso, toDateIso);
  for (const date of allDates) {
    contributionMap.set(date, { github: 0, gitlab: 0 });
  }

  // Populate from source results
  for (const result of sourceResults) {
    for (const day of result.days) {
      const existing = contributionMap.get(day.dateIso);
      if (existing) {
        if (result.provider === "github") {
          existing.github = day.count;
        } else if (result.provider === "gitlab") {
          existing.gitlab = day.count;
        }
      }
      // Days outside the requested range are ignored
    }
  }

  // Convert map to sorted array
  const contributions: UnifiedContribution[] = [];
  for (const date of allDates) {
    const counts = contributionMap.get(date)!;
    contributions.push({
      date,
      github: counts.github,
      gitlab: counts.gitlab,
      total: counts.github + counts.gitlab,
    });
  }

  return contributions;
}

/**
 * Generates all dates in a range (inclusive).
 */
function generateDateRange(fromDateIso: string, toDateIso: string): string[] {
  const dates: string[] = [];
  const current = new Date(fromDateIso);
  const end = new Date(toDateIso);

  while (current <= end) {
    dates.push(formatDateIso(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Creates a contribution service config from environment variables.
 */
export function createContributionServiceConfigFromEnv(): ContributionServiceConfig {
  return {
    enableGitHub: process.env.ENABLE_GITHUB !== "false",
    enableGitLab: process.env.ENABLE_GITLAB !== "false",
  };
}
