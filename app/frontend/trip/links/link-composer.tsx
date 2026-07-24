import { Box, Button, Group, TextInput } from "@mantine/core";
import { LinkIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";

interface Props {
  existingUrls: string[];
  onSubmit: (url: string) => void;
}

function validate(raw: string, existingUrls: string[]): string | null {
  const url = raw.trim();
  if (!url) return "Enter a link to add.";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Enter a valid link, like https://example.com/trail.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Enter a valid link, like https://example.com/trail.";
  }
  if (existingUrls.includes(url)) {
    return "That URL already exists on this trip.";
  }
  return null;
}

export default function LinkComposer({ existingUrls, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const url = value.trim();
    const message = validate(url, existingUrls);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setValue("");
    onSubmit(url);
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Group
        align="flex-start"
        gap="sm"
        wrap="nowrap"
        p="sm"
        style={{
          border: "1.5px dashed var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
        }}
      >
        <LinkIcon
          size={16}
          style={{
            marginTop: 9,
            flexShrink: 0,
            color: "var(--mantine-color-dimmed)",
          }}
        />
        <TextInput
          aria-label="Link URL"
          placeholder="Paste a link, e.g. https://nps.gov/mora"
          value={value}
          onChange={(e) => {
            setValue(e.currentTarget.value);
            setError(null);
          }}
          error={error}
          style={{ flex: 1 }}
        />
        <Button type="submit">Add</Button>
      </Group>
    </Box>
  );
}
