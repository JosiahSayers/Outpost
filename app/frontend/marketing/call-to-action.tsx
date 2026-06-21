import AppLink from "$/frontend/app-link";
import {
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "wouter";

export default function CallToAction() {
  return (
    <Box
      style={{
        background: "var(--mantine-color-stone-gray-0)",
        borderTop: "1px solid var(--mantine-color-stone-gray-2)",
      }}
      mt="xl"
      py="xl"
    >
      <Container size="md">
        <Stack align="center" gap="md" ta="center">
          <Title order={3}>Ready to start planning?</Title>
          <Text c="dimmed" maw={400}>
            Create a free account and have your first trip planned before the
            weekend.
          </Text>
          <Group>
            <Button component={Link} href="/register" size="md">
              Create an account
            </Button>
            <AppLink href="/sign-in">Already have an account</AppLink>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
