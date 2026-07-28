import { Stack, Text } from "@mantine/core";

interface Props {
  label: string;
  value: string | null;
}

export default function StatCell({ label, value }: Props) {
  return (
    <Stack gap={0}>
      <Text
        size="10px"
        fw={700}
        tt="uppercase"
        c="dimmed"
        style={{ letterSpacing: "0.06em" }}
      >
        {label}
      </Text>
      <Text
        size="sm"
        fw={600}
        c={value ? undefined : "dimmed"}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value ?? "—"}
      </Text>
    </Stack>
  );
}
