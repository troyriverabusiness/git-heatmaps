// Low-level GraphQL HTTP client for GitHub API.

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export type GitHubClientConfig = {
  token: string;
  // TODO: Add baseUrl override for GitHub Enterprise support
  // TODO: Add timeout configuration
  // TODO: Add retry policy configuration
};

export type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
    type?: string;
    path?: string[];
    locations?: Array<{ line: number; column: number }>;
  }>;
};

export type GitHubClient = {
  query<T>(graphql: string, variables?: Record<string, unknown>): Promise<GraphQlResponse<T>>;
};

/**
 * Creates a low-level GitHub GraphQL client.
 * 
 * TODO: Add proper error handling for network failures
 * TODO: Add rate limit handling (check X-RateLimit-* headers)
 * TODO: Add request/response logging for debugging
 */
export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
  const { token } = config;

  return {
    async query<T>(graphql: string, variables?: Record<string, unknown>): Promise<GraphQlResponse<T>> {
      // TODO: Validate token is present before making request
      
      const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "User-Agent": "git-heatmaps",
        },
        body: JSON.stringify({
          query: graphql,
          variables,
        }),
      });

      // TODO: Handle non-200 responses (401 unauthorized, 403 rate limited, etc.)
      // TODO: Parse rate limit headers and expose them
      
      const json = await response.json() as GraphQlResponse<T>;
      
      return json;
    },
  };
}
