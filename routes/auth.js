import { Router } from "express";

import {
  login,
  logout,
  register,
  showLogin,
  showRegister
} from "../controllers/auth.controller.js";
import { redirectIfAuthed } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/register", redirectIfAuthed, showRegister);
router.post("/register", redirectIfAuthed, register);
router.get("/login", redirectIfAuthed, showLogin);
router.post("/login", redirectIfAuthed, login);
router.post("/logout", logout);

export default router;
