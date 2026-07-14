import { FluidUnit } from "$/frontend/shared-components/converter/fluid-conversions";
import { WeightUnit } from "$/frontend/shared-components/converter/weight-conversions";
import z from "zod";

export const liquidViewingUnit = z.strictObject({
  slug: z.literal("liquid_viewing_unit"),
  value: z.enum(FluidUnit),
});

export const liquidEntryUnit = z.strictObject({
  slug: z.literal("liquid_entry_unit"),
  value: z.enum(FluidUnit),
});

export const weightViewingUnit = z.strictObject({
  slug: z.literal("weight_viewing_unit"),
  value: z.enum(WeightUnit),
});

export const weightEntryUnit = z.strictObject({
  slug: z.literal("weight_entry_unit"),
  value: z.enum(WeightUnit),
});

export const accountSettings = z.discriminatedUnion("slug", [
  liquidViewingUnit,
  liquidEntryUnit,
  weightViewingUnit,
  weightEntryUnit,
]);

export const editSettingsInput = z.strictObject({
  settings: z.array(accountSettings),
});
