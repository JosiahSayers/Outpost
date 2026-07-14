import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { editAccountSettings } from "$/validation/account-settings";
import { Router } from "express";
import validate from "express-zod-safe";

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

accountRouter.patch(
  "/settings",
  validate({ body: editAccountSettings }),
  async (req, res) => {
    await db.$transaction(async (tx) => {
      for (const setting of req.body.settings) {
        const accountSetting = await tx.accountSetting.findUnique({
          where: {
            slug: setting.slug,
          },
        });

        await tx.accountSettingValue.upsert({
          where: {
            accountSettingId_userId: {
              accountSettingId: accountSetting!.id,
              userId: req.session!.user.id,
            },
          },
          create: {
            value: setting.value,
            accountSettingId: accountSetting!.id,
            userId: req.session!.user.id,
          },
          update: {
            value: setting.value,
          },
        });
      }
    });

    return res.sendStatus(200);
  },
);
