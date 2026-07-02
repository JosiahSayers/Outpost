import indexPage from "$/frontend/index.html";
import { Router } from "express";
import { Readable } from "node:stream";

export const frontendRouter = Router();

const bunPort = Number(Bun.env.PORT) + 1;
Bun.serve({
  port: bunPort,
  routes: {
    "/*": indexPage,
  },
  development: Bun.env.NODE_ENV === "development",
});

frontendRouter.use("{*path}", async (req, res) => {
  const url = `http://127.0.0.1:${bunPort}${req.originalUrl}`;

  const bunResponse = await fetch(url);
  res.setHeaders(bunResponse.headers);
  Readable.fromWeb(bunResponse.body! as any).pipe(res);
});
