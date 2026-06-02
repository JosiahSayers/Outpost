import { gearCategoriesRouter } from "$/routers/api/gear-categories";
import { gearInventoryRouter } from "$/routers/api/gear-inventory";
import { Router } from "express";

export const apiRouter = Router();

apiRouter.use("/gear-inventory", gearInventoryRouter);
apiRouter.use("/gear-categories", gearCategoriesRouter);
