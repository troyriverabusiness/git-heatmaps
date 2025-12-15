// Re-exports for GitLab source module.

export { createGitLabContributionsSource } from "./gitlabSource";
export { createGitLabService, type GitLabService, type GitLabServiceConfig } from "./gitlabService";
export { createGitLabClient, type GitLabClient, type GitLabClientConfig, type GitLabResponse, type GitLabPaginationInfo } from "./gitlabClient";
export {
  isContributionEvent,
  filterContributionEvents,
  getEventContributionWeight,
  type GitLabEvent,
  type GitLabEventAction,
  type GitLabEventTargetType,
} from "./gitlabEventFilter";
export {
  aggregateEventsByDay,
  mapToContributionDays,
  mapToHistoryPoints,
  filterByDateRange,
  type DailyContribution,
} from "./gitlabAggregator";
