import { authClient } from "$/frontend/utils/auth-client";
import {
  Anchor,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";

const signInSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const form = useForm<SignInValues>({
    initialValues: { email: "", password: "" },
    validate: (values) => {
      const result = signInSchema.safeParse(values);
      if (result.success) return {};

      return Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
    },
  });

  const handleSubmit = async (values: SignInValues) => {
    setLoading(true);
    setServerError(null);

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: "/",
    });

    setLoading(false);

    if (error) {
      setServerError(error.message ?? "Sign in failed. Please try again.");
    } else {
      navigate("/");
    }
  };

  return (
    <Center mih="calc(100vh - 60px)">
      <Paper w={420} p="xl" withBorder>
        <Title order={2} mb={4}>
          Welcome back
        </Title>
        <Text c="dimmed" size="sm" mb="xl">
          Sign in to continue planning your next adventure
        </Text>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              {...form.getInputProps("email")}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              autoComplete="current-password"
              {...form.getInputProps("password")}
            />

            {serverError && (
              <Text c="red" size="sm">
                {serverError}
              </Text>
            )}

            <Button type="submit" loading={loading} fullWidth mt="xs">
              Sign in
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="lg">
          Don&apos;t have an account?{" "}
          <Anchor href="/register" size="sm">
            Create one
          </Anchor>
        </Text>
      </Paper>
    </Center>
  );
}
