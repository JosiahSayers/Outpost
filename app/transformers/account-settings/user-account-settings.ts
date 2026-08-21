import type { ClientAccountSetting } from "$/transformers/account-settings/account-setting";
import type {
  AccountSetting,
  AccountSettingValue,
} from "../../../generated/prisma/browser";
import { transform as accountSettingTransform } from "./account-setting";

export type ClientUserAccountSetting = ClientAccountSetting & {
  value: string | null;
};

type UserSettingInput = AccountSetting & {
  accountSettingValues: AccountSettingValue[];
};

export function transform(item: UserSettingInput): ClientUserAccountSetting {
  return {
    ...accountSettingTransform(item),
    value: item.accountSettingValues[0]?.value ?? item.defaultValue,
  };
}
