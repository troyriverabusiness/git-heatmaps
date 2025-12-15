import type { ContributionsSource } from "../contributionsSource";
import type { ContributionQuery, ContributionData, ContributionHistory } from "../../domain/contributions";
import { notImplemented } from "../../utils/appError";

type CreateGitLabContributionsSourceArgs = {
  // TODO: Inject HTTP client, auth token provider, baseUrl, and pagination policy.
};

export function createGitLabContributionsSource(
  _args: CreateGitLabContributionsSourceArgs = {}
): ContributionsSource {
  return {
    provider: "gitlab",
    async fetchContributionData(_query: ContributionQuery): Promise<ContributionData> {
      // TODO: Fetch contribution events from GitLab API.
      throw notImplemented("GitLab contribution fetching is not implemented yet.");
    },
    async fetchContributionHistory(_query: ContributionQuery): Promise<ContributionHistory> {
      // TODO: Fetch time-series contribution history from GitLab.
      throw notImplemented("GitLab history fetching is not implemented yet.");
    }
  };
}


