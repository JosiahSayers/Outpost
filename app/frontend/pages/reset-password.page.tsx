import { authClient } from "$/frontend/utils/auth-client";
import { useUnauthenticatedGuard } from "$/frontend/utils/guards/unauthenticated.guard";
import {
  Alert,
  Anchor,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useState } from "react";
import { useSearchParams } from "wouter";
import { z } from "zod/v4";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(1, { error: "Please confirm your password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  useUnauthenticatedGuard("/dashboard");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const invalidToken = !token || searchParams.get("error") === "INVALID_TOKEN";

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    initialValues: { newPassword: "", confirmPassword: "" },
    validate: schemaResolver(resetPasswordSchema, { sync: true }),
  });

  const handleSubmit = async (values: ResetPasswordValues) => {
    if (!token) return;

    setLoading(true);
    setServerError(null);

    const { error } = await authClient.resetPassword({
      newPassword: values.newPassword,
      token,
    });

    setLoading(false);

    if (error) {
      setServerError(
        error.message ?? "Something went wrong. Please try again.",
      );
    } else {
      setDone(true);
    }
  };

  return (
    <Center mih="calc(100vh - 60px)">
      <Paper w={420} p="xl" withBorder>
        <Title order={2} mb={4}>
          Set a new password
        </Title>

        {invalidToken ? (
          <Stack>
            <Alert color="red" mt="md">
              This password reset link is invalid or has expired.
            </Alert>
            <Anchor size="sm" href="/forgot-password">
              Request a new link
            </Anchor>
          </Stack>
        ) : done ? (
          <Stack>
            <Alert color="green" mt="md">
              Your password has been reset.
            </Alert>
            <Anchor size="sm" href="/sign-in">
              Back to sign in
            </Anchor>
          </Stack>
        ) : (
          <>
            <Text c="dimmed" size="sm" mb="xl">
              Choose a new password for your account.
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack>
                <PasswordInput
                  label="New password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  {...form.getInputProps("newPassword")}
                />

                <PasswordInput
                  label="Confirm password"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  {...form.getInputProps("confirmPassword")}
                />

                {serverError && (
                  <Text c="red" size="sm">
                    {serverError}
                  </Text>
                )}

                <Button type="submit" loading={loading} fullWidth mt="xs">
                  Reset password
                </Button>
              </Stack>
            </form>
          </>
        )}
      </Paper>
    </Center>
  );
}
