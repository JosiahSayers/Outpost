import maxmind, { type CityResponse } from "maxmind";
import { join } from "node:path";

let maxmindInstance: Awaited<
  ReturnType<typeof maxmind.open<CityResponse>>
> | null = null;

async function tryToOpenDb() {
  if (!Bun.env.DB_IP_DIR) return;

  const filepath = join(Bun.env.DB_IP_DIR, currentLocalCityFile());
  if (await Bun.file(filepath).exists()) {
    maxmindInstance = await maxmind.open<CityResponse>(filepath);
  }
}

export async function lookupIp(ip: string): Promise<CityResponse | null> {
  if (!maxmindInstance) {
    await tryToOpenDb();
    if (!maxmindInstance) return null;
  }

  return maxmindInstance.get(ip);
}

export function localCityFile(year: string | number, month: string | number) {
  return `dbip-city-lite-${year}-${month}.mmdb`;
}

export function localCityFileDate() {
  const today = new Date();
  const year = today.getFullYear();
  // JS Date months are zero-based
  const monthWithOffset = today.getMonth() + 1;
  const month = monthWithOffset < 10 ? `0${monthWithOffset}` : monthWithOffset;
  return { year, month };
}

export function currentLocalCityFile() {
  const { year, month } = localCityFileDate();
  return localCityFile(year, month);
}
