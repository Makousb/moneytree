import { Router } from "express";

import {
  addLoan,
  addPayment,
  removeLoan,
  showLoansPage,
  showPlanPage
} from "../controllers/loans.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", showLoansPage);
router.post("/", addLoan);
router.get("/plan", showPlanPage);
router.post("/:id/payments", addPayment);
router.post("/:id/delete", removeLoan);

export default router;
