import { authClient } from "$/frontend/utils/auth-client";
import { useUnauthenticatedGuard } from "$/frontend/utils/guards/unauthenticated.guard";
import {
  Anchor,
  Button,
  Center,
  Checkbox,
  Group,
  Paper,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useSearchParams } from "wouter";

export default function TwoFactorPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  useUnauthenticatedGuard(redirect ?? "/dashboard");

  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Accepts an explicit code so the PinInput's onComplete (which hands us
  // the just-completed value directly) doesn't fall back to the `code`
  // state, which hasn't re-rendered with the final digit yet at that point.
  const handleSubmit = async (submittedCode: string = code) => {
    setLoading(true);
    setServerError(null);

    const { error } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({
          code: submittedCode,
          trustDevice,
        })
      : await authClient.twoFactor.verifyTotp({
          code: submittedCode,
          trustDevice,
        });

    setLoading(false);

    if (error) {
      setServerError(error.message ?? "Invalid code. Please try again.");
      return;
    }

    // Full navigation to pick up a fresh, authenticated session atom — see
    // the same comment in sign-in.page.tsx for why.
    window.location.href = redirect || "/dashboard";
  };

  return (
    <Center mih="calc(100vh - 60px)">
      <Paper w={420} p="xl" withBorder>
        <Title order={2} mb={4}>
          Two-factor verification
        </Title>
        <Text c="dimmed" size="sm" mb="xl">
          {useBackupCode
            ? "Enter one of your backup codes."
            : "Enter the code from your authenticator app."}
        </Text>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Stack>
            {useBackupCode ? (
              <TextInput
                label="Backup code"
                placeholder="xxxxxxxxxx"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.currentTarget.value)}
              />
            ) : (
              <PinInput
                length={6}
                type="number"
                autoFocus
                value={code}
                onChange={setCode}
                onComplete={handleSubmit}
              />
            )}

            <Checkbox
              label="Trust this device for 30 days"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.currentTarget.checked)}
            />

            {serverError && (
              <Text c="red" size="sm">
                {serverError}
              </Text>
            )}

            <Button type="submit" loading={loading} fullWidth mt="xs">
              Verify
            </Button>
          </Stack>
        </form>

        <Group justify="center" mt="lg">
          <Anchor
            component="button"
            type="button"
            size="sm"
            onClick={() => {
              setUseBackupCode((prev) => !prev);
              setCode("");
              setServerError(null);
            }}
          >
            {useBackupCode
              ? "Use your authenticator app instead"
              : "Use a backup code instead"}
          </Anchor>
        </Group>
      </Paper>
    </Center>
  );
}
