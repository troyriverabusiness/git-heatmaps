// Public interface for GitHub contributions - used by services layer.

import type { ContributionQuery, ContributionData, ContributionHistory } from "../../domain/contributions";
import { upstreamError } from "../../utils/appError";
import { createGitHubClient, type GitHubClient, type GitHubClientConfig } from "./githubClient";
import { contributionCalendarQuery } from "./githubQueries";
import { mapContributionData, mapContributionHistory, type GitHubContributionCalendarResponse } from "./githubMapper";

export type GitHubServiceConfig = {
  token: string;
};

export type GitHubService = {
  fetchContributionData(query: ContributionQuery): Promise<ContributionData>;
  fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory>;
};

/**
 * Creates a GitHub service for fetching contribution data.
 * 
 * TODO: Add token validation on service creation
 * TODO: Add support for pagination if GitHub ever paginates calendar data
 * TODO: Add support for fetching contributions across multiple years
 */
export function createGitHubService(config: GitHubServiceConfig): GitHubService {
  const clientConfig: GitHubClientConfig = {
    token: config.token,
  };
  
  const client: GitHubClient = createGitHubClient(clientConfig);

  return {
    async fetchContributionData(query: ContributionQuery): Promise<ContributionData> {
      const response = await fetchContributionCalendar(client, query);
      return mapContributionData(response, query.user);
    },

    async fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory> {
      const response = await fetchContributionCalendar(client, query);
      return mapContributionHistory(response, query.user);
    },
  };
}

/**
 * Internal helper to fetch contribution calendar from GitHub.
 * Handles query variables and error handling.
 */
async function fetchContributionCalendar(
  client: GitHubClient,
  query: ContributionQuery
): Promise<GitHubContributionCalendarResponse> {
  const variables: Record<string, unknown> = {
    username: query.user,
    // GitHub expects ISO 8601 datetime format
    from: `${query.year}-01-01T00:00:00Z`,
    to: `${query.year}-12-31T23:59:59Z`,
  };

  const result = await client.query<GitHubContributionCalendarResponse>(
    contributionCalendarQuery,
    variables
  );

  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => e.message).join("; ");
    throw upstreamError(`GitHub API error: ${errorMessages}`, result.errors);
  }

  if (!result.data) {
    throw upstreamError("GitHub API returned no data");
  }

  if (!result.data.user) {
    throw upstreamError(`GitHub user not found: ${query.user}`);
  }

  return result.data;
}
