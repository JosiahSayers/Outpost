import { transformers } from "$/transformers";
import type { ClientBooleanAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { db } from "$/utils/db";
import { logger } from "$/utils/logger";

const PREFIX = "notification_";
const IN_APP_SUFFIX = "_in_app";
const EMAIL_SUFFIX = "_email";

type NotificationType = "in_app" | "email";

async function getAllSettings(
  userId: string,
): Promise<ClientBooleanAccountSetting[]> {
  const settings = await db.accountSetting.findMany({
    where: {
      slug: {
        startsWith: PREFIX,
      },
    },
    include: {
      accountSettingValues: {
        where: {
          userId,
        },
      },
    },
  });

  return settings.map(transformers.booleanUserAccountSetting);
}

async function getSetting(
  userId: string,
  notification: string,
  type: NotificationType,
): Promise<ClientBooleanAccountSetting> {
  const setting = await db.accountSetting.findUnique({
    where: {
      slug: getSlug(notification, type),
    },
    include: {
      accountSettingValues: {
        where: {
          userId,
        },
      },
    },
  });

  if (!setting) {
    logger.error("tried to retrieve unknown notification setting", {
      userId,
      notification,
      type,
    });
    throw new Error("Notification does not exist");
  }

  return transformers.booleanUserAccountSetting(setting);
}

async function updateSetting(
  userId: string,
  notification: string,
  type: NotificationType,
  value: boolean,
): Promise<ClientBooleanAccountSetting> {
  const setting = await db.accountSetting.findUnique({
    where: {
      slug: getSlug(notification, type),
    },
  });

  if (!setting) {
    logger.error("tried to update unknown notification setting", {
      userId,
      notification,
      type,
      value,
    });
    throw new Error("Notification does not exist");
  }

  const updated = await db.accountSettingValue.upsert({
    where: {
      accountSettingId_userId: { accountSettingId: setting.id, userId },
    },
    update: { value: value ? "true" : "false" },
    create: {
      value: value ? "true" : "false",
      accountSettingId: setting.id,
      userId,
    },
  });

  return transformers.booleanUserAccountSetting({
    ...setting,
    accountSettingValues: [updated],
  });
}

function getSuffix(type: NotificationType): string {
  switch (type) {
    case "email":
      return EMAIL_SUFFIX;
    case "in_app":
      return IN_APP_SUFFIX;
  }
}

function getSlug(notification: string, type: NotificationType): string {
  return `${PREFIX}${notification}${getSuffix(type)}`;
}

export const Notifications = {
  getAllSettings,
  getSetting,
  updateSetting,
  getSlug,
};
