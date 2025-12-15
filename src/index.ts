import { createServer } from "./server/createServer";
import { createRouter } from "./server/router";

import { createHeatmapController } from "./api/heatmapController";
import { createHistoryController } from "./api/historyController";

import {
  createContributionService,
  createContributionServiceConfigFromEnv,
} from "./services/contributionService";

import { createGitHubService } from "./sources/github/githubService";
import { createGitLabService } from "./sources/gitlab/gitlabService";

const port = Number(process.env.PORT ?? "3000");

// Composition root. All concrete implementations are wired here.
const config = createContributionServiceConfigFromEnv();

// Create services based on configuration
const githubService = config.enableGitHub && process.env.GITHUB_TOKEN
  ? createGitHubService({ token: process.env.GITHUB_TOKEN })
  : undefined;

const gitlabService = config.enableGitLab
  ? createGitLabService({
      token: process.env.GITLAB_TOKEN,
      baseUrl: process.env.GITLAB_BASE_URL,
    })
  : undefined;

const contributionService = createContributionService({
  githubService,
  gitlabService,
  config,
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


