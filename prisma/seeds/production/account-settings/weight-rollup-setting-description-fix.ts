import { db } from "$/utils/db";
import type { ProductionSeed } from "../production-seed";

// weight-rollup-setting already ran everywhere and appliedSeeds tracks by
// name, so its description text is stuck as originally seeded. This updates
// the existing row instead of re-running that seed.
async function run() {
  await db.accountSetting.update({
    where: { slug: "weight_rollup" },
    data: {
      description:
        "When your viewing unit is ounces or grams, roll large totals up into the next unit plus a remainder (e.g. 24 oz becomes 1 lb 8 oz). Has no effect if your viewing unit is already pounds or kilograms.",
    },
  });
}

export const weightRollupSettingDescriptionFix: ProductionSeed = {
  run,
  name: "weight-rollup-setting-description-fix",
};
