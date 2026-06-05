import applyDevSeeds from "./dev";
import applyProductionSeeds from "./production";

if (Bun.env.NODE_ENV !== "production") {
  await applyDevSeeds();
}

await applyProductionSeeds();
process.exit(0);
