import type { CityResponse } from "maxmind";
import type { Session } from "../../../generated/prisma/browser";
import {
  transform as ipLocationTransform,
  type ClientIpLocation,
} from "../ip-location";

export type ClientSession = Pick<
  Session,
  | "id"
  | "createdAt"
  | "expiresAt"
  | "impersonatedBy"
  | "ipAddress"
  | "updatedAt"
  | "userAgent"
> & { location?: ClientIpLocation | null };

type SessionTransformInput = Session & { location?: CityResponse | null };

export function transform(item: SessionTransformInput): ClientSession {
  return {
    id: item.id,
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    impersonatedBy: item.impersonatedBy,
    ipAddress: item.ipAddress,
    updatedAt: item.updatedAt,
    userAgent: item.userAgent,
    location: item.location ? ipLocationTransform(item.location) : null,
  };
}
