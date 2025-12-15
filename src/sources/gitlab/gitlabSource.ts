import type { ContributionsSource } from "../contributionsSource";
import type { ContributionQuery, ContributionData, ContributionHistory } from "../../domain/contributions";
import { createGitLabService, type GitLabServiceConfig } from "./gitlabService";

export type CreateGitLabContributionsSourceArgs = {
  token?: string;
  baseUrl?: string;
  // TODO: Add pagination policy configuration
  // TODO: Add caching configuration (when caching layer is added)
};

/**
 * Creates a GitLab contributions source.
 * 
 * TODO: LRZ GitLab (gitlab.lrz.de) specifics:
 *   - May require LDAP authentication for private profiles
 *   - External users use "Standard" login via GitInvited
 *   - Rate limits may differ from gitlab.com
 * 
 * TODO: Add auth validation before first request
 * TODO: Add retry logic for transient failures
 */
export function createGitLabContributionsSource(
  args: CreateGitLabContributionsSourceArgs = {}
): ContributionsSource {
  const serviceConfig: GitLabServiceConfig = {
    token: args.token,
    baseUrl: args.baseUrl,
  };

  const service = createGitLabService(serviceConfig);

  return {
    provider: "gitlab",

    async fetchContributionData(query: ContributionQuery): Promise<ContributionData> {
      return service.fetchContributionData(query);
    },

    async fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory> {
      return service.fetchContributionHistory(query);
    },
  };
}


