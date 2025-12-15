import type { ContributionsSource } from "../contributionsSource";
import type { ContributionQuery, ContributionData, ContributionHistory } from "../../domain/contributions";
import { createGitHubService, type GitHubService } from "./githubService";

export type CreateGitHubContributionsSourceArgs = {
  token: string;
  // TODO: Add baseUrl for GitHub Enterprise support
  // TODO: Add rate limit policy configuration
};

/**
 * Creates a GitHub contributions source that implements the ContributionsSource interface.
 * This is the integration point between the source abstraction and the GitHub-specific service.
 * 
 * TODO: Add environment variable fallback for token
 * TODO: Add token validation
 */
export function createGitHubContributionsSource(
  args: CreateGitHubContributionsSourceArgs
): ContributionsSource {
  const service: GitHubService = createGitHubService({
    token: args.token,
  });

  return {
    provider: "github",
    
    async fetchContributionData(query: ContributionQuery): Promise<ContributionData> {
      return service.fetchContributionData(query);
    },
    
    async fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory> {
      return service.fetchContributionHistory(query);
    },
  };
}


