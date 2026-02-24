/**
 * routes/chatRoutes.js
 * --------------------------------------------------
 * Chat API routes. All require protect.
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import {
  createOrGetOneOnOneChat,
  createGroupChat,
  getMyChats,
  getMessages,
  searchUsers,
  editMessage,
  deleteMessage,
} from "../controllers/chatController.js";

const router = express.Router();

router.use(protect);

router.get("/", asyncHandler(getMyChats));
router.get("/users", asyncHandler(searchUsers));
router.get("/:chatId/messages", asyncHandler(getMessages));
router.patch("/:chatId/messages/:messageId", asyncHandler(editMessage));
router.delete("/:chatId/messages/:messageId", asyncHandler(deleteMessage));
router.post("/", asyncHandler(createOrGetOneOnOneChat));
router.post("/group", asyncHandler(createGroupChat));

export default router;
