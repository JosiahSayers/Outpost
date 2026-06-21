import { authClient } from "$/frontend/utils/auth-client";
import { useUnauthenticatedGuard } from "$/frontend/utils/guards/unauthenticated.guard";
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
import { schemaResolver, useForm } from "@mantine/form";
import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod/v4";

const registerSchema = z
  .object({
    name: z.string().min(1, { error: "Name is required" }),
    email: z.email({ error: "Please enter a valid email address" }),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(1, { error: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  useUnauthenticatedGuard();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const form = useForm<RegisterValues>({
    initialValues: { name: "", email: "", password: "", confirmPassword: "" },
    validate: schemaResolver(registerSchema, { sync: true }),
  });

  const handleSubmit = async (values: RegisterValues) => {
    setLoading(true);
    setServerError(null);

    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: "/",
    });

    setLoading(false);

    if (error) {
      setServerError(error.message ?? "Registration failed. Please try again.");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <Center mih="calc(100vh - 60px)">
      <Paper w={420} p="xl" withBorder>
        <Title order={2} mb={4}>
          Create an account
        </Title>
        <Text c="dimmed" size="sm" mb="xl">
          Start planning your next backpacking adventure
        </Text>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Your name"
              autoComplete="name"
              {...form.getInputProps("name")}
            />

            <TextInput
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              {...form.getInputProps("email")}
            />

            <PasswordInput
              label="Password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...form.getInputProps("password")}
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
              Create account
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="lg">
          Already have an account?{" "}
          <Anchor href="/sign-in" size="sm">
            Sign in
          </Anchor>
        </Text>
      </Paper>
    </Center>
  );
}
