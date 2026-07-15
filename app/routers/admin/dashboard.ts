import { getStat, statSort } from "$/utils/admin/stats";
import { statParam } from "$/validation/admin/dashboard";
import { Router } from "express";
import validate from "express-zod-safe";

export const adminDashboardRouter = Router();

adminDashboardRouter.get("/stats", async (req, res) => {
  return res.json({ statsWithSortPosition: statSort });
});

adminDashboardRouter.get(
  "/stats/:stat",
  validate({ params: statParam }),
  async (req, res) => {
    return res.json({ stat: await getStat(req.params.stat) });
  },
);
