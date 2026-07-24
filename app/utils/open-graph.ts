import { faker } from "@faker-js/faker";
import * as cheerio from "cheerio";
import type { TripLink } from "../../generated/prisma/client";

const LINK_TO_OG: Record<
  keyof Omit<TripLink, "id" | "createdAt" | "updatedAt" | "tripId" | "url">,
  string
> = {
  name: "og:title",
  description: "og:description",
  imageUrl: "og:image",
  type: "og:type",
  siteName: "og:site_name",
  audioUrl: "og:audio",
  videoUrl: "og:video",
};

export async function fetchOpenGraph(url: string, fetchImpl = fetch) {
  const res = await fetchImpl(url, {
    headers: { "User-Agent": faker.internet.userAgent() },
  });

  const text = await res.text();

  const $ = cheerio.load(text);

  return Object.fromEntries(
    Object.entries(LINK_TO_OG).map(([key, selector]) => [
      key,
      $(`meta[property="${selector}"]`).attr("content"),
    ]),
  );
}
