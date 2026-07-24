import { useUpdateTripLink } from "$/frontend/utils/api/trip-link";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientTripLink } from "$/transformers/trip-link";
import { Text, Textarea } from "@mantine/core";
import { useState } from "react";

interface Props {
  tripId: string;
  link: ClientTripLink;
  /** Show the "Add a description" prompt when there's none yet — gated by
   * the parent card's hover/touch state so empty cards don't look cluttered. */
  revealEmpty: boolean;
}

export default function LinkDescriptionField({
  tripId,
  link,
  revealEmpty,
}: Props) {
  const updateLink = useUpdateTripLink(tripId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(link.description ?? "");

  const commit = () => {
    const description = draft.trim();
    if (description !== (link.description ?? "")) {
      updateLink.mutate(
        { linkId: link.id, description },
        { onError: notifyError("Couldn't update description") },
      );
    }
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <Textarea
        size="xs"
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        autoFocus
        autosize
        minRows={2}
        aria-label="Link description"
      />
    );
  }

  if (!link.description && !revealEmpty) return null;

  return (
    <Text
      size="xs"
      c="dimmed"
      lineClamp={3}
      fs={link.description ? undefined : "italic"}
      onClick={() => {
        setDraft(link.description ?? "");
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
    >
      {link.description || "Add a description"}
    </Text>
  );
}
