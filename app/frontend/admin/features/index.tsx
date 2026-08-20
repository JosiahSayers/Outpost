import FeatureAccordion from "$/frontend/admin/features/feature-accordion";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useAdminFeatures } from "$/frontend/utils/api/admin-features";
import {
  Accordion,
  Center,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

export default function AdminFeatures() {
  const { data, isPending, isError } = useAdminFeatures();
  const [openFeatures, setOpenFeatures] = useState<string[]>([]);

  const features = data?.features ?? [];

  return (
    <Stack gap="xl" py="lg" px={{ base: "md", sm: "xl" }}>
      <div>
        <Title order={2}>Feature Flags</Title>
        <Text c="dimmed" size="sm">
          Every flag known to the app. Open one to view or change its status.
        </Text>
      </div>

      <LoadingSwitch
        loading={isPending}
        fallback={
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        }
      >
        {() => {
          if (isError) {
            return (
              <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
                <Text ta="center" c="dimmed">
                  Couldn&rsquo;t load feature flags.
                </Text>
              </Paper>
            );
          }

          if (features.length === 0) {
            return (
              <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
                <Text ta="center" fw={700}>
                  No feature flags yet
                </Text>
                <Text ta="center" c="dimmed" size="sm" mt={4}>
                  Flags defined in the app will show up here.
                </Text>
              </Paper>
            );
          }

          return (
            <Paper withBorder>
              <Accordion
                multiple
                chevronPosition="right"
                value={openFeatures}
                onChange={setOpenFeatures}
              >
                {features.map((feature) => (
                  <FeatureAccordion
                    key={feature.feature}
                    feature={feature}
                    isOpen={openFeatures.includes(feature.feature)}
                  />
                ))}
              </Accordion>
            </Paper>
          );
        }}
      </LoadingSwitch>
    </Stack>
  );
}
