import type { TripLink } from "../../generated/prisma/browser";

export type ClientTripLink = Pick<
  TripLink,
  | "id"
  | "audioUrl"
  | "description"
  | "imageUrl"
  | "name"
  | "siteName"
  | "type"
  | "url"
  | "videoUrl"
>;

export function transform(item: TripLink): ClientTripLink {
  return {
    id: item.id,
    audioUrl: item.audioUrl,
    description: item.description,
    imageUrl: item.imageUrl,
    name: item.name,
    siteName: item.siteName,
    type: item.type,
    url: item.url,
    videoUrl: item.videoUrl,
  };
}
