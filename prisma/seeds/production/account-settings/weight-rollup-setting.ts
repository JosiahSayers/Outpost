import { db } from "$/utils/db";
import type { ProductionSeed } from "../production-seed";

// Added after initial-account-settings already shipped, so it's a separate
// seed rather than an addition to that createMany -- appliedSeeds tracks by
// name and initial-account-settings has already run in every existing
// environment.
async function run() {
  await db.accountSetting.create({
    data: {
      slug: "weight_rollup",
      name: "Roll up large totals",
      description:
        "When a weight gets large, show it as whole units plus a remainder (e.g. 1 lb 8 oz) instead of a decimal (e.g. 1.5 lbs). Applies everywhere weights are shown.",
      defaultValue: "true",
    },
  });
}

export const weightRollupSetting: ProductionSeed = {
  run,
  name: "weight-rollup-setting",
};
