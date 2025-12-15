import type { Request } from "express";

import type { Provider } from "../domain/provider";
import type { ContributionQuery } from "../domain/contributions";
import { badRequest } from "../utils/appError";

export type HeatmapRequest = ContributionQuery & {
  // TODO: Add rendering options (theme, cellSize, padding, label visibility, etc).
};

export type HistoryRequest = ContributionQuery & {
  // TODO: Add rendering options (width/height, smoothing, moving avg, etc).
};

function parseProvider(value: unknown): Provider {
  if (value === "github" || value === "gitlab") return value;
  throw badRequest("Invalid provider. Expected 'github' or 'gitlab'.");
}

function parseUser(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  throw badRequest("Missing or invalid user.");
}

function parseOptionalIsoDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;

  // TODO: Add strict ISO-8601 validation + normalization. Keep permissive for skeleton.
  return value.trim();
}

export function parseHeatmapRequest(req: Request): HeatmapRequest {
  return {
    provider: parseProvider(req.query.provider),
    user: parseUser(req.query.user),
    fromDateIso: parseOptionalIsoDate(req.query.fromDateIso),
    toDateIso: parseOptionalIsoDate(req.query.toDateIso)
  };
}

export function parseHistoryRequest(req: Request): HistoryRequest {
  return {
    provider: parseProvider(req.query.provider),
    user: parseUser(req.query.user),
    fromDateIso: parseOptionalIsoDate(req.query.fromDateIso),
    toDateIso: parseOptionalIsoDate(req.query.toDateIso)
  };
}


