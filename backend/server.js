/**
 * server.js — Entry point: loads env, connects DB, starts HTTP server + Socket.io.
 */
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import app from "./src/app.js";
import { setupChatSocket } from "./src/socket/chatSocket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
connectDB();

const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) : []),
  ...(process.env.FRONTEND_ORIGIN && !process.env.CORS_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []),
].filter(Boolean);

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  path: "/socket.io",
});
app.set("io", io);
setupChatSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api-docs`);
  console.log("Chat socket: connect with auth.token (JWT)");
});
