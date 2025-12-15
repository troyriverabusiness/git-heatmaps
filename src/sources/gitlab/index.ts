/**
 * GitLab Source Module
 * 
 * Provides GitLab contribution data fetching and processing.
 */

// Source factory
export { createGitLabContributionsSource } from './gitlabSource';

// Service
export { createGitLabService, type GitLabService, type GitLabServiceConfig } from './gitlabService';

// Client
export {
  createGitLabClient,
  type GitLabClient,
  type GitLabClientConfig,
  type GitLabResponse,
  type GitLabPaginationInfo,
} from './gitlabClient';

// Event types and configuration
export {
  GITLAB_API_ACTIONS,
  GITLAB_PAGINATION,
  CONTRIBUTION_ACTION_NAMES,
  PUSH_ACTION_NAMES,
  EXCLUDED_TARGET_TYPES,
  isContributionAction,
  isPushAction,
  isExcludedTargetType,
  type GitLabApiAction,
  type GitLabResponseAction,
  type GitLabTargetType,
} from './gitlabEventTypes';

// Event filtering
export {
  isContributionEvent,
  filterContributionEvents,
  getEventContributionWeight,
  type GitLabEvent,
} from './gitlabEventFilter';

// Aggregation
export {
  aggregateEventsByDay,
  mapToContributionDays,
  mapToHistoryPoints,
  filterByDateRange,
  type DailyContribution,
} from './gitlabAggregator';
