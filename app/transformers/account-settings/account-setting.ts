import type { AccountSetting } from "../../../generated/prisma/browser";

export type ClientAccountSetting = Pick<
  AccountSetting,
  "slug" | "name" | "description" | "defaultValue"
>;

export function transform(item: AccountSetting): ClientAccountSetting {
  return {
    slug: item.slug,
    name: item.name,
    description: item.description,
    defaultValue: item.defaultValue,
  };
}
