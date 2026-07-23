import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { searchPlaces } from "$/utils/search-helpers";
import { placeSearch } from "$/validation/place";
import { Router } from "express";
import validate from "express-zod-safe";

export const placesRouter = Router();
placesRouter.use(requireValidSession);

placesRouter.get("/", validate({ query: placeSearch }), async (req, res) => {
  const matchingPlaces = await searchPlaces(req.query.query, {
    state: req.query.state,
    limit: req.query.limit,
    includeLowValue: req.query.includeLowValue === "true",
  });
  return res.json({
    places: matchingPlaces.map(transformers.place),
  });
});
