import { Router } from "express";

import { showLanding } from "../controllers/public.controller.js";

const router = Router();

router.get("/", showLanding);

export default router;
