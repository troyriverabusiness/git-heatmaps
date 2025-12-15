// Aggregate GitLab events into daily contribution counts.

import type { ContributionDay, ContributionHistoryPoint } from "../../domain/contributions";
import { filterContributionEvents, getEventContributionWeight, type GitLabEvent } from "./gitlabEventFilter";

/**
 * Aggregated daily contribution data.
 */
export type DailyContribution = {
  date: string;   // YYYY-MM-DD
  count: number;
  source: "gitlab";
};

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO 8601 datetime string.
 */
function extractDateFromIso(isoDatetime: string): string {
  // GitLab returns dates like "2024-01-15T10:30:00.000Z"
  // We want just "2024-01-15"
  return isoDatetime.split("T")[0];
}

/**
 * Aggregates GitLab events into daily contribution counts.
 * 
 * TODO: GitLab Events API limitations vs GitHub:
 *   - Events API only returns last 90 days of events (GitHub GraphQL can go back further)
 *   - Events are paginated with max 100 per page (need multiple requests)
 *   - No direct "contribution calendar" equivalent in GitLab API
 *   - Push events may contain multiple commits (handled via pushData.commitCount)
 *   - Event timestamps are in UTC (may need timezone adjustment for accurate daily counts)
 * 
 * @param events - Raw GitLab events (will be filtered for contributions)
 * @returns Array of daily contributions sorted by date ascending
 */
export function aggregateEventsByDay(events: GitLabEvent[]): DailyContribution[] {
  // Filter to only contribution events
  const contributionEvents = filterContributionEvents(events);

  // Aggregate by date
  const dailyMap = new Map<string, number>();

  for (const event of contributionEvents) {
    const date = extractDateFromIso(event.createdAt);
    const weight = getEventContributionWeight(event);
    const current = dailyMap.get(date) || 0;
    dailyMap.set(date, current + weight);
  }

  // Convert to array and sort by date
  const result: DailyContribution[] = [];
  for (const [date, count] of dailyMap) {
    result.push({
      date,
      count,
      source: "gitlab",
    });
  }

  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * Maps aggregated daily contributions to domain ContributionDay format.
 */
export function mapToContributionDays(dailyContributions: DailyContribution[]): ContributionDay[] {
  return dailyContributions.map(dc => ({
    dateIso: dc.date,
    count: dc.count,
  }));
}

/**
 * Maps aggregated daily contributions to domain ContributionHistoryPoint format.
 */
export function mapToHistoryPoints(dailyContributions: DailyContribution[]): ContributionHistoryPoint[] {
  return dailyContributions.map(dc => ({
    dateIso: dc.date,
    count: dc.count,
  }));
}

/**
 * Filters daily contributions to a date range.
 * 
 * @param contributions - Array of daily contributions
 * @param fromDateIso - Optional start date (inclusive, YYYY-MM-DD)
 * @param toDateIso - Optional end date (inclusive, YYYY-MM-DD)
 */
export function filterByDateRange(
  contributions: DailyContribution[],
  fromDateIso?: string,
  toDateIso?: string
): DailyContribution[] {
  return contributions.filter(dc => {
    if (fromDateIso && dc.date < fromDateIso) {
      return false;
    }
    if (toDateIso && dc.date > toDateIso) {
      return false;
    }
    return true;
  });
}
