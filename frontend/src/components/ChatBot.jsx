/**
 * ChatBot.jsx
 * --------------------------------------------------
 * Global AI assistant: streaming responses, chunk-by-chunk display.
 * Only sends to the AI when the user clicks Send or presses Enter — no socket
 * or typing indicators trigger the API.
 */

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { sendAiChatStream } from "../services/aiService";

// Fallback responses when AI fails — always show something friendly (Sinhala + English)
const RATE_LIMIT_MSG =
  "දැන් ඉල්ලීම් බොහෝයි. මිනිත්තු 60කින් යළි උත්සාහ කරන්න. / Too many requests right now. Please try again in 60 seconds.";
const FALLBACK_MSG =
  "දැනට පිළිතුරු දිය නොහැක. ටිකකින් යළි උත්සාහ කරන්න. / I can't respond right now. Please try again in a moment.";
const COOLDOWN_SECONDS = 60;

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const isSendingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const constraintsRef = useRef(null);
  const didDragRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 429 cooldown: countdown from 60 seconds so user knows when they can try again
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = setInterval(() => {
      setCooldownSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownSeconds]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (loading || isSendingRef.current || cooldownSeconds > 0) return;

    isSendingRef.current = true;
    setInput("");
    const userMsg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
    setLoading(true);

    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

    sendAiChatStream(trimmed, history, {
      onChunk: (text) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            next[next.length - 1] = { ...last, content: (last.content || "") + text };
          }
          return next;
        });
      },
      onDone: () => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
        setLoading(false);
        isSendingRef.current = false;
      },
      onError: (err, status) => {
        const content = status === 429 ? RATE_LIMIT_MSG : (err?.message || FALLBACK_MSG);
        if (status === 429) setCooldownSeconds(COOLDOWN_SECONDS);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            next[next.length - 1] = { role: "assistant", content, error: true };
          } else {
            next.push({ role: "assistant", content, error: true });
          }
          return next;
        });
        setLoading(false);
        isSendingRef.current = false;
      },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Viewport-sized constraint so the button stays on screen when dragged */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[9998]" aria-hidden />
      {/* Draggable floating button — purple circle, white icon; click opens chat, drag repositions */}
      <motion.button
        type="button"
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => { didDragRef.current = true; }}
        onDragEnd={() => { /* position stays where dropped */ }}
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          setOpen((o) => !o);
        }}
        className="fixed bottom-20 right-4 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 md:bottom-6 md:right-6 cursor-grab active:cursor-grabbing touch-none md:touch-auto"
        style={{ pointerEvents: "auto" }}
        aria-label={open ? "Close chat" : "Open AI assistant"}
      >
        <MessageCircle className="h-7 w-7 text-white pointer-events-none" />
      </motion.button>

      {/* Popup — above button and mobile nav */}
      {open && (
        <div
          className="fixed bottom-[5.5rem] right-4 z-[10000] flex w-[min(calc(100vw-2rem),400px)] flex-col overflow-hidden rounded-2xl border border-primary-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-2xl md:bottom-24 md:right-6"
          style={{ maxHeight: "min(70vh, 520px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <span className="font-semibold">Cycle Assistant</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-primary-50 dark:bg-slate-800/50 p-3" style={{ minHeight: 240 }}>
            {messages.length === 0 && !loading && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Ask about bike-friendly shops, safety tips, or app features.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`mb-3 ${m.role === "user" ? "flex justify-end" : ""}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow border border-primary-100 dark:border-slate-600"
                  } ${m.error ? "text-amber-700 dark:text-amber-400" : ""}`}
                >
                  {m.role === "user" ? (
                    m.content
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-primary prose-a:no-underline">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && !(messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.streaming && messages[messages.length - 1]?.content) && (
              <div className="mb-3 flex items-center gap-2 text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-700 px-3 py-2 shadow border border-primary-100 dark:border-slate-600">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                  </span>
                  <span className="text-xs">Thinking...</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-primary-100 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
            {cooldownSeconds > 0 && (
              <p className="mb-2 text-center text-xs text-amber-600">
                Try again in {cooldownSeconds} seconds.
              </p>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={cooldownSeconds > 0 ? "Wait to send..." : "Type a message..."}
                disabled={loading || cooldownSeconds > 0}
                className="flex-1 rounded-xl border border-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || cooldownSeconds > 0 || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-600 disabled:opacity-50 disabled:pointer-events-none"
                aria-label="Send"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
