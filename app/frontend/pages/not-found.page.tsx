import AppLink from "$/frontend/app-link";
import { authClient } from "$/frontend/utils/auth-client";
import { Center, Stack, Text, Title } from "@mantine/core";

export default function NotFoundPage() {
  const session = authClient.useSession();
  const homeHref =
    !session.isPending && session.data?.user ? "/dashboard" : "/";

  return (
    <Center mih="calc(100vh - 60px)">
      <Stack align="center" gap="xs">
        <Title order={1} size="4rem" c="dimmed">
          404
        </Title>
        <Title order={2}>Page not found</Title>
        <Text c="dimmed" ta="center">
          The page you&apos;re looking for doesn&apos;t exist.
        </Text>
        <AppLink href={homeHref}>Go home</AppLink>
      </Stack>
    </Center>
  );
}
