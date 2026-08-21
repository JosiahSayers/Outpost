import type { ClientAccountSetting } from "$/transformers/account-settings/account-setting";
import type {
  AccountSetting,
  AccountSettingValue,
} from "../../../generated/prisma/browser";
import { transform as accountSettingTransform } from "./account-setting";

export type ClientUserAccountSetting = ClientAccountSetting & {
  value: string | null;
};

// TODO: Transformers should only take a single item, not an array
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

type BooleanSettingInput = AccountSetting & {
  accountSettingValues: AccountSettingValue[];
};

export type ClientBooleanAccountSetting = ClientAccountSetting & {
  value: boolean;
};

export function booleanSettingTransform(item: BooleanSettingInput) {
  const userValue = item.accountSettingValues[0]?.value;
  const defaultValue = item.defaultValue;
  const value =
    userValue !== undefined ? userValue === "true" : defaultValue === "true";

  return {
    ...accountSettingTransform(item),
    value,
  };
}
