/**
 * GitLab Service
 * 
 * Fetches contribution data from GitLab's Events API.
 * 
 * Key implementation details:
 * - Fetches events by action type separately (GitLab API quirk)
 * - Uses date range parameters (after/before) for efficient querying
 * - Deduplicates events by ID when combining action type results
 */

import type { ContributionQuery, ContributionData, ContributionHistory } from '../../domain/contributions';
import { upstreamError } from '../../utils/appError';
import { createGitLabClient, type GitLabClient, type GitLabClientConfig } from './gitlabClient';
import { GITLAB_API_ACTIONS, GITLAB_PAGINATION } from './gitlabEventTypes';
import type { GitLabEvent } from './gitlabEventFilter';
import {
  aggregateEventsByDay,
  mapToContributionDays,
  mapToHistoryPoints,
  filterByDateRange,
} from './gitlabAggregator';

// ============================================================================
// Types
// ============================================================================

export type GitLabServiceConfig = {
  token?: string;
  baseUrl?: string;
};

export type GitLabService = {
  fetchContributionData(query: ContributionQuery): Promise<ContributionData>;
  fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory>;
};

/**
 * GitLab Events API response event type (snake_case from API).
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

// ============================================================================
// Service Factory
// ============================================================================

/**
 * Creates a GitLab service for fetching contribution data.
 */
export function createGitLabService(config: GitLabServiceConfig = {}): GitLabService {
  const client = createGitLabClient({
    token: config.token,
    baseUrl: config.baseUrl,
  });

  return {
    async fetchContributionData(query: ContributionQuery): Promise<ContributionData> {
      const events = await fetchUserEvents(client, query.user, query.fromDateIso, query.toDateIso);
      console.log(`[gitlab-service] Total events fetched: ${events.length}`);

      const aggregated = aggregateEventsByDay(events);
      console.log(`[gitlab-service] Days with contributions (before date filter): ${aggregated.length}`);

      const filtered = filterByDateRange(aggregated, query.fromDateIso, query.toDateIso);
      console.log(`[gitlab-service] Days with contributions (after date filter): ${filtered.length}`);

      return {
        provider: 'gitlab',
        user: query.user,
        days: mapToContributionDays(filtered),
      };
    },

    async fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory> {
      const events = await fetchUserEvents(client, query.user, query.fromDateIso, query.toDateIso);
      const aggregated = aggregateEventsByDay(events);
      const filtered = filterByDateRange(aggregated, query.fromDateIso, query.toDateIso);

      return {
        provider: 'gitlab',
        user: query.user,
        points: mapToHistoryPoints(filtered),
      };
    },
  };
}

// ============================================================================
// Event Fetching
// ============================================================================

/**
 * Fetches all user events from GitLab for a date range.
 * 
 * Implementation notes:
 * - GitLab's API doesn't reliably return all event types in a single query
 * - We fetch each action type separately and deduplicate by event ID
 * - Date parameters are exclusive, so we adjust by ±1 day for inclusive range
 */
async function fetchUserEvents(
  client: GitLabClient,
  username: string,
  fromDateIso?: string,
  toDateIso?: string,
): Promise<GitLabEvent[]> {
  const dateParams = buildDateParams(fromDateIso, toDateIso);
  
  console.log(`[gitlab-service] Fetching events for date range: ${dateParams.after ?? 'none'} to ${dateParams.before ?? 'none'}`);

  // Fetch each action type separately and deduplicate
  const allEvents: GitLabEvent[] = [];
  const seenIds = new Set<number>();

  for (const action of GITLAB_API_ACTIONS) {
    const events = await fetchEventsByAction(client, username, action, dateParams);
    
    for (const event of events) {
      if (!seenIds.has(event.id)) {
        seenIds.add(event.id);
        allEvents.push(event);
      }
    }

    console.log(`[gitlab-service] Action '${action}': ${events.length} events (unique total: ${allEvents.length})`);
  }

  return allEvents;
}

/**
 * Builds date parameters for GitLab API.
 * GitLab uses exclusive bounds, so we adjust by ±1 day for inclusive range.
 */
function buildDateParams(fromDateIso?: string, toDateIso?: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (fromDateIso) {
    const afterDate = new Date(fromDateIso);
    afterDate.setDate(afterDate.getDate() - 1);
    params.after = afterDate.toISOString().split('T')[0];
  }

  if (toDateIso) {
    const beforeDate = new Date(toDateIso);
    beforeDate.setDate(beforeDate.getDate() + 1);
    params.before = beforeDate.toISOString().split('T')[0];
  }

  return params;
}

/**
 * Fetches events for a specific action type with pagination.
 */
async function fetchEventsByAction(
  client: GitLabClient,
  username: string,
  action: string,
  dateParams: Record<string, string>,
): Promise<GitLabEvent[]> {
  const events: GitLabEvent[] = [];
  let page = 1;

  while (page <= GITLAB_PAGINATION.MAX_PAGES) {
    const result = await client.get<GitLabApiEvent[]>(
      `/users/${encodeURIComponent(username)}/events`,
      {
        ...dateParams,
        action,
        per_page: GITLAB_PAGINATION.PER_PAGE,
        page,
      },
    );

    if (!Array.isArray(result.data)) {
      throw upstreamError(`GitLab API returned unexpected data format for user: ${username}`);
    }

    events.push(...result.data.map(mapApiEvent));

    // Stop if no more pages
    if (result.data.length < GITLAB_PAGINATION.PER_PAGE || !result.pagination.nextPage) {
      break;
    }

    page++;
  }

  return events;
}

/**
 * Maps GitLab API response (snake_case) to internal format (camelCase).
 */
function mapApiEvent(apiEvent: GitLabApiEvent): GitLabEvent {
  return {
    id: apiEvent.id,
    actionName: apiEvent.action_name,
    targetType: apiEvent.target_type,
    createdAt: apiEvent.created_at,
    pushData: apiEvent.push_data
      ? {
          commitCount: apiEvent.push_data.commit_count,
          action: apiEvent.push_data.action,
          refType: apiEvent.push_data.ref_type,
          commitTitle: apiEvent.push_data.commit_title,
        }
      : undefined,
  };
}
