import { Router } from "express";

import { showDashboard } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, showDashboard);

export default router;
