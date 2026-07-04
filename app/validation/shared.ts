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
