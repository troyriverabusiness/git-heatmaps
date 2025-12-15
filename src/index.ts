import { createServer } from "./server/createServer";
import { createRouter } from "./server/router";

import { createHeatmapController } from "./api/heatmapController";
import { createHistoryController } from "./api/historyController";

import { createContributionsService } from "./services/contributionsService";

import { createGitHubContributionsSource } from "./sources/github/githubSource";
import { createGitLabContributionsSource } from "./sources/gitlab/gitlabSource";

import { createSvgRenderer } from "./render/svgRenderer";
import { createCache } from "./cache/cache";

const port = Number(process.env.PORT ?? "3000");

// Composition root. All concrete implementations are wired here.
const cache = createCache();
const svgRenderer = createSvgRenderer();
const githubSource = createGitHubContributionsSource();
const gitlabSource = createGitLabContributionsSource();

const contributionsService = createContributionsService({
  cache,
  svgRenderer,
  githubSource,
  gitlabSource
});

const heatmapController = createHeatmapController({ contributionsService });
const historyController = createHistoryController({ contributionsService });

const router = createRouter({
  heatmapController,
  historyController
});

const app = createServer({ router });

app.listen(port, () => {
  console.log(`[server] listening on :${port}`);
});


