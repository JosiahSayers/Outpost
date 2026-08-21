import { FluidUnit } from "$/frontend/shared-components/converter/fluid-conversions";
import { WeightUnit } from "$/frontend/shared-components/converter/weight-conversions";
import { Notifications } from "$/utils/notifications";
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
  value: z.union([z.enum(WeightUnit), z.literal("pounds_and_ounces")]),
});

export const weightRollup = z.strictObject({
  slug: z.literal("weight_rollup"),
  value: z.enum(["true", "false"]),
});

export const tripStatusUpdateInApp = z.strictObject({
  slug: z.literal(Notifications.getSlug("trip_status_update", "in_app")),
  value: z.enum(["true", "false"]),
});

export const tripStatusUpdateEmail = z.strictObject({
  slug: z.literal(Notifications.getSlug("trip_status_update", "email")),
  value: z.enum(["true", "false"]),
});

export const accountSettings = z.discriminatedUnion("slug", [
  liquidViewingUnit,
  liquidEntryUnit,
  weightViewingUnit,
  weightEntryUnit,
  weightRollup,
  tripStatusUpdateInApp,
  tripStatusUpdateEmail,
]);

export const editAccountSettings = z.strictObject({
  settings: z.array(accountSettings),
});
