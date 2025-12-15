/**
 * GitLab Event Filtering
 * 
 * Filters and weights GitLab events for contribution counting.
 */

import {
  isContributionAction,
  isExcludedTargetType,
  isPushAction,
  type GitLabResponseAction,
  type GitLabTargetType,
} from './gitlabEventTypes';

// ============================================================================
// Event Types
// ============================================================================

/**
 * GitLab event from the Events API (internal camelCase format).
 */
export type GitLabEvent = {
  id: number;
  actionName: GitLabResponseAction;
  targetType: GitLabTargetType;
  createdAt: string;  // ISO 8601 datetime
  pushData?: {
    commitCount?: number;
    action?: string;
    refType?: string;
    commitTitle?: string;
  };
};

// ============================================================================
// Filtering Functions
// ============================================================================

/**
 * Determines if a GitLab event should count as a contribution.
 */
export function isContributionEvent(event: GitLabEvent): boolean {
  // Check if action is a contribution action
  if (!isContributionAction(event.actionName)) {
    return false;
  }

  // Exclude certain target types
  if (isExcludedTargetType(event.targetType)) {
    return false;
  }

  return true;
}

/**
 * Filters an array of GitLab events to only contribution-relevant events.
 */
export function filterContributionEvents(events: GitLabEvent[]): GitLabEvent[] {
  return events.filter(isContributionEvent);
}

// ============================================================================
// Weighting Functions
// ============================================================================

/**
 * Gets the contribution weight for an event.
 * 
 * Push events can contain multiple commits - we count each commit
 * to match GitHub's contribution graph behavior.
 * 
 * @returns Number of contributions this event represents
 */
export function getEventContributionWeight(event: GitLabEvent): number {
  // Push events may contain multiple commits
  if (isPushAction(event.actionName) && event.pushData?.commitCount) {
    return event.pushData.commitCount;
  }

  // All other contribution events count as 1
  return 1;
}
