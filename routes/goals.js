import { Router } from "express";

import {
  addGoal,
  contributeToGoal,
  listGoalsPage
} from "../controllers/goals.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listGoalsPage);
router.post("/", addGoal);
router.post("/:id/contribute", contributeToGoal);

export default router;
