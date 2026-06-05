import { db } from "$/utils/db";
import { reiPackingList } from "./packing-lists/rei-packing-list";

const productionSeeds = [reiPackingList];

let experiencedFailure = false;

async function applyProductionSeeds() {
  for (const seed of productionSeeds) {
    const alreadyApplied = await db.appliedSeeds.findUnique({
      where: { name: seed.name },
    });
    if (alreadyApplied !== null) {
      console.log(`Skipping ${seed.name}`);
      continue;
    }

    try {
      await seed.run();
      await db.appliedSeeds.create({ data: { name: seed.name } });
      console.log(`Applied ${seed.name}`);
    } catch (e) {
      console.error(`Failed to apply seed: ${seed.name}`, e);
    }
  }
}

await applyProductionSeeds();
process.exit(experiencedFailure ? 1 : 0);
