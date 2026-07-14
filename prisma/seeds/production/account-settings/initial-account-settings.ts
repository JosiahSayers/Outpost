import { db } from "$/utils/db";
import type { ProductionSeed } from "../production-seed";

async function run() {
  await db.accountSetting.createMany({
    data: [
      {
        slug: "liguid_viewing_unit",
        name: "Liquid viewing unit",
        description:
          "The unit liquid measurements are shown in, such as water needed per meal in a meal plan.",
      },
      {
        slug: "liquid_entry_unit",
        name: "Liquid entry unit",
        description:
          "The unit automatically selected when entering a new liquid measurement.",
      },
      {
        slug: "weight_viewing_unit",
        name: "Weight viewing unit",
        description:
          "The unit weight measurements are shown in, such as gear and pack weights.",
      },
      {
        slug: "weight_entry_unit",
        name: "Weight entry unit",
        description:
          "The unit automatically selected when entering a new weight measurement.",
      },
    ],
  });
}

export const initialAccountSettings: ProductionSeed = {
  run,
  name: "initial-account-settings",
};
