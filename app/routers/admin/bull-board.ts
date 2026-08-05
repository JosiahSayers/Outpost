import { registry } from "$/jobs/registry";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Router } from "express";

export const bullBoardRouter = Router();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: registry.map(
    (job) => new BullMQAdapter(job.queue, { delimiter: "__" }),
  ),
  serverAdapter: serverAdapter,
  options: {
    uiConfig: {
      sortQueues: true,
      overview: {
        groupByDelimiter: true,
      },
    },
  },
});

bullBoardRouter.use("/", serverAdapter.getRouter());
