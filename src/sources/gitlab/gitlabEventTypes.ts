/**
 * GitLab Event Types Configuration
 * 
 * Centralizes all GitLab event type definitions and mappings.
 * 
 * Key insight: GitLab API has two different naming conventions:
 * 1. API Query Parameters (action=X): 'pushed', 'commented', 'merged', etc.
 * 2. Response Action Names: 'pushed to', 'pushed new', 'commented on', 'opened', etc.
 * 
 * This file maps between them and defines which events count as contributions.
 */

// ============================================================================
// API Query Actions
// ============================================================================

/**
 * Actions to query from the GitLab Events API.
 * 
 * GitLab's API has a quirk: without specifying an action parameter,
 * it doesn't reliably return all event types. We must fetch each
 * action type separately and deduplicate by event ID.
 * 
 * @see https://docs.gitlab.com/ee/api/events.html
 */
export const GITLAB_API_ACTIONS = [
  'pushed',     // Code pushes (commits)
  'commented',  // Comments on issues, MRs, commits
  'merged',     // Merge request merges
  'approved',   // MR approvals
  'created',    // Issues, MRs, snippets created
] as const;

export type GitLabApiAction = typeof GITLAB_API_ACTIONS[number];

// ============================================================================
// Response Action Names
// ============================================================================

/**
 * Action names as they appear in API responses.
 * These differ from the query parameters.
 */
export type GitLabResponseAction =
  // Push variants
  | 'pushed'
  | 'pushed to'      // Push to existing branch
  | 'pushed new'     // Push creating new branch
  // Comment variants
  | 'commented'
  | 'commented on'   // Comments on various targets (DiffNote, DiscussionNote, Note)
  // Creation variants
  | 'created'
  | 'opened'         // Issues, MRs, WorkItems opened
  // Merge/approval variants
  | 'merged'
  | 'approved'
  | 'accepted'       // MR accepted/merged
  // Other
  | 'wiki_page'
  // Non-contribution actions (for reference)
  | 'joined'
  | 'left'
  | 'updated'
  | 'closed'
  | 'reopened'
  | 'deleted'
  | 'expired'
  | string;          // Allow unknown future types

// ============================================================================
// Contribution Filtering
// ============================================================================

/**
 * Response action names that count as contributions.
 * 
 * Mapping to GitHub's contribution graph:
 * - pushed/pushed to/pushed new → Commits to default branch
 * - commented/commented on → Issue/MR comments
 * - created/opened → Opening issues/PRs
 * - merged/accepted → Merging PRs
 * - approved → Reviewing PRs
 */
export const CONTRIBUTION_ACTION_NAMES = new Set<GitLabResponseAction>([
  // Push events (commits)
  'pushed',
  'pushed to',
  'pushed new',
  // Comment events
  'commented',
  'commented on',
  // Creation events
  'created',
  'opened',
  // Merge/approval events
  'merged',
  'approved',
  'accepted',
  // Other contribution types
  'wiki_page',
]);

/**
 * Push action names that may contain multiple commits.
 */
export const PUSH_ACTION_NAMES = new Set<GitLabResponseAction>([
  'pushed',
  'pushed to',
  'pushed new',
]);

/**
 * Checks if an action name represents a push event.
 */
export function isPushAction(actionName: string): boolean {
  return PUSH_ACTION_NAMES.has(actionName as GitLabResponseAction);
}

/**
 * Checks if an action name counts as a contribution.
 */
export function isContributionAction(actionName: string): boolean {
  return CONTRIBUTION_ACTION_NAMES.has(actionName as GitLabResponseAction);
}

// ============================================================================
// Target Type Filtering
// ============================================================================

/**
 * GitLab event target types.
 */
export type GitLabTargetType =
  | 'Issue'
  | 'MergeRequest'
  | 'Milestone'
  | 'Note'
  | 'DiffNote'
  | 'DiscussionNote'
  | 'Project'
  | 'Snippet'
  | 'User'
  | 'WorkItem'
  | 'WikiPage::Meta'
  | null
  | string;

/**
 * Target types to exclude from contribution counts.
 */
export const EXCLUDED_TARGET_TYPES = new Set<GitLabTargetType>([
  'User',  // User profile changes, not code contributions
]);

/**
 * Checks if a target type should be excluded.
 */
export function isExcludedTargetType(targetType: GitLabTargetType): boolean {
  return targetType !== null && EXCLUDED_TARGET_TYPES.has(targetType);
}

// ============================================================================
// Pagination Settings
// ============================================================================

/**
 * Default pagination settings for GitLab API.
 */
export const GITLAB_PAGINATION = {
  /** Maximum items per page (GitLab's limit is 100) */
  PER_PAGE: 100,
  /** Maximum pages to fetch per action type (safety limit) */
  MAX_PAGES: 50,
  /** Total event limit: PER_PAGE * MAX_PAGES * ACTIONS = 25,000 events */
} as const;

