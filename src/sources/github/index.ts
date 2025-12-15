// Re-exports for GitHub source module.

export { createGitHubContributionsSource } from "./githubSource";
export { createGitHubService, type GitHubService, type GitHubServiceConfig } from "./githubService";
export { createGitHubClient, type GitHubClient, type GitHubClientConfig, type GraphQlResponse } from "./githubClient";
export { contributionCalendarQuery } from "./githubQueries";
export {
  mapContributionData,
  mapContributionHistory,
  mapContributionDay,
  type GitHubContributionCalendarResponse,
  type GitHubContributionDay,
  type GitHubContributionWeek,
  type GitHubContributionCalendar,
} from "./githubMapper";
