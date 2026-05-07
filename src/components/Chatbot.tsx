"use client";

import { useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  MessageSquareText,
  SendHorizontal,
  Globe2,
  X,
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

export default function Chatbot() {
  const { activeUser } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

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
            className="mb-3 w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
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
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto bg-slate-50 px-4 py-4">
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
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Floating Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
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
