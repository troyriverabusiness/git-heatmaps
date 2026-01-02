import type { Provider } from "./provider";

// Domain types shared across sources, services, and render.

export type ContributionDay = {
  dateIso: string;
  count: number;
  /** GitHub contribution count for this day (optional, used by "default" theme) */
  githubCount?: number;
  /** GitLab contribution count for this day (optional, used by "default" theme) */
  gitlabCount?: number;
};

export type ContributionHistoryPoint = {
  dateIso: string;
  count: number;
};

export type ContributionQuery = {
  provider: Provider;
  user: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
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


