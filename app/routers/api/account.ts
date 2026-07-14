import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { Router } from "express";

export const accountRouter = Router();

accountRouter.use(requireValidSession);

accountRouter.get("/settings", async (req, res) => {
  const allSettings = await db.accountSetting.findMany();
  const userSettings = await db.accountSettingValue.findMany({
    where: {
      userId: req.session!.user.id,
    },
  });

  return res.json({
    settings: transformers.userAccountSettings(allSettings, userSettings),
  });
});
