import MfaSection from "$/frontend/account/mfa-section";
import { authClient } from "$/frontend/utils/auth-client";
import { newPasswordFields, refineNewPasswordsMatch } from "$/validation/auth";
import {
  Alert,
  Button,
  Divider,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useState } from "react";
import { useSearchParams } from "wouter";
import { z } from "zod/v4";

const changePasswordSchema = refineNewPasswordsMatch(
  z.object({
    currentPassword: z
      .string()
      .min(1, { error: "Please enter your current password" }),
    ...newPasswordFields,
  }),
);

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export default function SecurityPanel() {
  const [searchParams] = useSearchParams();
  const adminMfaRequired = searchParams.get("adminMfaRequired") === "true";
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ChangePasswordValues>({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: schemaResolver(changePasswordSchema, { sync: true }),
  });

  const handleSubmit = async (values: ChangePasswordValues) => {
    setLoading(true);
    setServerError(null);
    setSuccess(false);

    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });

    setLoading(false);

    if (error) {
      setServerError(
        error.message ?? "Something went wrong. Please try again.",
      );
    } else {
      form.reset();
      setSuccess(true);
    }
  };

  return (
    <Stack gap="md">
      <Title order={3}>Security</Title>

      {adminMfaRequired && (
        <Alert color="trail-dust" title="Admin access requires MFA">
          Enable two-factor authentication before you can access the admin
          console.
        </Alert>
      )}

      <Text c="dimmed" size="sm">
        Changing your password will sign you out of any other devices.
      </Text>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack maw={360}>
          <PasswordInput
            label="Current password"
            autoComplete="current-password"
            {...form.getInputProps("currentPassword")}
          />

          <PasswordInput
            label="New password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            {...form.getInputProps("newPassword")}
          />

          <PasswordInput
            label="Confirm new password"
            placeholder="Repeat your new password"
            autoComplete="new-password"
            {...form.getInputProps("confirmPassword")}
          />

          {serverError && (
            <Text c="red" size="sm">
              {serverError}
            </Text>
          )}

          {success && (
            <Alert color="green">
              Your password has been changed. You&rsquo;ve been signed out of
              other devices.
            </Alert>
          )}

          <Button type="submit" loading={loading} mt="xs">
            Change password
          </Button>
        </Stack>
      </form>

      <Divider my="md" />

      <MfaSection />
    </Stack>
  );
}
