import { hostnameOf } from "$/frontend/trip/links/hostname";
import { hashIndex } from "$/frontend/utils/hash-index";
import type { ClientTripLink } from "$/transformers/trip-link";
import { Center, Image, Text } from "@mantine/core";
import { useState } from "react";

const PALETTES = ["trail-green", "bark-brown", "trail-dust"];

/** Deterministic per-site gradient drawn only from the theme's own palettes,
 * so a link without an og:image still gets an on-brand fallback avatar. */
function paletteGradient(seed: string): [string, string] {
  const name = PALETTES[hashIndex(seed, PALETTES.length)];
  return [`var(--mantine-color-${name}-5)`, `var(--mantine-color-${name}-8)`];
}

const THUMB_HEIGHT = 160;

export default function LinkThumb({ link }: { link: ClientTripLink }) {
  const [imgError, setImgError] = useState(false);
  const hostname = hostnameOf(link.url);

  if (link.imageUrl && !imgError) {
    return (
      <Image
        src={link.imageUrl}
        h={THUMB_HEIGHT}
        fit="cover"
        alt=""
        onError={() => setImgError(true)}
      />
    );
  }

  const label = link.siteName || hostname;
  const [from, to] = paletteGradient(hostname);
  return (
    <Center
      h={THUMB_HEIGHT}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <Text
        ff="var(--mantine-font-family-headings)"
        fw={700}
        fz={24}
        c="white"
        ta="center"
        px="md"
      >
        {label}
      </Text>
    </Center>
  );
}
