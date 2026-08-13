import AppLink from "$/frontend/app-link";
import { customPalettes } from "$/frontend/theme";
import {
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";

// This banner is a fixed, always-dark backdrop with fixed light text — it's
// intentionally the same in light and dark mode, so it reads from the raw
// palette values below rather than the `--mantine-color-*` CSS variables
// (which flip per color scheme).
const trailGreen = customPalettes["trail-green"];
const barkBrown = customPalettes["bark-brown"];

export default function Hero() {
  return (
    <Box
      style={{
        background: `linear-gradient(150deg, ${trailGreen[8]} 0%, ${trailGreen[6]} 60%, ${barkBrown[6]} 100%)`,
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
            <Text size="lg" style={{ color: trailGreen[1] }} maw={540}>
              Outpost is a backpacking planner that keeps your gear organized,
              your lists dialed in, and the people back home informed about your
              whereabouts.
            </Text>
          </Stack>
          <Group>
            <Button
              component={AppLink}
              href="/register"
              size="md"
              color="white"
              c={trailGreen[8]}
            >
              Get started
            </Button>
            <Button
              component={AppLink}
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
