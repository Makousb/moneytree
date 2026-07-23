import { Router } from "express";

import {
  listBudgetsPage,
  setBudget
} from "../controllers/budgets.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listBudgetsPage);
router.post("/", setBudget);

export default router;
