// GraphQL query strings for GitHub API.
// Keep queries here to avoid inline strings in logic files.

/**
 * Query to fetch the contribution calendar for a user.
 * Returns contribution data for the past year by default.
 * 
 * Variables:
 * - $username: String! - GitHub username
 * - $from: DateTime - Start date (optional, defaults to ~1 year ago)
 * - $to: DateTime - End date (optional, defaults to now)
 */
export const contributionCalendarQuery = `
  query ContributionCalendar($username: String!, $from: DateTime, $to: DateTime) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;
