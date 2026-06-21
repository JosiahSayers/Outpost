import Highlight, { type Feature } from "$/frontend/marketing/highlight";
import { Container, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { ListChecksIcon, PathIcon, TentIcon } from "@phosphor-icons/react";

const features: Array<Feature> = [
  {
    label: "Gear",
    title: "Your kit, catalogued",
    description:
      "Build a personal inventory of everything you own. Weight, category, condition; it's all there when you need it. No more wondering if you packed the rain cover.",
    icon: <TentIcon />,
    color: "trail-green",
  },
  {
    label: "Lists",
    title: "Pack lists that actually fit",
    description:
      "Create packing lists from scratch or start from a community template and make it yours. Every trip is different and your list should be too.",
    icon: <ListChecksIcon />,
    color: "bark-brown",
  },
  {
    label: "Trips",
    title: "Share where you're headed",
    description:
      "Log your route, dates, and trailhead details in one place. Share a link with people back home so they always know where you are and when to expect you back.",
    icon: <PathIcon />,
    color: "trail-green",
  },
] as const;

export default function Highlights() {
  return (
    <Container size="md" py="xl" mt="xl">
      <Stack gap="xl">
        <Stack gap="xs" ta="center">
          <Title order={2}>Everything your trip needs, in one place</Title>
          <Text c="dimmed" size="md" maw={480} mx="auto">
            From the gear room to the trailhead, Summit Journal covers the
            planning side so you can focus on the miles.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {features.map((f) => (
            <Highlight key={f.label} feature={f} />
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
