import z from "zod";

export const idParam = z.strictObject({
  id: z.string(),
});

export const numberQueryParam = (defaultValue: number) =>
  z.preprocess((input) => {
    if (typeof input === "string" && input.trim().length === 0) {
      return undefined;
    }

    return input;
  }, z.coerce.number().default(defaultValue));

// Prisma's own request validation rejects a bare "YYYY-MM-DD" string for a
// DateTime field ("Expected ISO-8601 DateTime"), so the validated date string
// is converted to a `Date` here rather than passed through as-is.
export const isoDate = z.iso
  .date({ error: "Invalid date" })
  .nullish()
  .transform((value) => (value == null ? value : new Date(value)));
