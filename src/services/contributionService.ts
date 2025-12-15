// Core contribution aggregation service.
// Orchestrates GitHub and GitLab data sources into unified contribution data.

import type { GitHubService } from "../sources/github/githubService";
import type { GitLabService } from "../sources/gitlab/gitlabService";
import type { ContributionQuery, ContributionData } from "../domain/contributions";
import type { Cache } from "../cache";

// Cache TTL: 5 minutes (contributions don't change frequently)
const CACHE_TTL_MS = 5 * 60 * 1000;

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
  /** Number of sources that were requested (had username provided) */
  sourcesRequested: number;
  /** Number of sources that returned data successfully */
  sourcesSucceeded: number;
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
  cache?: Cache;
};

/**
 * Builds a cache key from the query parameters.
 */
function buildCacheKey(query: AggregatedContributionQuery, fromDateIso: string, toDateIso: string): string {
  const parts = [
    'contributions',
    query.githubUsername ? `gh:${query.githubUsername}` : '',
    query.gitlabUsername ? `gl:${query.gitlabUsername}` : '',
    fromDateIso,
    toDateIso,
  ].filter(Boolean);
  return parts.join(':');
}

/**
 * Creates a contribution service that aggregates data from multiple sources.
 *
 * TODO: Add metrics/logging for source fetch times
 * TODO: Add support for user aliases (same person, different usernames per platform)
 */
export function createContributionService(
  deps: ContributionServiceDependencies
): ContributionService {
  const { githubService, gitlabService, cache } = deps;

  return {
    async fetchAggregatedContributions(
      query: AggregatedContributionQuery
    ): Promise<AggregatedContributionResult> {
      const { fromDateIso, toDateIso } = resolveDateRange(
        query.fromDateIso,
        query.toDateIso
      );

      // Check cache first
      const cacheKey = buildCacheKey(query, fromDateIso, toDateIso);
      if (cache) {
        const cached = cache.get<AggregatedContributionResult>(cacheKey);
        if (cached) {
          console.log(`[service] Returning cached result for key="${cacheKey}"`);
          return cached;
        }
      }

      const errors: SourceError[] = [];
      const sourceResults: ContributionData[] = [];
      let sourcesRequested = 0;

      // Fetch from available sources in parallel
      // Each source is queried if the service exists AND a username is provided
      const fetchPromises: Promise<void>[] = [];

      if (githubService && query.githubUsername) {
        sourcesRequested++;
        console.log(`[source] GitHub: fetching contributions for user "${query.githubUsername}" (${fromDateIso} to ${toDateIso})`);
        const startTime = Date.now();
        fetchPromises.push(
          fetchFromGitHub(
            githubService,
            query.githubUsername,
            fromDateIso,
            toDateIso
          )
            .then((data) => {
              const duration = Date.now() - startTime;
              console.log(`[source] GitHub: success - ${data.days.length} days fetched (${duration}ms)`);
              sourceResults.push(data);
            })
            .catch((error) => {
              const duration = Date.now() - startTime;
              const message = error instanceof Error ? error.message : String(error);
              console.error(`[source] GitHub: error - ${message} (${duration}ms)`);
              errors.push({
                source: "github",
                message,
              });
            })
        );
      }

      if (gitlabService && query.gitlabUsername) {
        sourcesRequested++;
        console.log(`[source] GitLab: fetching contributions for user "${query.gitlabUsername}" (${fromDateIso} to ${toDateIso})`);
        const startTime = Date.now();
        fetchPromises.push(
          fetchFromGitLab(
            gitlabService,
            query.gitlabUsername,
            fromDateIso,
            toDateIso
          )
            .then((data) => {
              const duration = Date.now() - startTime;
              console.log(`[source] GitLab: success - ${data.days.length} days fetched (${duration}ms)`);
              sourceResults.push(data);
            })
            .catch((error) => {
              const duration = Date.now() - startTime;
              const message = error instanceof Error ? error.message : String(error);
              console.error(`[source] GitLab: error - ${message} (${duration}ms)`);
              errors.push({
                source: "gitlab",
                message,
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

      const result: AggregatedContributionResult = {
        contributions,
        errors,
        sourcesRequested,
        sourcesSucceeded: sourceResults.length,
      };

      // Cache the result
      if (cache) {
        cache.set(cacheKey, result, CACHE_TTL_MS);
      }

      return result;
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

