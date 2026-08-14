import { requireAdminMfaEnrolled } from "$/middleware/authorization/require-admin-mfa-enrolled";
import { requireAdminRole } from "$/middleware/authorization/require-admin-role";
import { requireValidSession } from "$/middleware/require-valid-session";
import { bullBoardRouter } from "$/routers/admin/bull-board";
import { adminDashboardRouter } from "$/routers/admin/dashboard";
import { adminFeaturesRouter } from "$/routers/admin/features";
import { adminFeedbackRouter } from "$/routers/admin/feedback";
import { adminMealsRouter } from "$/routers/admin/meals";
import { adminUserRouter } from "$/routers/admin/user";
import { Router } from "express";

export const adminRouter = Router();

adminRouter.use(requireValidSession, requireAdminRole, requireAdminMfaEnrolled);

adminRouter.use("/queues", bullBoardRouter);
adminRouter.use("/users", adminUserRouter);
adminRouter.use("/dashboard", adminDashboardRouter);
adminRouter.use("/feedback", adminFeedbackRouter);
adminRouter.use("/meals", adminMealsRouter);
adminRouter.use("/features", adminFeaturesRouter);
