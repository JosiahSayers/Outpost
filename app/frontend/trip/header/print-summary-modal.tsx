import { usePreferredUnit } from "$/frontend/account/use-preferred-unit";
import {
  FLUID_DEFAULT_UNIT,
  FLUID_REGION_DEFAULT_UNIT,
} from "$/frontend/shared-components/converter/fluid-conversions";
import {
  WEIGHT_DEFAULT_UNIT,
  WEIGHT_REGION_DEFAULT_UNIT,
} from "$/frontend/shared-components/converter/weight-conversions";
import {
  buildTripSummaryPdfUrl,
  type TripSummaryPrintStatus,
  type TripSummarySection,
} from "$/frontend/utils/api/trip-summary-pdf";
import {
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  SegmentedControl,
  Stack,
} from "@mantine/core";
import { FilePdfIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  opened: boolean;
  onClose: () => void;
  tripId: string;
}

const SECTION_LABELS: Record<TripSummarySection, string> = {
  details: "Trip details",
  tasks: "Tasks",
  mealPlan: "Meal plan",
  packingList: "Packing list",
};

const STATUS_OPTIONS: { label: string; value: TripSummaryPrintStatus }[] = [
  { label: "Carry over status", value: "carryover" },
  { label: "Print blank", value: "blank" },
];

export default function PrintSummaryModal({ opened, onClose, tripId }: Props) {
  const [sections, setSections] = useState<Record<TripSummarySection, boolean>>(
    {
      details: true,
      tasks: true,
      mealPlan: true,
      packingList: true,
    },
  );
  const [taskStatus, setTaskStatus] =
    useState<TripSummaryPrintStatus>("carryover");
  const [packingListStatus, setPackingListStatus] =
    useState<TripSummaryPrintStatus>("carryover");
  const fluidUnit = usePreferredUnit(
    "liquid_viewing_unit",
    FLUID_REGION_DEFAULT_UNIT,
    FLUID_DEFAULT_UNIT,
  );
  const weightUnit = usePreferredUnit(
    "weight_viewing_unit",
    WEIGHT_REGION_DEFAULT_UNIT,
    WEIGHT_DEFAULT_UNIT,
  );

  const selectedSections = (
    Object.keys(sections) as TripSummarySection[]
  ).filter((section) => sections[section]);
  const hasSelection = selectedSections.length > 0;

  function toggleSection(section: TripSummarySection) {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Export trip summary"
      size="sm"
      centered
    >
      <Stack gap="md">
        <Stack gap="xs">
          <Checkbox
            label={SECTION_LABELS.details}
            checked={sections.details}
            onChange={() => toggleSection("details")}
          />

          <Checkbox
            label={SECTION_LABELS.tasks}
            checked={sections.tasks}
            onChange={() => toggleSection("tasks")}
          />
          {sections.tasks && (
            <Box ml="xl">
              <SegmentedControl
                fullWidth
                size="xs"
                value={taskStatus}
                onChange={(value) =>
                  setTaskStatus(value as TripSummaryPrintStatus)
                }
                data={STATUS_OPTIONS}
              />
            </Box>
          )}

          <Checkbox
            label={SECTION_LABELS.mealPlan}
            checked={sections.mealPlan}
            onChange={() => toggleSection("mealPlan")}
          />

          <Checkbox
            label={SECTION_LABELS.packingList}
            checked={sections.packingList}
            onChange={() => toggleSection("packingList")}
          />
          {sections.packingList && (
            <Box ml="xl">
              <SegmentedControl
                fullWidth
                size="xs"
                value={packingListStatus}
                onChange={(value) =>
                  setPackingListStatus(value as TripSummaryPrintStatus)
                }
                data={STATUS_OPTIONS}
              />
            </Box>
          )}
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            component="a"
            href={
              hasSelection
                ? buildTripSummaryPdfUrl(tripId, {
                    sections: selectedSections,
                    taskStatus,
                    packingListStatus,
                    fluidUnit,
                    weightUnit,
                  })
                : undefined
            }
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<FilePdfIcon size={16} />}
            disabled={!hasSelection}
            onClick={onClose}
          >
            Export PDF
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
