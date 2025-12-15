// Maps GitHub API responses to domain models.

import type { ContributionDay, ContributionData, ContributionHistoryPoint, ContributionHistory } from "../../domain/contributions";

// GitHub API response types for contribution calendar

export type GitHubContributionDay = {
  date: string; // YYYY-MM-DD format
  contributionCount: number;
};

export type GitHubContributionWeek = {
  contributionDays: GitHubContributionDay[];
};

export type GitHubContributionCalendar = {
  totalContributions: number;
  weeks: GitHubContributionWeek[];
};

export type GitHubContributionsCollection = {
  contributionCalendar: GitHubContributionCalendar;
};

export type GitHubUser = {
  contributionsCollection: GitHubContributionsCollection;
};

export type GitHubContributionCalendarResponse = {
  user: GitHubUser | null;
};

/**
 * Maps a single GitHub contribution day to domain ContributionDay.
 */
export function mapContributionDay(day: GitHubContributionDay): ContributionDay {
  return {
    dateIso: day.date,
    count: day.contributionCount,
  };
}

/**
 * Maps GitHub contribution calendar response to domain ContributionData.
 * Flattens the weeks/days structure into a single array of days.
 */
export function mapContributionData(
  response: GitHubContributionCalendarResponse,
  user: string
): ContributionData {
  const days: ContributionDay[] = [];

  if (response.user?.contributionsCollection?.contributionCalendar?.weeks) {
    for (const week of response.user.contributionsCollection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        days.push(mapContributionDay(day));
      }
    }
  }

  // Sort by date ascending for consistent output
  days.sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  return {
    provider: "github",
    user,
    days,
  };
}

/**
 * Maps GitHub contribution calendar response to domain ContributionHistory.
 * ContributionHistory is essentially the same data as ContributionData
 * but typed as history points for time-series operations.
 */
export function mapContributionHistory(
  response: GitHubContributionCalendarResponse,
  user: string
): ContributionHistory {
  const points: ContributionHistoryPoint[] = [];

  if (response.user?.contributionsCollection?.contributionCalendar?.weeks) {
    for (const week of response.user.contributionsCollection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        points.push({
          dateIso: day.date,
          count: day.contributionCount,
        });
      }
    }
  }

  // Sort by date ascending for consistent output
  points.sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  return {
    provider: "github",
    user,
    points,
  };
}
