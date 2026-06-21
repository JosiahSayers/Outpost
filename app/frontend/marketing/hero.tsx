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

export default function Hero() {
  return (
    <Box
      style={{
        background:
          "linear-gradient(150deg, var(--mantine-color-trail-green-8) 0%, var(--mantine-color-trail-green-6) 60%, var(--mantine-color-bark-brown-6) 100%)",
        margin: "calc(-1 * var(--mantine-spacing-md))",
        padding: `calc(var(--mantine-spacing-xl) * 2) var(--mantine-spacing-md)`,
      }}
    >
      <Container size="md">
        <Stack gap="xl">
          <Stack gap="md">
            <Title
              order={1}
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                color: "var(--mantine-color-white)",
                lineHeight: 1.15,
              }}
            >
              Plan your adventure.
              <br />
              Pack with purpose.
            </Title>
            <Text
              size="lg"
              style={{ color: "var(--mantine-color-trail-green-1)" }}
              maw={540}
            >
              Summit Journal is a backpacking planner that keeps your gear
              organised, your lists dialled in, and the people back home
              informed about your whereabouts.
            </Text>
          </Stack>
          <Group>
            <Button
              component={Link}
              href="/register"
              size="md"
              color="white"
              c="trail-green.8"
            >
              Get started
            </Button>
            <Button
              component={Link}
              href="/sign-in"
              size="md"
              variant="outline"
              color="white"
            >
              Sign in
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
