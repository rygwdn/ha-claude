import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to handle HA Ingress path.
 * HA Ingress sets X-Ingress-Path header with the base path for the addon.
 * The frontend needs this to construct correct URLs for API and WebSocket.
 */
export function ingressMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Store ingress path for later use
  const ingressPath = (req.headers["x-ingress-path"] as string) || "";
  (req as unknown as Record<string, string>).ingressPath = ingressPath;
  next();
}
