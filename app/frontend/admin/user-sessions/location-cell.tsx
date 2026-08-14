import type { ClientIpLocation } from "$/transformers/ip-location";
import { Text } from "@mantine/core";

interface Props {
  location?: ClientIpLocation | null;
}

export default function LocationCell({ location }: Props) {
  let locationString = "-";

  if (
    location &&
    (location.city || location.country || location.subdivisions[0])
  ) {
    const city = location.city;
    const country = location.country;
    const subdivision = location.subdivisions[0];
    locationString = [city, subdivision, country]
      .filter((val) => !!val)
      .join(", ");
  }

  return <Text size="sm">{locationString}</Text>;
}
