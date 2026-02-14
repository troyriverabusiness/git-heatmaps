import { createServer } from "./server/createServer";
import { createRouter } from "./server/router";

import { createHeatmapController } from "./api/heatmapController";
import { createHistoryController } from "./api/historyController";
import { createArtController } from "./api/artController";

import { createContributionService } from "./services/contributionService";
import { createMemoryCache } from "./cache";

import { createGitHubService } from "./sources/github/githubService";
import { createGitLabService } from "./sources/gitlab/gitlabService";

const port = Number(process.env.PORT ?? "3000");

// Composition root. All concrete implementations are wired here.
// Services are created without default tokens and use per-request tokens from query parameters.
const githubService = createGitHubService({});

const gitlabService = createGitLabService({
  baseUrl: process.env.GITLAB_BASE_URL,
});

// Create cache with 5 minute default TTL
const cache = createMemoryCache({ defaultTtlMs: 5 * 60 * 1000 });

// Log available services at startup
console.log(`[config] GitHub service: enabled (token-per-request mode)`);
console.log(`[config] GitLab service: enabled (token-per-request mode)`);
console.log(`[config] Memory cache: enabled`);
if (process.env.GITLAB_BASE_URL) {
  console.log(`[config] GitLab base URL: ${process.env.GITLAB_BASE_URL}`);
}

const contributionService = createContributionService({
  githubService,
  gitlabService,
  cache,
});

// Controllers are "included routers" that handle the request and response.
const heatmapController = createHeatmapController({ contributionService });
const historyController = createHistoryController({ contributionService });
const artController = createArtController();

// Router is a composition root for the application. It encapsulates the controllers and the routes.
const router = createRouter({
  heatmapController,
  historyController,
  artController,
});

// Server is created with the router.
const app = createServer({ router });

app.listen(port, () => {
  console.log(`[server] listening on :${port}`);
});
