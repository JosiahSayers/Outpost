import { db } from "$/utils/db";
import type { ProductionSeed } from "../production-seed";

async function run() {
  await db.accountSetting.createMany({
    data: [
      {
        name: "Liquid viewing unit",
        description:
          "The unit liquid measurements are shown in, such as water needed per meal in a meal plan.",
      },
      {
        name: "Liquid entry unit",
        description:
          "The unit automatically selected when entering a new liquid measurement.",
      },
      {
        name: "Weight viewing unit",
        description:
          "The unit weight measurements are shown in, such as gear and pack weights.",
      },
      {
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
