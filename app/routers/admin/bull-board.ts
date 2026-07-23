import { allQueues } from "$/jobs/queues";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Router } from "express";

export const bullBoardRouter = Router();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: allQueues.map(
    (queue) => new BullMQAdapter(queue, { delimiter: "__" }),
  ),
  serverAdapter: serverAdapter,
});

bullBoardRouter.use("/", serverAdapter.getRouter());
