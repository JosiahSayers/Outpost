import CallToAction from "$/frontend/marketing/call-to-action";
import Hero from "$/frontend/marketing/hero";
import Highlights from "$/frontend/marketing/highlights";
import { useUnauthenticatedGuard } from "$/frontend/utils/guards/unauthenticated.guard";
import { Box } from "@mantine/core";

export default function MarketingPage() {
  useUnauthenticatedGuard("/dashboard");

  return (
    <Box>
      <Hero />
      <Highlights />
      <CallToAction />
    </Box>
  );
}
