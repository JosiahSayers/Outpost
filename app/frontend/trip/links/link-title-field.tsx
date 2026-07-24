import { useUpdateTripLink } from "$/frontend/utils/api/trip-link";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientTripLink } from "$/transformers/trip-link";
import { Text, TextInput } from "@mantine/core";
import { useState } from "react";

interface Props {
  tripId: string;
  link: ClientTripLink;
  /** Show the "Add a title" prompt when there's no title yet — gated by the
   * parent card's hover/touch state so empty cards don't look cluttered. */
  revealEmpty: boolean;
}

export default function LinkTitleField({ tripId, link, revealEmpty }: Props) {
  const updateLink = useUpdateTripLink(tripId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(link.name ?? "");

  const commit = () => {
    const name = draft.trim();
    if (name !== (link.name ?? "")) {
      updateLink.mutate(
        { linkId: link.id, name },
        { onError: notifyError("Couldn't update title") },
      );
    }
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <TextInput
        size="sm"
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        autoFocus
        aria-label="Link title"
        styles={{ input: { fontWeight: 650 } }}
      />
    );
  }

  if (!link.name && !revealEmpty) return null;

  return (
    <Text
      size="sm"
      fw={650}
      lineClamp={2}
      c={link.name ? undefined : "dimmed"}
      fs={link.name ? undefined : "italic"}
      onClick={() => {
        setDraft(link.name ?? "");
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
    >
      {link.name || "Add a title"}
    </Text>
  );
}
