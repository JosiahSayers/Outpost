import z from "zod";

export const idParam = z.strictObject({
  id: z.string(),
});

export const numberQueryParam = (
  defaultValue: number,
  { max, min }: { max?: number; min?: number } = {},
) => {
  let schema = z.coerce.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);

  return z.preprocess((input) => {
    if (typeof input === "string" && input.trim().length === 0) {
      return undefined;
    }

    return input;
  }, schema.default(defaultValue));
};

// Query params arrive as a single string, or as an array of strings when the
// key is repeated (e.g. `?status=new&status=planned`), depending on qs
// parsing. Normalize both shapes into an array before validating.
export const arrayQueryParam = <T extends z.ZodType>(
  schema: T,
  defaultValue: z.infer<T>[],
) => {
  return z.preprocess((input) => {
    if (input === undefined) return undefined;
    return Array.isArray(input) ? input : [input];
  }, z.array(schema).default(defaultValue));
};

// Query params arrive as strings, and z.coerce.boolean() treats any
// non-empty string (including "false") as true, so only the literal
// "true"/"false" strings are coerced here.
export const booleanQueryParam = () => {
  return z.preprocess((input) => {
    if (input === "true") return true;
    if (input === "false") return false;
    return input;
  }, z.boolean().optional());
};

// Prisma's own request validation rejects a bare "YYYY-MM-DD" string for a
// DateTime field ("Expected ISO-8601 DateTime"), so the validated date string
// is converted to a `Date` here rather than passed through as-is.
export const isoDate = z.iso
  .date({ error: "Invalid date" })
  .nullish()
  .transform((value) => (value == null ? value : new Date(value)));
