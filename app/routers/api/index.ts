import { accountRouter } from "$/routers/api/account";
import { gearCategoriesRouter } from "$/routers/api/gear-categories";
import { gearInventoryRouter } from "$/routers/api/gear-inventory";
import { packingListRouter } from "$/routers/api/packing-list";
import { placesRouter } from "$/routers/api/places";
import { tripRouter } from "$/routers/api/trip";
import { Router } from "express";

export const apiRouter = Router();

apiRouter.use("/gear-inventory", gearInventoryRouter);
apiRouter.use("/gear-categories", gearCategoriesRouter);
apiRouter.use("/packing-lists", packingListRouter);
apiRouter.use("/places", placesRouter);
apiRouter.use("/trips", tripRouter);
apiRouter.use("/account", accountRouter);
