// Logic for filtering contribution-relevant GitLab events.

/**
 * GitLab event action types.
 * 
 * TODO: GitLab Events API returns different event types than GitHub's contribution graph
 * TODO: GitHub counts: commits, issues opened, PRs opened/reviewed, discussions
 * TODO: GitLab Events API includes more granular actions but lacks a unified "contribution" concept
 * 
 * @see https://docs.gitlab.com/ee/api/events.html
 */
export type GitLabEventAction =
  | "pushed"
  | "commented"
  | "merged"
  | "joined"
  | "left"
  | "created"
  | "updated"
  | "closed"
  | "reopened"
  | "deleted"
  | "approved"
  | "expired"
  | "accepted"    // MR approval
  | "wiki_page"   // Wiki changes
  | string;       // Allow unknown future event types

/**
 * GitLab event target types.
 */
export type GitLabEventTargetType =
  | "Issue"
  | "MergeRequest"
  | "Milestone"
  | "Note"        // Comments
  | "Project"
  | "Snippet"
  | "User"
  | "WikiPage::Meta"
  | null
  | string;       // Allow unknown future target types

/**
 * Raw GitLab event from the Events API.
 * 
 * TODO: This is a simplified type; GitLab events have more fields
 * TODO: Consider adding project_id, target_id, target_iid for richer data
 */
export type GitLabEvent = {
  id: number;
  actionName: GitLabEventAction;
  targetType: GitLabEventTargetType;
  createdAt: string;  // ISO 8601 datetime
  // TODO: Add author info for cross-referencing
  // TODO: Add push_data for commit counts in push events
  pushData?: {
    commitCount?: number;
    action?: string;
    refType?: string;
    commitTitle?: string;
  };
};

/**
 * Event actions considered as contributions.
 * 
 * TODO: This is subjective - GitHub's contribution graph includes:
 *   - Commits to default branch
 *   - Opening issues
 *   - Opening PRs
 *   - Reviewing PRs
 *   - Proposing PRs
 * 
 * GitLab equivalent mapping:
 *   - pushed → commits
 *   - commented → issue/MR comments (Note target type)
 *   - created → issues, MRs, snippets
 *   - merged → MR merges
 *   - approved → MR approvals
 * 
 * Excluded (not contributions):
 *   - joined/left → membership changes
 *   - updated/closed/reopened → status changes (debatable)
 *   - deleted → destructive actions
 *   - expired → automated actions
 */
const CONTRIBUTION_ACTIONS: Set<GitLabEventAction> = new Set([
  "pushed",
  "commented",
  "created",
  "merged",
  "approved",
  "accepted",
  "wiki_page",
]);

/**
 * Target types to exclude even if action matches.
 * 
 * TODO: "Project" created means user created a new project - include or not?
 * TODO: For now, exclude project/user level events
 */
const EXCLUDED_TARGET_TYPES: Set<GitLabEventTargetType> = new Set([
  "User",
]);

/**
 * Determines if a GitLab event should count as a contribution.
 */
export function isContributionEvent(event: GitLabEvent): boolean {
  // Check if action is a contribution action
  if (!CONTRIBUTION_ACTIONS.has(event.actionName)) {
    return false;
  }

  // Exclude certain target types
  if (event.targetType && EXCLUDED_TARGET_TYPES.has(event.targetType)) {
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

/**
 * Gets the contribution weight for an event.
 * 
 * TODO: Push events can contain multiple commits - should we count each commit?
 * TODO: GitHub counts each commit individually in the contribution graph
 * TODO: For now, we use pushData.commitCount if available, otherwise 1
 * 
 * @returns Number of contributions this event represents
 */
export function getEventContributionWeight(event: GitLabEvent): number {
  // Push events may contain multiple commits
  if (event.actionName === "pushed" && event.pushData?.commitCount) {
    return event.pushData.commitCount;
  }

  // All other contribution events count as 1
  return 1;
}
