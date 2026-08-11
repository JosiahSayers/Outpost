import { authClient } from "$/frontend/utils/auth-client";
import {
  Alert,
  Badge,
  Button,
  Code,
  CopyButton,
  Group,
  Modal,
  PasswordInput,
  PinInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import QRCode from "react-qr-code";

type EnrollStep = "closed" | "password" | "setup" | "backup-codes";

function totpSecretFromUri(totpURI: string): string | null {
  try {
    return new URL(totpURI).searchParams.get("secret");
  } catch {
    return null;
  }
}

export default function MfaSection() {
  const { data: session } = authClient.useSession();
  const twoFactorEnabled = !!session?.user.twoFactorEnabled;

  const [enrollStep, setEnrollStep] = useState<EnrollStep>("closed");
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [disableOpened, { open: openDisable, close: closeDisable }] =
    useDisclosure(false);
  const [regenerateOpened, { open: openRegenerate, close: closeRegenerate }] =
    useDisclosure(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[]>([]);

  const resetEnrollment = () => {
    setEnrollStep("closed");
    setPassword("");
    setTotpURI("");
    setBackupCodes([]);
    setCode("");
    setError(null);
  };

  const handleStartEnroll = () => {
    setEnrollStep("password");
    setError(null);
  };

  const handleSubmitPassword = async () => {
    setLoading(true);
    setError(null);

    const { data, error: enableError } = await authClient.twoFactor.enable({
      password,
    });

    setLoading(false);

    if (enableError) {
      setError(
        enableError.message ?? "Couldn't verify your password. Try again.",
      );
      return;
    }

    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
    setEnrollStep("setup");
  };

  const handleVerifyCode = async (value: string) => {
    setLoading(true);
    setError(null);

    const { error: verifyError } = await authClient.twoFactor.verifyTotp({
      code: value,
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message ?? "That code didn't work. Try again.");
      setCode("");
      return;
    }

    setEnrollStep("backup-codes");
  };

  const handleDisable = async () => {
    setLoading(true);
    setError(null);

    const { error: disableError } = await authClient.twoFactor.disable({
      password: disablePassword,
    });

    setLoading(false);

    if (disableError) {
      setError(
        disableError.message ?? "Couldn't verify your password. Try again.",
      );
      return;
    }

    setDisablePassword("");
    closeDisable();
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);

    const { data, error: regenerateError } =
      await authClient.twoFactor.generateBackupCodes({
        password: regeneratePassword,
      });

    setLoading(false);

    if (regenerateError) {
      setError(
        regenerateError.message ?? "Couldn't verify your password. Try again.",
      );
      return;
    }

    setRegeneratedCodes(data.backupCodes);
  };

  const closeRegenerateModal = () => {
    closeRegenerate();
    setRegeneratePassword("");
    setRegeneratedCodes([]);
    setError(null);
  };

  const closeDisableModal = () => {
    closeDisable();
    setDisablePassword("");
    setError(null);
  };

  const secret = totpURI ? totpSecretFromUri(totpURI) : null;

  return (
    <Stack gap="md">
      <Title order={4}>Two-factor authentication</Title>

      {enrollStep === "closed" && (
        <Stack maw={360} gap="sm">
          {twoFactorEnabled ? (
            <>
              <Group gap="xs">
                <Badge color="trail-green" variant="light">
                  Enabled
                </Badge>
              </Group>
              <Text c="dimmed" size="sm">
                Your account requires an authenticator app code at sign-in.
              </Text>
              <Group>
                <Button variant="default" onClick={openRegenerate}>
                  Regenerate backup codes
                </Button>
                <Button color="red" variant="light" onClick={openDisable}>
                  Disable
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Text c="dimmed" size="sm">
                Add an extra layer of security to your account by requiring a
                code from an authenticator app at sign-in.
              </Text>
              <Button onClick={handleStartEnroll} w="fit-content">
                Enable two-factor authentication
              </Button>
            </>
          )}
        </Stack>
      )}

      {enrollStep === "password" && (
        <Stack maw={360} gap="sm">
          <Text size="sm">Confirm your password to continue.</Text>
          <PasswordInput
            label="Current password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
          <Group>
            <Button variant="default" onClick={resetEnrollment}>
              Cancel
            </Button>
            <Button loading={loading} onClick={handleSubmitPassword}>
              Continue
            </Button>
          </Group>
        </Stack>
      )}

      {enrollStep === "setup" && (
        <Stack maw={360} gap="sm">
          <Text size="sm">
            Scan this code with your authenticator app (Google Authenticator,
            1Password, Authy, etc.).
          </Text>
          <div
            style={{ background: "white", padding: 12, width: "fit-content" }}
          >
            <QRCode value={totpURI} size={180} />
          </div>
          {secret && (
            <Text size="xs" c="dimmed">
              Can&rsquo;t scan? Enter this code manually: <Code>{secret}</Code>
            </Text>
          )}
          <Text size="sm" mt="xs">
            Then enter the 6-digit code it generates.
          </Text>
          <PinInput
            length={6}
            type="number"
            value={code}
            onChange={setCode}
            onComplete={handleVerifyCode}
            disabled={loading}
          />
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
          <Group>
            <Button variant="default" onClick={resetEnrollment}>
              Cancel
            </Button>
          </Group>
        </Stack>
      )}

      {enrollStep === "backup-codes" && (
        <Stack maw={360} gap="sm">
          <Alert color="green">Two-factor authentication is enabled.</Alert>
          <Text size="sm">
            Save these backup codes somewhere safe. Each one can be used once to
            sign in if you lose access to your authenticator app. They
            won&rsquo;t be shown again.
          </Text>
          <Code block>{backupCodes.join("\n")}</Code>
          <Group>
            <CopyButton value={backupCodes.join("\n")}>
              {({ copied, copy }) => (
                <Button variant="default" onClick={copy}>
                  {copied ? "Copied" : "Copy codes"}
                </Button>
              )}
            </CopyButton>
            <Button onClick={resetEnrollment}>Done</Button>
          </Group>
        </Stack>
      )}

      <Modal
        opened={disableOpened}
        onClose={closeDisableModal}
        title="Disable two-factor authentication?"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            You&rsquo;ll no longer be asked for a code at sign-in. Confirm your
            password to disable it.
          </Text>
          <PasswordInput
            label="Current password"
            autoComplete="current-password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.currentTarget.value)}
          />
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={closeDisableModal}>
              Cancel
            </Button>
            <Button color="red" loading={loading} onClick={handleDisable}>
              Disable
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={regenerateOpened}
        onClose={closeRegenerateModal}
        title="Regenerate backup codes"
      >
        <Stack gap="sm">
          {regeneratedCodes.length > 0 ? (
            <>
              <Text size="sm" c="dimmed">
                Your old backup codes no longer work. Save these new ones
                somewhere safe &mdash; they won&rsquo;t be shown again.
              </Text>
              <Code block>{regeneratedCodes.join("\n")}</Code>
              <Group justify="flex-end" mt="sm">
                <CopyButton value={regeneratedCodes.join("\n")}>
                  {({ copied, copy }) => (
                    <Button variant="default" onClick={copy}>
                      {copied ? "Copied" : "Copy codes"}
                    </Button>
                  )}
                </CopyButton>
                <Button onClick={closeRegenerateModal}>Done</Button>
              </Group>
            </>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                This replaces your existing backup codes. Confirm your password
                to continue.
              </Text>
              <PasswordInput
                label="Current password"
                autoComplete="current-password"
                value={regeneratePassword}
                onChange={(e) => setRegeneratePassword(e.currentTarget.value)}
              />
              {error && (
                <Text c="red" size="sm">
                  {error}
                </Text>
              )}
              <Group justify="flex-end" mt="sm">
                <Button variant="default" onClick={closeRegenerateModal}>
                  Cancel
                </Button>
                <Button loading={loading} onClick={handleRegenerate}>
                  Regenerate
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
