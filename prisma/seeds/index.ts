import applyProductionSeeds from "./production";

await applyProductionSeeds();

if (Bun.env.NODE_ENV !== "production") {
  const { default: applyDevSeeds } = await import("./dev");
  await applyDevSeeds();
}

process.exit(0);
