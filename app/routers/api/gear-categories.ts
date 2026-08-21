import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { searchCategories, suggestCategories } from "$/utils/search-helpers";
import {
  gearCategorySearch,
  gearCategorySuggest,
} from "$/validation/gear-category";
import { Router } from "express";
import validate from "express-zod-safe";

export const gearCategoriesRouter = Router();
gearCategoriesRouter.use(requireValidSession);

gearCategoriesRouter.get(
  "/",
  validate({ query: gearCategorySearch }),
  async (req, res) => {
    const matchingCategories = await searchCategories(
      req.query.query,
      req.session!.user.id,
    );
    return res.json({
      categories: matchingCategories.map(transformers.gearCategory),
    });
  },
);

gearCategoriesRouter.get(
  "/suggestions",
  validate({ query: gearCategorySuggest }),
  async (req, res) => {
    const suggestedCategories = await suggestCategories(
      req.query.itemName,
      req.session!.user.id,
    );
    return res.json({
      categories: suggestedCategories.map(transformers.gearCategory),
    });
  },
);
