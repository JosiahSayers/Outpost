import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { searchCategories } from "$/utils/search-helpers";
import { gearCategorySearch } from "$/validation/gear-category";
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
