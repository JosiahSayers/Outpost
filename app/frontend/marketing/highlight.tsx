import { Card, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

export interface Feature {
  label: string;
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
}

interface Props {
  feature: Feature;
}

export default function Highlight({ feature }: Props) {
  return (
    <Card key={feature.title} withBorder shadow="sm">
      <Stack gap="sm">
        <Group gap="xs" align="center">
          <ThemeIcon
            color={feature.color}
            variant="light"
            size="lg"
            radius="sm"
            style={{ fontSize: "1.1rem" }}
          >
            {feature.icon}
          </ThemeIcon>
          <Text
            size="xs"
            tt="uppercase"
            fw={700}
            c={`${feature.color}.6`}
            style={{ letterSpacing: "0.08em" }}
          >
            {feature.label}
          </Text>
        </Group>
        <Title order={3} size="h4">
          {feature.title}
        </Title>
        <Text size="sm" c="dimmed" lh="md">
          {feature.description}
        </Text>
      </Stack>
    </Card>
  );
}
