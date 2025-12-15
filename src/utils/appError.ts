export type AppErrorCode =
  | "badRequest"
  | "notImplemented"
  | "upstreamError"
  | "internalError";

export type AppError = {
  name: "AppError";
  code: AppErrorCode;
  message: string;
  statusCode: number;
  cause?: unknown;
};

export function isAppError(err: unknown): err is AppError {
  if (!err || typeof err !== "object") return false;
  return (err as { name?: unknown }).name === "AppError";
}

function createAppError(args: Omit<AppError, "name">): AppError {
  return { name: "AppError", ...args };
}

export function badRequest(message: string, cause?: unknown): AppError {
  return createAppError({ code: "badRequest", message, statusCode: 400, cause });
}

export function notImplemented(message: string, cause?: unknown): AppError {
  return createAppError({ code: "notImplemented", message, statusCode: 501, cause });
}

export function upstreamError(message: string, cause?: unknown): AppError {
  return createAppError({ code: "upstreamError", message, statusCode: 502, cause });
}


