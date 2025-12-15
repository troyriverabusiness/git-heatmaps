import { createServer } from "./server/createServer";
import { createRouter } from "./server/router";

import { createHeatmapController } from "./api/heatmapController";
import { createHistoryController } from "./api/historyController";

import { createContributionService } from "./services/contributionService";
import { createMemoryCache } from "./cache";

import { createGitHubService } from "./sources/github/githubService";
import { createGitLabService } from "./sources/gitlab/gitlabService";

const port = Number(process.env.PORT ?? "3000");

// Composition root. All concrete implementations are wired here.
// Services are created if their tokens are available.
// GitHub requires a token (GraphQL API), GitLab can work without one (REST API).
const githubService = process.env.GITHUB_TOKEN
  ? createGitHubService({ token: process.env.GITHUB_TOKEN })
  : undefined;

const gitlabService = createGitLabService({
  token: process.env.GITLAB_TOKEN,
  baseUrl: process.env.GITLAB_BASE_URL,
});

// Create cache with 5 minute default TTL
const cache = createMemoryCache({ defaultTtlMs: 5 * 60 * 1000 });

// Log available services at startup
console.log(`[config] GitHub service: ${githubService ? "enabled" : "disabled (no GITHUB_TOKEN)"}`);
console.log(`[config] GitLab service: enabled${process.env.GITLAB_TOKEN ? "" : " (unauthenticated)"}`);
console.log(`[config] Memory cache: enabled`);
if (process.env.GITLAB_BASE_URL) {
  console.log(`[config] GitLab base URL: ${process.env.GITLAB_BASE_URL}`);
}

const contributionService = createContributionService({
  githubService,
  gitlabService,
  cache,
});

const heatmapController = createHeatmapController({ contributionService });
const historyController = createHistoryController({ contributionService });

const router = createRouter({
  heatmapController,
  historyController,
});

const app = createServer({ router });

app.listen(port, () => {
  console.log(`[server] listening on :${port}`);
});
