import { Router } from "express";

import {
  addAccount,
  listAccountsPage
} from "../controllers/accounts.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listAccountsPage);
router.post("/", addAccount);

export default router;
