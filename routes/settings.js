import { Router } from "express";

import {
  refreshFxRates,
  showSettings,
  updateCurrency
} from "../controllers/settings.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", showSettings);
router.post("/currency", updateCurrency);
router.post("/fx/refresh", refreshFxRates);

export default router;
