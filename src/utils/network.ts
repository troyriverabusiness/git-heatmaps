import { Response } from "express";

function setSVGHeaders(res: Response) {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader("Referrer-Policy", "no-referrer");
}

export function sendSVGResponse(res: Response, svg: string) {
    setSVGHeaders(res);
    res.send(svg);
}