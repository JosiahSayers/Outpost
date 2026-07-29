import logoDark from "$/../assets/images/outpost-logo-no-tagline-dark.svg";
import logoLight from "$/../assets/images/outpost-logo-no-tagline.svg";
import { Image, useComputedColorScheme } from "@mantine/core";
import type { CSSProperties } from "react";

interface Props {
  height: number;
  style?: CSSProperties;
}

// The wordmark is a static SVG with baked-in colors, so it can't adapt to
// color scheme via CSS — it needs a second asset swapped in by scheme.
export default function AppLogo({ height, style }: Props) {
  const colorScheme = useComputedColorScheme("light");

  return (
    <Image
      src={colorScheme === "dark" ? logoDark : logoLight}
      alt="Outpost"
      w="auto"
      height={height}
      style={style}
    />
  );
}
