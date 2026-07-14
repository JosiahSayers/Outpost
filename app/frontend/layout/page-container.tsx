import { Stack, type StackProps } from "@mantine/core";
import type { ReactNode } from "react";

// Every top-level page centers its content in the same max-width column, so
// this is the single place that width lives — bump it here and every page
// moves together instead of drifting apart one maw={} at a time.
export const PAGE_MAX_WIDTH = 1200;

interface PageContainerProps extends Omit<
  StackProps,
  "maw" | "mx" | "px" | "py"
> {
  children: ReactNode;
}

export default function PageContainer({
  children,
  ...stackProps
}: PageContainerProps) {
  return (
    <Stack
      py="xl"
      px={{ base: "md", md: "xl" }}
      maw={PAGE_MAX_WIDTH}
      mx="auto"
      {...stackProps}
    >
      {children}
    </Stack>
  );
}
