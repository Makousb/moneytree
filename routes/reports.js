import { Router } from "express";

import { showReports } from "../controllers/reports.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, showReports);

export default router;
