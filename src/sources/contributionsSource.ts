import type { ContributionData, ContributionHistory, ContributionQuery } from "../domain/contributions";
import type { Provider } from "../domain/provider";

export type ContributionsSource = {
  provider: Provider;
  fetchContributionData(query: ContributionQuery): Promise<ContributionData>;
  fetchContributionHistory(query: ContributionQuery): Promise<ContributionHistory>;
};


