import { requireAdminRole } from "$/middleware/authorization/require-admin-role";
import { requireValidSession } from "$/middleware/require-valid-session";
import { bullBoardRouter } from "$/routers/admin/bull-board";
import { adminUserRouter } from "$/routers/admin/user";
import { Router } from "express";

export const adminRouter = Router();

adminRouter.use(requireValidSession, requireAdminRole);

adminRouter.use("/queues", bullBoardRouter);

adminRouter.use("/users", adminUserRouter);
