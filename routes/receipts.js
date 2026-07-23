import crypto from "crypto";
import path from "path";

import multer from "multer";
import { Router } from "express";

import {
  confirmReceipt,
  serveReceiptImage,
  showReceiptsPage,
  showReviewPage,
  uploadReceipt,
  UPLOADS_DIR
} from "../controllers/receipts.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${req.session.user.id}-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  }
});

const router = Router();

router.use(requireAuth);
router.get("/", showReceiptsPage);
router.post("/upload", upload.single("receipt"), uploadReceipt);
router.get("/:id/review", showReviewPage);
router.post("/:id/confirm", confirmReceipt);
router.get("/:id/image", serveReceiptImage);

export default router;
