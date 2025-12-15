import type { ContributionsSource } from "../contributionsSource";
import type { ContributionQuery, ContributionData, ContributionHistory } from "../../domain/contributions";
import { notImplemented } from "../../utils/appError";

type CreateGitHubContributionsSourceArgs = {
  // TODO: Inject HTTP client, auth token provider, baseUrl, and rate limit policy.
};

export function createGitHubContributionsSource(
  _args: CreateGitHubContributionsSourceArgs = {}
): ContributionsSource {
  return {
    provider: "github",
    async fetchContributionData(_query: ContributionQuery): Promise<ContributionData> {
      // TODO: Fetch contribution calendar / events from GitHub.
      throw notImplemented("GitHub contribution fetching is not implemented yet.");
    },
    async fetchContributionHistory(_query: ContributionQuery): Promise<ContributionHistory> {
      // TODO: Fetch time-series contribution history from GitHub.
      throw notImplemented("GitHub history fetching is not implemented yet.");
    }
  };
}


