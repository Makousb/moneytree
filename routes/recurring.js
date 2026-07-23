import { Router } from "express";

import {
  addRecurring,
  removeRecurring,
  showRecurringPage,
  toggleRecurring
} from "../controllers/recurring.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", showRecurringPage);
router.post("/", addRecurring);
router.post("/:id/toggle", toggleRecurring);
router.post("/:id/delete", removeRecurring);

export default router;
