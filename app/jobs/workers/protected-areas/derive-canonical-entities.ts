import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultWorkerOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import { Worker, type Job } from "bullmq";

export const PROTECTED_AREAS__DERIVE_CANONICAL_ENTITIES_WORKER =
  "protected_areas__derive_canonical_entities";

// Provenance label stored on the crosswalk rows this job creates.
const PADUS_SOURCE_LABEL = "PAD-US 4.1";

export interface DeriveCanonicalEntitiesResult {
  // Canonical Place rows created this run (one per new name+state group).
  created: number;
  // Existing Place rows re-synced from their (updated) source group.
  synced: number;
}

// Derives canonical `Place` rows from the raw PAD-US `ProtectedArea` source
// records and maintains the `PlaceSourceId` crosswalk that links them.
//
// DEDUP: PAD-US represents one physical unit across several feature classes
// (Fee / Designation / Proclamation / Marine / Easement) -- e.g. "Pictured
// Rocks National Lakeshore" is 5 rows with different acreage. We collapse rows
// sharing an exact normalized name (place_norm_name) + state into ONE Place,
// linking every member OID as a PADUS_OBJECTID crosswalk row (so provenance and
// per-feature-class detail are preserved and reachable through the relation).
//
// Set-based and idempotent. A PAD-US re-ingest upserts source rows in place, so
// this must also SYNC existing groups (step 4) and attach any newly-seen OIDs
// to their group (step 2). Safe to re-run any number of times.
export async function deriveCanonicalEntities(): Promise<DeriveCanonicalEntitiesResult> {
  // 1: create a Place for each name+state group that doesn't have one yet.
  // Derived group values: a representative name (deterministic MIN), the
  // most-permissive Pub_Access mapped to a word, the best backpacking tier
  // (see place_backpacking_tier below), and the largest acreage.
  const created = await db.$executeRaw`
    INSERT INTO "Place" (id, "createdAt", "updatedAt", name, state, "publicAccess", "backpackingTier", acres)
    SELECT
      gen_random_uuid(), now(), now(),
      MIN(regexp_replace(btrim(pa."unitName"), '\\s+', ' ', 'g')),
      pa.state,
      (ARRAY['Open', 'Restricted', 'Unknown', 'Closed'])[MIN(
        CASE pa."publicAccess"
          WHEN 'OA' THEN 1 WHEN 'RA' THEN 2 WHEN 'UK' THEN 3 WHEN 'XA' THEN 4
          ELSE 5
        END
      )],
      MAX(place_backpacking_tier(pa."publicAccess", pa."designationType", pa."managerType", pa.category::text)),
      MAX(pa.acres)
    FROM "ProtectedArea" pa
    WHERE NOT EXISTS (
      SELECT 1 FROM "Place" p
      WHERE place_norm_name(p.name) = place_norm_name(pa."unitName")
        AND p.state IS NOT DISTINCT FROM pa.state
    )
    GROUP BY place_norm_name(pa."unitName"), pa.state
  `;

  // 2: link every source row to its group's Place via a PADUS_OBJECTID
  // crosswalk row (with the direct FK to the source record). Idempotent, and
  // also attaches OIDs first seen in a re-ingest to their existing group.
  await db.$executeRaw`
    INSERT INTO "PlaceSourceId" (id, "placeId", "idType", "idValue", source, "protectedAreaId")
    SELECT gen_random_uuid(), p.id, 'PADUS_OBJECTID', pa."sourceUniqueId", ${PADUS_SOURCE_LABEL}, pa.id
    FROM "ProtectedArea" pa
    JOIN "Place" p
      ON place_norm_name(p.name) = place_norm_name(pa."unitName")
      AND p.state IS NOT DISTINCT FROM pa.state
    ON CONFLICT ("idType", "idValue") DO NOTHING
  `;

  // 3: link distinct real WDPA codes per Place. "0"/"" are PAD-US "no code"
  // sentinels and must not become identity keys.
  await db.$executeRaw`
    INSERT INTO "PlaceSourceId" (id, "placeId", "idType", "idValue", source)
    SELECT gen_random_uuid(), grouped."placeId", 'WDPA_Cd', grouped."wdpaCode", ${PADUS_SOURCE_LABEL}
    FROM (
      SELECT DISTINCT p.id AS "placeId", pa."wdpaCode"
      FROM "ProtectedArea" pa
      JOIN "Place" p
        ON place_norm_name(p.name) = place_norm_name(pa."unitName")
        AND p.state IS NOT DISTINCT FROM pa.state
      WHERE pa."wdpaCode" IS NOT NULL AND pa."wdpaCode" NOT IN ('0', '')
    ) grouped
    ON CONFLICT ("idType", "idValue") DO NOTHING
  `;

  // 4: re-sync the derived fields for existing groups (propagates re-ingest
  // updates). Gated so unchanged groups aren't rewritten (which would refire
  // the FTS trigger for nothing).
  const synced = await db.$executeRaw`
    UPDATE "Place" p
    SET name = agg.repr_name,
        "publicAccess" = agg.public_access,
        "backpackingTier" = agg.tier,
        acres = agg.acres,
        "updatedAt" = now()
    FROM (
      SELECT
        place_norm_name(pa."unitName") AS name_key,
        pa.state AS state,
        MIN(regexp_replace(btrim(pa."unitName"), '\\s+', ' ', 'g')) AS repr_name,
        (ARRAY['Open', 'Restricted', 'Unknown', 'Closed'])[MIN(
          CASE pa."publicAccess"
            WHEN 'OA' THEN 1 WHEN 'RA' THEN 2 WHEN 'UK' THEN 3 WHEN 'XA' THEN 4
            ELSE 5
          END
        )] AS public_access,
        MAX(place_backpacking_tier(pa."publicAccess", pa."designationType", pa."managerType", pa.category::text)) AS tier,
        MAX(pa.acres) AS acres
      FROM "ProtectedArea" pa
      GROUP BY place_norm_name(pa."unitName"), pa.state
    ) agg
    WHERE place_norm_name(p.name) = agg.name_key
      AND p.state IS NOT DISTINCT FROM agg.state
      AND (p.name IS DISTINCT FROM agg.repr_name
           OR p."publicAccess" IS DISTINCT FROM agg.public_access
           OR p."backpackingTier" IS DISTINCT FROM agg.tier
           OR p.acres IS DISTINCT FROM agg.acres)
  `;

  return { created, synced };
}

export async function deriveCanonicalEntitiesJob(
  job: Job,
): Promise<DeriveCanonicalEntitiesResult> {
  const logger = getLogger(job);
  try {
    const result = await deriveCanonicalEntities();
    logger.info("Canonical entity derivation complete", result);
    return result;
  } catch (err) {
    logger.error("Canonical entity derivation failed", { error: err });
    throw err;
  }
}

export const deriveCanonicalEntitiesWorker = new Worker(
  PROTECTED_AREAS__DERIVE_CANONICAL_ENTITIES_WORKER,
  (job) => deriveCanonicalEntitiesJob(job),
  {
    ...defaultWorkerOptions,
    // One derivation at a time, generous lock -- consistent with the other
    // PAD-US workers and keeps the big set-based statements from contending.
    concurrency: 1,
    lockDuration: 60 * 60_000, // 1 hour
  },
);
