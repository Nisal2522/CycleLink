/**
 * src/controllers/transactionController.js — Transactions/Scanner: request data, services, responseFormatter only.
 */
import asyncHandler from "express-async-handler";
import { success } from "../utils/responseFormatter.js";
import * as transactionService from "../services/transactionService.js";

export const redeemTokens = asyncHandler(async (req, res) => {
  const { cyclistId, tokens } = req.body;
  if (!cyclistId || !tokens || typeof tokens !== "number" || tokens <= 0) {
    res.status(400);
    throw new Error("cyclistId and positive tokens are required");
  }
  const data = await transactionService.redeemTokens(req.user._id, cyclistId, tokens);
  success(res, data, data.message);
});

export const confirmRedeem = asyncHandler(async (req, res) => {
  const { transactionId, cyclistId, tokenAmount } = req.body;
  if (!transactionId || !cyclistId || tokenAmount == null) {
    res.status(400);
    throw new Error("transactionId, cyclistId, and tokenAmount are required");
  }
  const data = await transactionService.confirmRedeem(req.user._id, req.body);
  success(res, data, data.message);
});
