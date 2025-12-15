// Low-level REST client for GitLab API.

// LRZ GitLab instance base URL
const DEFAULT_GITLAB_BASE_URL = "https://gitlab.lrz.de";

export type GitLabClientConfig = {
  token?: string;
  baseUrl?: string;
  // TODO: Add timeout configuration
  // TODO: Add retry policy configuration
};

export type GitLabPaginationInfo = {
  page: number;
  perPage: number;
  totalPages?: number;
  total?: number;
  nextPage?: number;
};

export type GitLabResponse<T> = {
  data: T;
  pagination: GitLabPaginationInfo;
};

export type GitLabClient = {
  get<T>(path: string, params?: Record<string, string | number>): Promise<GitLabResponse<T>>;
};

/**
 * Creates a low-level GitLab REST client.
 * 
 * TODO: GitLab uses REST API while GitHub uses GraphQL - different pagination models
 * TODO: GitLab rate limits are typically more restrictive for unauthenticated requests
 * TODO: Add proper error handling for network failures
 * TODO: Add rate limit handling (check RateLimit-* headers)
 * TODO: Add request/response logging for debugging
 * TODO: Consider implementing automatic pagination handling
 */
export function createGitLabClient(config: GitLabClientConfig = {}): GitLabClient {
  const { token, baseUrl = DEFAULT_GITLAB_BASE_URL } = config;

  return {
    async get<T>(path: string, params?: Record<string, string | number>): Promise<GitLabResponse<T>> {
      const url = new URL(`/api/v4${path}`, baseUrl);
      
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, String(value));
        }
      }

      const headers: Record<string, string> = {
        "Accept": "application/json",
        "User-Agent": "git-heatmaps",
      };

      // TODO: Token is optional for public profiles, but required for private data
      // TODO: GitLab supports both Personal Access Tokens and OAuth tokens
      if (token) {
        headers["PRIVATE-TOKEN"] = token;
      }

      console.log(`[gitlab-client] GET ${url.pathname}${url.search}`);
      
      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
      });

      console.log(`[gitlab-client] Response: ${response.status} ${response.statusText}`);

      // Handle non-200 responses
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[gitlab-client] Error response body: ${errorBody}`);
        throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as T;

      // Parse pagination headers
      // TODO: GitLab pagination uses Link headers and X-* headers
      const pagination: GitLabPaginationInfo = {
        page: parseInt(response.headers.get("X-Page") || "1", 10),
        perPage: parseInt(response.headers.get("X-Per-Page") || "20", 10),
        totalPages: response.headers.get("X-Total-Pages") 
          ? parseInt(response.headers.get("X-Total-Pages")!, 10) 
          : undefined,
        total: response.headers.get("X-Total")
          ? parseInt(response.headers.get("X-Total")!, 10)
          : undefined,
        nextPage: response.headers.get("X-Next-Page")
          ? parseInt(response.headers.get("X-Next-Page")!, 10)
          : undefined,
      };

      return { data, pagination };
    },
  };
}
