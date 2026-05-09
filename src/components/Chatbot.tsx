"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  MessageSquareText,
  SendHorizontal,
  Globe2,
  X,
  Minus,
  Maximize2,
} from "lucide-react";

import { apiGet, apiPost } from "@/services/api";

import {
  formatDateTime,
  getErrorMessage,
} from "@/lib/utils";

import { useAuth } from "@/components/AuthProvider";

import type { ChatInteraction } from "@/types";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
  createdAt?: string;
};

const MIN_W = 280;
const MAX_W = 680;
const MIN_H = 200;
const MAX_H = 720;
const DEFAULT_W = 352;
const DEFAULT_H = 384;

export default function Chatbot() {
  const { activeUser } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const resizeState = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    async function loadHistory() {
      if (activeUser?.role !== "student") {
        setMessages([]);
        return;
      }
      try {
        const history = await apiGet<ChatInteraction[]>("/chat/history");
        setMessages(
          history
            .slice()
            .reverse()
            .flatMap((item) => [
              { role: "user" as const, text: item.cleanQuery || item.query, createdAt: item.createdAt },
              { role: "bot" as const, text: item.response, createdAt: item.createdAt },
            ]),
        );
      } catch {
        setMessages([]);
      }
    }
    void loadHistory();
  }, [activeUser]);

  useEffect(() => {
    if (!minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await apiPost<{ reply: string; interaction: ChatInteraction }>("/chat", { message: trimmed });
      setMessages([...nextMessages, { role: "bot", text: response.reply, createdAt: response.interaction.createdAt }]);
    } catch (error) {
      setMessages([...nextMessages, { role: "bot", text: getErrorMessage(error) || "Global systems are temporarily unavailable." }]);
    } finally {
      setLoading(false);
    }
  }

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      resizeState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.w,
        startH: size.h,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [size],
  );

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current?.active) return;
    const dx = resizeState.current.startX - e.clientX; // drag left → wider
    const dy = resizeState.current.startY - e.clientY; // drag up → taller
    setSize({
      w: Math.max(MIN_W, Math.min(MAX_W, resizeState.current.startW + dx)),
      h: Math.max(MIN_H, Math.min(MAX_H, resizeState.current.startH + dy)),
    });
  }, []);

  const onResizePointerUp = useCallback(() => {
    if (resizeState.current) resizeState.current.active = false;
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            style={{ width: size.w }}
            className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            {/* Resize handle — top-left corner grip */}
            {!minimized && (
              <div
                onPointerDown={onResizePointerDown}
                onPointerMove={onResizePointerMove}
                onPointerUp={onResizePointerUp}
                className="absolute left-0 top-0 h-5 w-5 cursor-nw-resize rounded-tl-xl"
                title="Drag to resize"
              >
                {/* Visual grip dots */}
                <svg width="14" height="14" viewBox="0 0 14 14" className="absolute left-1 top-1 text-slate-300">
                  <circle cx="3" cy="3" r="1.2" fill="currentColor" />
                  <circle cx="7" cy="3" r="1.2" fill="currentColor" />
                  <circle cx="3" cy="7" r="1.2" fill="currentColor" />
                  <circle cx="7" cy="7" r="1.2" fill="currentColor" />
                </svg>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-teal-700 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Globe2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Global AI Assistant</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    <p className="text-[10px] text-white/70">AI-powered academic guidance</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Minimize / expand */}
                <button
                  onClick={() => setMinimized((v) => !v)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                  title={minimized ? "Expand" : "Minimise"}
                >
                  {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-4 w-4" />}
                </button>
                {/* Reset size */}
                {!minimized && (size.w !== DEFAULT_W || size.h !== DEFAULT_H) && (
                  <button
                    onClick={() => setSize({ w: DEFAULT_W, h: DEFAULT_H })}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                    title="Reset size"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M2 2h5v5M14 14H9V9" /><path d="M2 2l5 5M14 14l-5-5" />
                    </svg>
                  </button>
                )}
                {/* Close */}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Collapsible body */}
            {!minimized && (
              <>
                {/* Messages */}
                <div
                  className="overflow-y-auto bg-slate-50 px-4 py-4"
                  style={{ height: size.h }}
                >
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2">
                          <Globe2 className="h-4 w-4 text-teal-600" />
                          <p className="text-sm font-semibold text-slate-800">Welcome to the Global Assistant</p>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          Ask about international programs, scholarships, deadlines, applications, and mentorship opportunities.
                        </p>
                      </div>
                    ) : null}

                    {messages.map((message, index) => (
                      <motion.div
                        key={`${message.role}-${index}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3.5 py-2.5 ${
                            message.role === "user"
                              ? "bg-teal-600 text-white"
                              : "border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.text}</p>
                          {message.createdAt ? (
                            <p className={`mt-1.5 text-[10px] ${message.role === "user" ? "text-white/60" : "text-slate-400"}`}>
                              {formatDateTime(message.createdAt)}
                            </p>
                          ) : null}
                        </div>
                      </motion.div>
                    ))}

                    {loading ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 animate-bounce rounded-full bg-teal-500" />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:0.1s]" />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:0.2s]" />
                          </div>
                        </div>
                      </motion.div>
                    ) : null}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-slate-100 bg-white p-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(); }}
                      placeholder="Ask about global opportunities..."
                      className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                    <button
                      onClick={() => void sendMessage()}
                      disabled={loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50"
                    >
                      <SendHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Floating Trigger */}
      <button
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
            setMinimized(false);
          }
        }}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-md transition hover:shadow-lg hover:border-teal-200"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600">
          <MessageSquareText className="h-4 w-4 text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-800">Global Assistant</p>
          <p className="text-xs text-slate-400">AI-powered guidance</p>
        </div>
      </button>
    </div>
  );
}
