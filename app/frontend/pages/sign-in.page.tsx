import { authClient } from "$/frontend/utils/auth-client";
import { useUnauthenticatedGuard } from "$/frontend/utils/guards/unauthenticated.guard";
import { useSignOutContext } from "$/frontend/utils/sign-out-context";
import {
  Alert,
  Anchor,
  Button,
  Center,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { useSearchParams } from "wouter";
import { z } from "zod/v4";

const signInSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
  password: z.string().min(1, { error: "Password is required" }),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const justSignedOut = searchParams.get("reason") === "signed-out";
  useUnauthenticatedGuard(redirect ?? "/dashboard");
  const { clearSignOutInitiated } = useSignOutContext();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Only cleared once we've actually arrived here, rather than by the
  // sign-out flow itself — see the comment in header-links.tsx for why.
  useEffect(() => {
    if (justSignedOut) {
      clearSignOutInitiated();
    }
  }, []);

  const form = useForm<SignInValues>({
    initialValues: { email: "", password: "" },
    validate: schemaResolver(signInSchema, { sync: true }),
  });

  const handleSubmit = async (values: SignInValues) => {
    setLoading(true);
    setServerError(null);

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: redirect ?? "/dashboard",
    });

    setLoading(false);

    // better-auth's client type doesn't declare `twoFactorRedirect` on this
    // response even though it's present at runtime when 2FA is required —
    // narrow with `in` per better-auth's own guidance for this case.
    const needsTwoFactor = !!data && "twoFactorRedirect" in data;

    if (error) {
      setServerError(error.message ?? "Sign in failed. Please try again.");
    } else if (!needsTwoFactor) {
      // A full navigation (not wouter's client-side `navigate`) so the next
      // page mounts with a fresh session atom. better-auth's client caches
      // the pre-sign-in (logged-out) session and only invalidates it via a
      // signal bump ~10ms after this promise resolves, so an immediate SPA
      // navigation lands on the destination page while the cache still says
      // "logged out" — bouncing back to /sign-in and immediately forward
      // again once the cache catches up.
      window.location.href = redirect || "/dashboard";
    }
    // If twoFactorRedirect is set, the twoFactorClient's onTwoFactorRedirect
    // hook (auth-client.ts) has already navigated to /two-factor.
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

        {justSignedOut ? (
          <Alert color="blue" mb="md">
            You&apos;ve been signed out.
          </Alert>
        ) : (
          redirect && (
            <Alert color="yellow" mb="md">
              You need to sign in to access that page.
            </Alert>
          )
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              {...form.getInputProps("email")}
            />

            <PasswordInput
              label={
                <Group justify="space-between" w="100%">
                  <Text size="sm" fw={500} component="span">
                    Password
                  </Text>
                  <Anchor href="/forgot-password" size="sm">
                    Forgot password?
                  </Anchor>
                </Group>
              }
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
