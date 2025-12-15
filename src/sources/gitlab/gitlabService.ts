// Public interface for GitLab contributions - used by services layer.

import type { ContributionQuery, ContributionData, ContributionHistory } from "../../domain/contributions";
import { upstreamError } from "../../utils/appError";
import { createGitLabClient, type GitLabClient, type GitLabClientConfig } from "./gitlabClient";
import type { GitLabEvent } from "./gitlabEventFilter";
import { 
  aggregateEventsByDay, 
  mapToContributionDays, 
  mapToHistoryPoints,
  filterByDateRange 
} from "./gitlabAggregator";

// Default pagination settings
const DEFAULT_PER_PAGE = 100;  // GitLab max is 100
const MAX_PAGES = 10;          // Safety limit to prevent infinite loops

export type GitLabServiceConfig = {
  token?: string;
  baseUrl?: string;
  // TODO: Add pagination limit configuration
  // TODO: Add date range default configuration
};

export type GitLabService = {
  fetchContributionData(query: ContributionQuery): Promise<ContributionData>;
  fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory>;
};

/**
 * GitLab Events API response event type.
 * This is the raw format from GitLab API (snake_case).
 */
type GitLabApiEvent = {
  id: number;
  action_name: string;
  target_type: string | null;
  created_at: string;
  push_data?: {
    commit_count?: number;
    action?: string;
    ref_type?: string;
    commit_title?: string;
  };
};

/**
 * Maps GitLab API response (snake_case) to internal format (camelCase).
 */
function mapApiEventToEvent(apiEvent: GitLabApiEvent): GitLabEvent {
  return {
    id: apiEvent.id,
    actionName: apiEvent.action_name,
    targetType: apiEvent.target_type,
    createdAt: apiEvent.created_at,
    pushData: apiEvent.push_data ? {
      commitCount: apiEvent.push_data.commit_count,
      action: apiEvent.push_data.action,
      refType: apiEvent.push_data.ref_type,
      commitTitle: apiEvent.push_data.commit_title,
    } : undefined,
  };
}

/**
 * Creates a GitLab service for fetching contribution data.
 * 
 * TODO: GitLab Events API limitations:
 *   - Only returns events from the last 90 days (vs GitHub's full year in contribution graph)
 *   - Requires pagination to fetch all events (max 100 per page)
 *   - Rate limits are more restrictive without authentication
 *   - No direct "contribution calendar" endpoint like GitHub GraphQL
 *   - Username lookup may need a separate API call to get user ID
 * 
 * TODO: Add token validation on service creation
 * TODO: Add support for configurable date ranges
 * TODO: Add support for fetching contributions beyond 90-day limit (if possible via other APIs)
 */
export function createGitLabService(config: GitLabServiceConfig = {}): GitLabService {
  const clientConfig: GitLabClientConfig = {
    token: config.token,
    baseUrl: config.baseUrl,
  };
  
  const client: GitLabClient = createGitLabClient(clientConfig);

  return {
    async fetchContributionData(query: ContributionQuery): Promise<ContributionData> {
      const events = await fetchAllUserEvents(client, query.user);
      const aggregated = aggregateEventsByDay(events);
      const filtered = filterByDateRange(aggregated, query.fromDateIso, query.toDateIso);
      const days = mapToContributionDays(filtered);

      return {
        provider: "gitlab",
        user: query.user,
        days,
      };
    },

    async fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory> {
      const events = await fetchAllUserEvents(client, query.user);
      const aggregated = aggregateEventsByDay(events);
      const filtered = filterByDateRange(aggregated, query.fromDateIso, query.toDateIso);
      const points = mapToHistoryPoints(filtered);

      return {
        provider: "gitlab",
        user: query.user,
        points,
      };
    },
  };
}

/**
 * Fetches all user events from GitLab, handling pagination.
 * 
 * TODO: GitLab API can use username directly in newer versions
 * TODO: Some GitLab instances require user ID instead of username
 * TODO: Add support for date filtering at API level (after/before params)
 * TODO: Consider caching user ID lookups
 */
async function fetchAllUserEvents(
  client: GitLabClient,
  username: string
): Promise<GitLabEvent[]> {
  const allEvents: GitLabEvent[] = [];
  let page = 1;

  // TODO: GitLab Events API supports `after` param for date filtering
  // This could reduce API calls if we only need recent data

  while (page <= MAX_PAGES) {
    const result = await client.get<GitLabApiEvent[]>(
      `/users/${encodeURIComponent(username)}/events`,
      {
        per_page: DEFAULT_PER_PAGE,
        page,
      }
    );

    // TODO: Handle 404 for user not found
    // TODO: Handle empty response (no events)
    if (!Array.isArray(result.data)) {
      throw upstreamError(`GitLab API returned unexpected data format for user: ${username}`);
    }

    // Map API format to internal format
    const events = result.data.map(mapApiEventToEvent);
    allEvents.push(...events);

    // Check if there are more pages
    // TODO: GitLab returns empty array when no more events, or we can check X-Next-Page header
    if (result.data.length < DEFAULT_PER_PAGE || !result.pagination.nextPage) {
      break;
    }

    page++;
  }

  // TODO: Log warning if we hit MAX_PAGES limit (user has many events)

  return allEvents;
}
