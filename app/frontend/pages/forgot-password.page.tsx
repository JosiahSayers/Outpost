import { authClient } from "$/frontend/utils/auth-client";
import { useUnauthenticatedGuard } from "$/frontend/utils/guards/unauthenticated.guard";
import {
  Alert,
  Anchor,
  Button,
  Center,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useState } from "react";
import { z } from "zod/v4";

const forgotPasswordSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  useUnauthenticatedGuard("/dashboard");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    initialValues: { email: "" },
    validate: schemaResolver(forgotPasswordSchema, { sync: true }),
  });

  const handleSubmit = async (values: ForgotPasswordValues) => {
    setLoading(true);
    setServerError(null);

    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });

    setLoading(false);

    if (error) {
      setServerError(
        error.message ?? "Something went wrong. Please try again.",
      );
    } else {
      setSent(true);
    }
  };

  return (
    <Center mih="calc(100vh - 60px)">
      <Paper w={420} p="xl" withBorder>
        <Title order={2} mb={4}>
          Reset your password
        </Title>

        {sent ? (
          <Stack>
            <Alert color="green" mt="md">
              If an account exists for that email, we&apos;ve sent a link to
              reset your password.
            </Alert>
            <Anchor size="sm" href="/sign-in">
              Back to sign in
            </Anchor>
          </Stack>
        ) : (
          <>
            <Text c="dimmed" size="sm" mb="xl">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack>
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...form.getInputProps("email")}
                />

                {serverError && (
                  <Text c="red" size="sm">
                    {serverError}
                  </Text>
                )}

                <Button type="submit" loading={loading} fullWidth mt="xs">
                  Send reset link
                </Button>
              </Stack>
            </form>

            <Text c="dimmed" size="sm" ta="center" mt="lg">
              Remembered your password?{" "}
              <Anchor href="/sign-in" size="sm">
                Sign in
              </Anchor>
            </Text>
          </>
        )}
      </Paper>
    </Center>
  );
}
