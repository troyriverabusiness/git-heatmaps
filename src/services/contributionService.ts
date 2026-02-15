// Core contribution aggregation service.
// Orchestrates GitHub and GitLab data sources into unified contribution data.

import type { GitHubService } from "../sources/github/githubService";
import type { GitLabService } from "../sources/gitlab/gitlabService";
import type { ContributionQuery, ContributionData } from "../domain/contributions";
import type { Cache } from "../cache";
import { buildSourceCacheKey } from "../cache/cacheKeys";

// Cache TTL: 24 hours (contributions only update once per day)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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
  githubToken?: string;
  gitlabToken?: string;
  /** Optional GitLab instance base URL (e.g. for self-hosted). Overrides server GITLAB_BASE_URL when set. */
  gitlabBaseUrl?: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
};

/**
 * Result of fetching aggregated contributions.
 */
export type AggregatedContributionResult = {
  contributions: UnifiedContribution[];
  errors: SourceError[];
  /** Number of sources that were requested (had token; username resolved from token) */
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
 * Looks up cached contribution data for a specific source.
 * Returns null if cache is not available or if there's a cache miss.
 */
function lookupSourceCache(
  cache: Cache | undefined,
  provider: 'github' | 'gitlab',
  token: string,
  fromDate: string,
  toDate: string
): ContributionData | null {
  if (!cache) return null;

  const cacheKey = buildSourceCacheKey({ provider, token, fromDate, toDate });
  const cached = cache.get<ContributionData>(cacheKey);

  if (cached) {
    console.log(`[service] Cache HIT for ${provider} (key="${cacheKey}")`);
    return cached;
  }

  console.log(`[service] Cache MISS for ${provider} (key="${cacheKey}")`);
  return null;
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
      const { fromDate, toDate } = query;

      // Resolve usernames from tokens if needed
      let githubUsername = query.githubUsername;
      let gitlabUsername = query.gitlabUsername;

      // GitHub username resolution
      if (query.githubToken && !githubUsername && githubService) {
        try {
          console.log(`[service] Resolving GitHub username from token`);
          githubUsername = await githubService.fetchAuthenticatedUsername(query.githubToken);
          console.log(`[service] Resolved GitHub username: ${githubUsername}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[service] Failed to resolve GitHub username: ${message}`);
          throw new Error(`Invalid GitHub token: ${message}`);
        }
      }

      // GitLab username resolution
      if (query.gitlabToken && !gitlabUsername && gitlabService) {
        try {
          console.log(`[service] Resolving GitLab username from token`);
          gitlabUsername = await gitlabService.fetchAuthenticatedUsername(
            query.gitlabToken,
            query.gitlabBaseUrl
          );
          console.log(`[service] Resolved GitLab username: ${gitlabUsername}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[service] Failed to resolve GitLab username: ${message}`);
          throw new Error(`Invalid GitLab token: ${message}`);
        }
      }

      // Check cache for each source independently (token-based caching)
      const cachedGitHub = query.githubToken && githubUsername
        ? lookupSourceCache(cache, 'github', query.githubToken, fromDate, toDate)
        : null;

      const cachedGitLab = query.gitlabToken && gitlabUsername
        ? lookupSourceCache(cache, 'gitlab', query.gitlabToken, fromDate, toDate)
        : null;

      const errors: SourceError[] = [];
      const sourceResults: ContributionData[] = [];
      let sourcesRequested = 0;

      // Add cached results to sourceResults
      if (cachedGitHub) {
        sourceResults.push(cachedGitHub);
        console.log(`[service] Using cached GitHub data for user "${githubUsername}"`);
      }

      if (cachedGitLab) {
        sourceResults.push(cachedGitLab);
        console.log(`[service] Using cached GitLab data for user "${gitlabUsername}"`);
      }

      // Fetch from available sources in parallel (only if not cached)
      const fetchPromises: Promise<void>[] = [];

      if (githubService && githubUsername && !cachedGitHub) {
        sourcesRequested++;
        console.log(`[source] GitHub: fetching contributions for user "${githubUsername}" (${fromDate} to ${toDate})`);
        const startTime = Date.now();
        fetchPromises.push(
          fetchFromGitHub(
            githubService,
            githubUsername,
            fromDate,
            toDate,
            query.githubToken
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

      if (gitlabService && gitlabUsername && !cachedGitLab) {
        sourcesRequested++;
        console.log(`[source] GitLab: fetching contributions for user "${gitlabUsername}" (${fromDate} to ${toDate})`);
        const startTime = Date.now();
        fetchPromises.push(
          fetchFromGitLab(
            gitlabService,
            gitlabUsername,
            fromDate,
            toDate,
            query.gitlabToken,
            query.gitlabBaseUrl
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
        fromDate,
        toDate
      );

      const result: AggregatedContributionResult = {
        contributions,
        errors,
        sourcesRequested,
        sourcesSucceeded: sourceResults.length,
      };

      // Cache each source separately (only newly fetched data)
      if (cache) {
        for (const source of sourceResults) {
          const wasCached =
            (source.provider === 'github' && cachedGitHub) ||
            (source.provider === 'gitlab' && cachedGitLab);

          if (!wasCached) {
            if (source.provider === 'github' && query.githubToken) {
              const key = buildSourceCacheKey({
                provider: 'github',
                token: query.githubToken,
                fromDate,
                toDate
              });
              cache.set(key, source, CACHE_TTL_MS);
              console.log(`[service] Cached GitHub data (key="${key}", ttl=${CACHE_TTL_MS}ms)`);
            }

            if (source.provider === 'gitlab' && query.gitlabToken) {
              const key = buildSourceCacheKey({
                provider: 'gitlab',
                token: query.gitlabToken,
                fromDate,
                toDate
              });
              cache.set(key, source, CACHE_TTL_MS);
              console.log(`[service] Cached GitLab data (key="${key}", ttl=${CACHE_TTL_MS}ms)`);
            }
          }
        }
      }

      return result;
    },
  };
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
 */
async function fetchFromGitHub(
  service: GitHubService,
  username: string,
  fromDate: string,
  toDate: string,
  token?: string
): Promise<ContributionData> {
  const query: ContributionQuery = {
    provider: "github",
    user: username,
    fromDate,
    toDate,
  };

  return service.fetchContributionData(query, token);
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
  fromDate: string,
  toDate: string,
  token?: string,
  baseUrl?: string
): Promise<ContributionData> {
  const query: ContributionQuery = {
    provider: "gitlab",
    user: username,
    fromDate,
    toDate,
  };

  return service.fetchContributionData(query, token, baseUrl);
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

