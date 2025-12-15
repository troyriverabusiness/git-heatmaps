import type { Provider } from "./provider";

// Domain types shared across sources, services, and render.

export type ContributionDay = {
  dateIso: string; // TODO: Decide if this should be a Date or ISO string; keep string for transport simplicity.
  count: number;
};

export type ContributionHistoryPoint = {
  dateIso: string;
  count: number;
};

export type ContributionQuery = {
  provider: Provider;
  user: string;

  // TODO: Support org/project scoping where applicable (GitLab groups, GitHub orgs).
  fromDateIso?: string;
  toDateIso?: string;
};

export type ContributionData = {
  provider: Provider;
  user: string;
  days: ContributionDay[];
};

export type ContributionHistory = {
  provider: Provider;
  user: string;
  points: ContributionHistoryPoint[];
};


