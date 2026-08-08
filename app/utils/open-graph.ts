import { fetchGuarded, type GuardedFetchOptions } from "$/utils/guarded-fetch";
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

const HTML_CONTENT_TYPE = /\b(text\/html|application\/xhtml\+xml)\b/i;

export async function fetchOpenGraph(
  url: string,
  {
    fetchImpl,
    lookupImpl,
  }: Pick<GuardedFetchOptions, "fetchImpl" | "lookupImpl"> = {},
) {
  const { bytes } = await fetchGuarded(url, {
    fetchImpl,
    lookupImpl,
    allowedContentTypes: HTML_CONTENT_TYPE,
    headers: {
      "User-Agent": "facebookexternalhit/1.1",
    },
  });
  const text = new TextDecoder().decode(bytes);

  const $ = cheerio.load(text);

  return Object.fromEntries(
    Object.entries(LINK_TO_OG).map(([key, selector]) => [
      key,
      $(`meta[property="${selector}"]`).attr("content"),
    ]),
  );
}
