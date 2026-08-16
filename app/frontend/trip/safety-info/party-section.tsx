import type { PlaceholderPartyMember } from "$/frontend/trip/placeholder-data";
import {
  ActionIcon,
  Avatar,
  Button,
  Collapse,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDownIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  party: PlaceholderPartyMember[];
  onAdd: (name: string, phone: string) => void;
  onRemove: (id: string) => void;
  onEditName: (id: string, name: string) => void;
  onEditPhone: (id: string, phone: string) => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface EditableFieldProps {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onSave: (value: string) => void;
  size?: "xs" | "sm";
  alwaysDimmed?: boolean;
}

function EditableField({
  value,
  placeholder,
  ariaLabel,
  onSave,
  size = "sm",
  alwaysDimmed = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== value) onSave(trimmed);
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <TextInput
        size="xs"
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        autoFocus
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <Text
      size={size}
      c={alwaysDimmed || !value ? "dimmed" : undefined}
      fs={value ? undefined : "italic"}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
    >
      {value || placeholder}
    </Text>
  );
}

export default function PartySection({
  party,
  onAdd,
  onRemove,
  onEditName,
  onEditPhone,
}: Props) {
  const [open, { toggle }] = useDisclosure(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function submitAdd() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onAdd(trimmedName, phone.trim());
    setName("");
    setPhone("");
    setAdding(false);
  }

  return (
    <div>
      <Group
        gap={8}
        wrap="nowrap"
        onClick={toggle}
        style={{ cursor: "pointer" }}
      >
        <CaretDownIcon
          size={12}
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 150ms ease",
            flexShrink: 0,
          }}
        />
        {party.length > 0 && (
          <Avatar.Group>
            {party.map((member) => (
              <Avatar key={member.id} size="sm" radius="xl" color="trail-green">
                {initials(member.name)}
              </Avatar>
            ))}
          </Avatar.Group>
        )}
        <Text size="sm" c="dimmed">
          {party.length === 0
            ? "No one added yet"
            : `${party.length} in your party`}
        </Text>
      </Group>

      <Collapse expanded={open}>
        <Stack gap={6} mt="sm" pl="md">
          {party.map((member) => (
            <Group key={member.id} justify="space-between" wrap="nowrap">
              <Group gap={8} wrap="nowrap">
                <Avatar size="xs" radius="xl" color="trail-green">
                  {initials(member.name)}
                </Avatar>
                {member.userId ? (
                  <Text size="sm">{member.name}</Text>
                ) : (
                  <EditableField
                    value={member.name}
                    placeholder="Name"
                    ariaLabel={`Edit ${member.name}'s name`}
                    onSave={(name) => name && onEditName(member.id, name)}
                  />
                )}
                <EditableField
                  value={member.phone}
                  placeholder="Add phone"
                  ariaLabel={`Edit ${member.name}'s phone number`}
                  onSave={(phone) => onEditPhone(member.id, phone)}
                  size="xs"
                  alwaysDimmed
                />
              </Group>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                aria-label={`Remove ${member.name} from the party`}
                onClick={() => onRemove(member.id)}
              >
                <TrashIcon size={13} />
              </ActionIcon>
            </Group>
          ))}

          {adding ? (
            <Group gap={6} wrap="nowrap">
              <TextInput
                size="xs"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAdd();
                  if (e.key === "Escape") setAdding(false);
                }}
              />
              <TextInput
                size="xs"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAdd();
                  if (e.key === "Escape") setAdding(false);
                }}
              />
              <Button size="xs" onClick={submitAdd}>
                Add
              </Button>
            </Group>
          ) : (
            <Button
              variant="subtle"
              size="compact-xs"
              leftSection={<PlusIcon size={12} />}
              onClick={() => setAdding(true)}
              style={{ alignSelf: "flex-start" }}
            >
              Add someone
            </Button>
          )}
        </Stack>
      </Collapse>
    </div>
  );
}
