import TripTextField from "$/frontend/trip/header/trip-text-field";
import PartySection from "$/frontend/trip/safety-info/party-section";
import TimeField from "$/frontend/trip/safety-info/time-field";
import { useUpdateTripSafetyInfo } from "$/frontend/utils/api/trip-safety-info";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientTripPartyMember } from "$/transformers/trip-party-member";
import type { ClientTripSafetyInfo } from "$/transformers/trip-safety-info";
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

// Mirrors the nudge rules agreed for BTP-134: emergency contact, ranger
// station, both times, and a non-empty party are required; vehicle, permit,
// and medical notes stay optional and never gate this.
function isSafetyInfoComplete(
  info: ClientTripSafetyInfo | null,
  party: ClientTripPartyMember[],
): boolean {
  return Boolean(
    info?.emergencyContactName?.trim() &&
    info?.emergencyContactPhone?.trim() &&
    info?.rangerStationName?.trim() &&
    info?.rangerStationPhone?.trim() &&
    info?.expectedDepartureTime &&
    info?.expectedReturnTime &&
    party.length > 0,
  );
}

interface Props {
  tripId: string;
  safetyInfo: ClientTripSafetyInfo | null;
  partyMembers: ClientTripPartyMember[];
  tripStart: string | null;
  tripEnd: string | null;
}

export default function SafetyInfo({
  tripId,
  safetyInfo,
  partyMembers,
  tripStart,
  tripEnd,
}: Props) {
  const [detailsOpen, { toggle: toggleDetails }] = useDisclosure(false);
  const updateSafetyInfo = useUpdateTripSafetyInfo(tripId);

  const complete = isSafetyInfoComplete(safetyInfo, partyMembers);

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
              value={safetyInfo?.emergencyContactName ?? null}
              placeholder="Add emergency contact name"
              onSave={(emergencyContactName) =>
                updateSafetyInfo.mutate(
                  { emergencyContactName },
                  { onError: notifyError("Couldn't update emergency contact") },
                )
              }
            />
            <TripTextField
              icon={<PhoneIcon size={15} style={{ visibility: "hidden" }} />}
              value={safetyInfo?.emergencyContactPhone ?? null}
              placeholder="Add emergency contact phone"
              onSave={(emergencyContactPhone) =>
                updateSafetyInfo.mutate(
                  { emergencyContactPhone },
                  { onError: notifyError("Couldn't update emergency contact") },
                )
              }
            />
            <TripTextField
              icon={<LifebuoyIcon size={15} />}
              value={safetyInfo?.rangerStationName ?? null}
              placeholder="Add ranger station or park office"
              onSave={(rangerStationName) =>
                updateSafetyInfo.mutate(
                  { rangerStationName },
                  { onError: notifyError("Couldn't update ranger station") },
                )
              }
            />
            <TripTextField
              icon={<LifebuoyIcon size={15} style={{ visibility: "hidden" }} />}
              value={safetyInfo?.rangerStationPhone ?? null}
              placeholder="Add ranger station phone"
              onSave={(rangerStationPhone) =>
                updateSafetyInfo.mutate(
                  { rangerStationPhone },
                  { onError: notifyError("Couldn't update ranger station") },
                )
              }
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
                  value={safetyInfo?.expectedDepartureTime ?? ""}
                  placeholder="Departure time"
                  label="Departure time"
                  onSave={(expectedDepartureTime) =>
                    updateSafetyInfo.mutate(
                      { expectedDepartureTime },
                      {
                        onError: notifyError("Couldn't update departure time"),
                      },
                    )
                  }
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
                  value={safetyInfo?.expectedReturnTime ?? ""}
                  placeholder="Return time"
                  label="Return time"
                  onSave={(expectedReturnTime) =>
                    updateSafetyInfo.mutate(
                      { expectedReturnTime },
                      { onError: notifyError("Couldn't update return time") },
                    )
                  }
                />
                {tripEnd && (
                  <Text size="sm" c="dimmed">
                    , {formatDate(tripEnd)}
                  </Text>
                )}
              </Group>
            </Group>

            <PartySection tripId={tripId} party={partyMembers} />
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
                value={safetyInfo?.vehicleDescription ?? null}
                placeholder="Add vehicle description"
                onSave={(vehicleDescription) =>
                  updateSafetyInfo.mutate(
                    { vehicleDescription },
                    {
                      onError: notifyError(
                        "Couldn't update vehicle description",
                      ),
                    },
                  )
                }
              />
              <TripTextField
                icon={<TicketIcon size={15} />}
                value={safetyInfo?.permitOrRouteNumber ?? null}
                placeholder="Add permit or route number"
                onSave={(permitOrRouteNumber) =>
                  updateSafetyInfo.mutate(
                    { permitOrRouteNumber },
                    {
                      onError: notifyError(
                        "Couldn't update permit or route number",
                      ),
                    },
                  )
                }
              />
              <TripTextField
                icon={<FirstAidIcon size={15} />}
                value={safetyInfo?.medicalNotes ?? null}
                placeholder="Add medical notes"
                onSave={(medicalNotes) =>
                  updateSafetyInfo.mutate(
                    { medicalNotes },
                    { onError: notifyError("Couldn't update medical notes") },
                  )
                }
              />
            </Stack>
          </Collapse>
        </div>
      </Stack>
    </Paper>
  );
}
