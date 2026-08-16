import TripTextField from "$/frontend/trip/header/trip-text-field";
import {
  isSafetyInfoComplete,
  placeholderPartyMembers,
  placeholderSafetyInfo,
  type PlaceholderPartyMember,
  type PlaceholderSafetyInfo,
} from "$/frontend/trip/placeholder-data";
import PartySection from "$/frontend/trip/safety-info/party-section";
import TimeField from "$/frontend/trip/safety-info/time-field";
import {
  Badge,
  Collapse,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  CarIcon,
  CaretDownIcon,
  CheckCircleIcon,
  ClockIcon,
  FirstAidIcon,
  LifebuoyIcon,
  PhoneIcon,
  TicketIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

const CAPTION_STYLE = { letterSpacing: "0.05em" } as const;

// Trip dates are calendar days, not instants, so they're formatted in UTC
// (the timezone they're stored in) rather than the viewer's local timezone —
// mirrors dashboard/trip-card.tsx's formatDateRange, just for a single date
// instead of a range.
function formatDate(date: string): string {
  return new Intl.DateTimeFormat(navigator.language, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

interface Props {
  tripStart: string | null;
  tripEnd: string | null;
}

export default function SafetyInfo({ tripStart, tripEnd }: Props) {
  const [info, setInfo] = useState<PlaceholderSafetyInfo>(
    placeholderSafetyInfo,
  );
  const [party, setParty] = useState<PlaceholderPartyMember[]>(
    placeholderPartyMembers,
  );
  const [detailsOpen, { toggle: toggleDetails }] = useDisclosure(false);

  const complete = isSafetyInfoComplete(info, party);

  function update<K extends keyof PlaceholderSafetyInfo>(
    key: K,
    value: PlaceholderSafetyInfo[K],
  ) {
    setInfo((prev) => ({ ...prev, [key]: value }));
  }

  function addPartyMember(name: string, phone: string) {
    setParty((prev) => [...prev, { id: crypto.randomUUID(), name, phone }]);
  }

  function removePartyMember(id: string) {
    setParty((prev) => prev.filter((member) => member.id !== id));
  }

  function editPartyMemberName(id: string, name: string) {
    setParty((prev) =>
      prev.map((member) =>
        member.id === id && !member.userId ? { ...member, name } : member,
      ),
    );
  }

  function editPartyMemberPhone(id: string, phone: string) {
    setParty((prev) =>
      prev.map((member) => (member.id === id ? { ...member, phone } : member)),
    );
  }

  return (
    <Paper
      withBorder
      p="lg"
      bg={complete ? undefined : "trail-dust.0"}
      style={
        complete
          ? undefined
          : {
              border: "1px solid var(--mantine-color-trail-dust-1)",
              borderLeft: "4px solid var(--mantine-color-trail-dust-5)",
            }
      }
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={3}>Safety Info</Title>
          <Badge
            color={complete ? "trail-green" : "trail-dust"}
            variant="light"
            leftSection={
              complete ? (
                <CheckCircleIcon size={11} />
              ) : (
                <WarningIcon size={11} />
              )
            }
          >
            {complete ? "Complete" : "Incomplete"}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          <Stack gap={10}>
            <Text size="xs" fw={700} tt="uppercase" style={CAPTION_STYLE}>
              Who to call
            </Text>
            <TripTextField
              icon={<PhoneIcon size={15} />}
              value={info.emergencyContactName}
              placeholder="Add emergency contact name"
              onSave={(value) => update("emergencyContactName", value)}
            />
            <TripTextField
              icon={<PhoneIcon size={15} style={{ visibility: "hidden" }} />}
              value={info.emergencyContactPhone}
              placeholder="Add emergency contact phone"
              onSave={(value) => update("emergencyContactPhone", value)}
            />
            <TripTextField
              icon={<LifebuoyIcon size={15} />}
              value={info.rangerStationName}
              placeholder="Add ranger station or park office"
              onSave={(value) => update("rangerStationName", value)}
            />
            <TripTextField
              icon={<LifebuoyIcon size={15} style={{ visibility: "hidden" }} />}
              value={info.rangerStationPhone}
              placeholder="Add ranger station phone"
              onSave={(value) => update("rangerStationPhone", value)}
            />
          </Stack>

          <Stack gap={10}>
            <Text size="xs" fw={700} tt="uppercase" style={CAPTION_STYLE}>
              The plan
            </Text>
            <Group gap={10} wrap="nowrap">
              <Group gap={0} wrap="nowrap">
                <TimeField
                  icon={<ClockIcon size={15} />}
                  value={info.departureTime}
                  placeholder="Departure time"
                  label="Departure time"
                  onSave={(value) => update("departureTime", value)}
                />
                {tripStart && (
                  <Text size="sm" c="dimmed">
                    , {formatDate(tripStart)}
                  </Text>
                )}
              </Group>
              <Text c="dimmed" size="sm">
                &rarr;
              </Text>
              <Group gap={0} wrap="nowrap">
                <TimeField
                  icon={<ClockIcon size={15} />}
                  value={info.returnTime}
                  placeholder="Return time"
                  label="Return time"
                  onSave={(value) => update("returnTime", value)}
                />
                {tripEnd && (
                  <Text size="sm" c="dimmed">
                    , {formatDate(tripEnd)}
                  </Text>
                )}
              </Group>
            </Group>

            <PartySection
              party={party}
              onAdd={addPartyMember}
              onRemove={removePartyMember}
              onEditName={editPartyMemberName}
              onEditPhone={editPartyMemberPhone}
            />
          </Stack>
        </SimpleGrid>

        <div>
          <Group gap={6} onClick={toggleDetails} style={{ cursor: "pointer" }}>
            <CaretDownIcon
              size={12}
              style={{
                transform: detailsOpen ? "rotate(180deg)" : undefined,
                transition: "transform 150ms ease",
              }}
            />
            <Text size="xs" fw={600}>
              Vehicle, permit &amp; medical notes
            </Text>
          </Group>
          <Collapse expanded={detailsOpen}>
            <Stack gap={8} mt="sm" pl="md">
              <TripTextField
                icon={<CarIcon size={15} />}
                value={info.vehicleDescription}
                placeholder="Add vehicle description"
                onSave={(value) => update("vehicleDescription", value)}
              />
              <TripTextField
                icon={<TicketIcon size={15} />}
                value={info.permitNumber}
                placeholder="Add permit or route number"
                onSave={(value) => update("permitNumber", value)}
              />
              <TripTextField
                icon={<FirstAidIcon size={15} />}
                value={info.medicalNotes}
                placeholder="Add medical notes"
                onSave={(value) => update("medicalNotes", value)}
              />
            </Stack>
          </Collapse>
        </div>
      </Stack>
    </Paper>
  );
}
