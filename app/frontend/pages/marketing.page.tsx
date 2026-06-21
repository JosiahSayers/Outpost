import CallToAction from "$/frontend/marketing/call-to-action";
import Hero from "$/frontend/marketing/hero";
import Highlights from "$/frontend/marketing/highlights";
import { Box } from "@mantine/core";

export default function MarketingPage() {
  return (
    <Box>
      <Hero />
      <Highlights />
      <CallToAction />
    </Box>
  );
}
