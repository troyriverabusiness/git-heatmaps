/**
 * GitLab Event Aggregation
 * 
 * Aggregates GitLab events into daily contribution counts.
 */

import type { ContributionDay, ContributionHistoryPoint } from '../../domain/contributions';
import { filterContributionEvents, getEventContributionWeight, type GitLabEvent } from './gitlabEventFilter';

// ============================================================================
// Types
// ============================================================================

/**
 * Aggregated daily contribution data.
 */
export type DailyContribution = {
  date: string;   // YYYY-MM-DD
  count: number;
  source: 'gitlab';
};

// ============================================================================
// Aggregation
// ============================================================================

/**
 * Aggregates GitLab events into daily contribution counts.
 * 
 * @param events - Raw GitLab events (will be filtered for contributions)
 * @returns Array of daily contributions sorted by date ascending
 */
export function aggregateEventsByDay(events: GitLabEvent[]): DailyContribution[] {
  // Filter to only contribution events
  const contributionEvents = filterContributionEvents(events);
  console.log(`[gitlab-aggregator] Events after contribution filter: ${contributionEvents.length}/${events.length}`);

  // Log event type breakdown for debugging
  logEventBreakdown(events);

  // Aggregate by date
  const dailyMap = new Map<string, number>();

  for (const event of contributionEvents) {
    const date = extractDate(event.createdAt);
    const weight = getEventContributionWeight(event);
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + weight);
  }

  // Convert to sorted array
  const result: DailyContribution[] = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count, source: 'gitlab' as const }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Log daily breakdown
  console.log(`[gitlab-aggregator] Daily contributions:`, result.map(d => `${d.date}: ${d.count}`).join(', '));

  return result;
}

// ============================================================================
// Mapping Functions
// ============================================================================

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

// ============================================================================
// Filtering
// ============================================================================

/**
 * Filters daily contributions to a date range (inclusive).
 */
export function filterByDateRange(
  contributions: DailyContribution[],
  fromDateIso?: string,
  toDateIso?: string,
): DailyContribution[] {
  return contributions.filter(dc => {
    if (fromDateIso && dc.date < fromDateIso) return false;
    if (toDateIso && dc.date > toDateIso) return false;
    return true;
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO 8601 datetime string.
 */
function extractDate(isoDatetime: string): string {
  return isoDatetime.split('T')[0];
}

/**
 * Logs event breakdown for debugging.
 */
function logEventBreakdown(events: GitLabEvent[]): void {
  if (events.length === 0) return;

  // Count by action:targetType
  const actionCounts = new Map<string, number>();
  for (const event of events) {
    const key = `${event.actionName}:${event.targetType ?? 'null'}`;
    actionCounts.set(key, (actionCounts.get(key) ?? 0) + 1);
  }
  console.log(`[gitlab-aggregator] Event breakdown:`, Object.fromEntries(actionCounts));

  // Log date range
  const dates = events.map(e => extractDate(e.createdAt)).sort();
  console.log(`[gitlab-aggregator] Event date range: ${dates[0]} to ${dates[dates.length - 1]}`);
}
