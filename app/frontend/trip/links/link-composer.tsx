import { createLink } from "$/validation/trip/link";
import { Box, Button, Group, TextInput } from "@mantine/core";
import { LinkIcon } from "@phosphor-icons/react";
import { type SubmitEvent, useState } from "react";

interface Props {
  existingUrls: string[];
  onSubmit: (url: string) => void;
}

function withScheme(raw: string): string {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function validate(
  raw: string,
  existingUrls: string[],
): { url: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Enter a link to add." };

  // Reuses the backend's zod schema so a link that passes here is guaranteed
  // to be accepted by the API too (e.g. it rejects single-label hosts like
  // "https://google" that the WHATWG URL parser would otherwise allow).
  const result = createLink.shape.url.safeParse(withScheme(trimmed));
  if (!result.success) {
    return { error: "Enter a valid link, like https://example.com/trail." };
  }

  if (existingUrls.includes(result.data)) {
    return { error: "That URL already exists on this trip." };
  }

  return { url: result.data };
}

export default function LinkComposer({ existingUrls, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const result = validate(value, existingUrls);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setValue("");
    onSubmit(result.url);
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
