/**
 * routes/aiRoutes.js
 * --------------------------------------------------
 * AI chat: POST /api/ai/chat (non-streaming), POST /api/ai/chat/stream (streaming).
 * Rate limited per IP so we don't blow Gemini quota.
 */

import express from "express";
import { aiRateLimiter } from "../middleware/aiRateLimiter.js";
import { chat, chatStream } from "../controllers/aiController.js";

const router = express.Router();

router.post("/chat", aiRateLimiter, chat);
router.post("/chat/stream", aiRateLimiter, chatStream);

export default router;
