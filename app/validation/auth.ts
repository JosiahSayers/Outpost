import { z } from "zod/v4";

// Shared by every form that collects a new password (register, reset
// password, change password) so the length requirement and match check stay
// in sync across all three instead of drifting independently.
export const newPasswordFields = {
  newPassword: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" }),
  confirmPassword: z
    .string()
    .min(1, { error: "Please confirm your new password" }),
};

export function refineNewPasswordsMatch<
  Shape extends z.ZodRawShape & {
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
  },
>(schema: z.ZodObject<Shape>) {
  return schema.refine(
    (data) => {
      const { newPassword, confirmPassword } = data as {
        newPassword: string;
        confirmPassword: string;
      };
      return newPassword === confirmPassword;
    },
    { error: "Passwords do not match", path: ["confirmPassword"] },
  );
}
