import type { ClientAccountSetting } from "$/transformers/account-settings/account-setting";
import type {
  AccountSetting,
  AccountSettingValue,
} from "../../../generated/prisma/browser";
import { transform as accountSettingTransform } from "./account-setting";

export type ClientUserAccountSetting = ClientAccountSetting & {
  value: string | null;
};

export function transform(
  allSettings: AccountSetting[],
  userSettings: AccountSettingValue[],
): ClientUserAccountSetting[] {
  return allSettings.map((setting) => ({
    ...accountSettingTransform(setting),
    value:
      userSettings.find(
        (userSetting) => userSetting.accountSettingId === setting.id,
      )?.value ?? setting.defaultValue,
  }));
}
