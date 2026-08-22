import type { AccountSettingInput } from "$/frontend/utils/api/account-settings";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { Notifications } from "$/utils/notifications";

// Called when the user flips the master push switch on: every notification
// that already reaches them via in-app or email gets push turned on too, so
// enabling push "just works" without a second trip through every card below.
// A notification the user has fully turned off (both in-app and email) is
// left alone -- its push setting isn't forced on, respecting that choice.
export function computeDefaultPushSettingUpdates(
  settings: ClientUserAccountSetting[],
): AccountSettingInput[] {
  const byNotification = new Map<
    string,
    { enabledElsewhere: boolean; webPushSlug: string }
  >();

  for (const setting of settings) {
    const parsed = Notifications.parseSlug(setting.slug);
    if (!parsed || parsed.type === "web_push") continue;

    const entry = byNotification.get(parsed.notification) ?? {
      enabledElsewhere: false,
      webPushSlug: Notifications.getSlug(parsed.notification, "web_push"),
    };
    entry.enabledElsewhere ||= setting.value === "true";
    byNotification.set(parsed.notification, entry);
  }

  return [...byNotification.values()]
    .filter((entry) => entry.enabledElsewhere)
    .map((entry) => ({ slug: entry.webPushSlug, value: "true" }));
}
