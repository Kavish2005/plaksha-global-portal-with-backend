"use client";

import { useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  MessageSquareText,
  SendHorizontal,
  Sparkles,
  BrainCircuit,
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

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadHistory() {
      if (activeUser?.role !== "student") {
        setMessages([]);
        return;
      }

      try {
        const history =
          await apiGet<ChatInteraction[]>(
            "/chat/history",
          );

        setMessages(
          history
            .slice()
            .reverse()
            .flatMap((item) => [
              {
                role: "user" as const,
                text:
                  item.cleanQuery ||
                  item.query,
                createdAt:
                  item.createdAt,
              },
              {
                role: "bot" as const,
                text: item.response,
                createdAt:
                  item.createdAt,
              },
            ]),
        );
      } catch {
        setMessages([]);
      }
    }

    void loadHistory();
  }, [activeUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, open]);

  async function sendMessage() {
    const trimmed = input.trim();

    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        text: trimmed,
      },
    ];

    setMessages(nextMessages);

    setInput("");

    setLoading(true);

    try {
      const response =
        await apiPost<{
          reply: string;
          interaction: ChatInteraction;
        }>("/chat", {
          message: trimmed,
        });

      setMessages([
        ...nextMessages,
        {
          role: "bot",
          text: response.reply,
          createdAt:
            response.interaction
              .createdAt,
        },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "bot",
          text:
            getErrorMessage(error) ||
            "Global systems are temporarily unavailable.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-100">
      {/* Chat Window */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{
              opacity: 0,
              y: 24,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 24,
              scale: 0.96,
            }}
            transition={{
              duration: 0.25,
            }}
            className="mb-4 w-[24rem] overflow-hidden rounded-4xl border border-white/10 bg-[#081120]/95 backdrop-blur-3xl shadow-[0_0_80px_rgba(59,130,246,0.18)]"
          >
            {/* Ambient Glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[-20%] top-[-20%] h-56 w-56 rounded-full bg-blue-500/20 blur-[120px]" />

              <div className="absolute bottom-[-20%] right-[-20%] h-56 w-56 rounded-full bg-violet-500/20 blur-[120px]" />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-violet-500 shadow-[0_0_35px_rgba(59,130,246,0.3)]">
                  <BrainCircuit className="h-5 w-5 text-white" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">
                      Global AI Assistant
                    </h2>

                    <div className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Live
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-white/40">
                    AI-powered academic guidance
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]/4 text-white/60 transition duration-300 hover:bg-white/[0.04]/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Intro Banner */}
            <div className="border-b border-white/10 bg-white/[0.04]/3 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Sparkles className="h-4 w-4 text-blue-300" />
                </div>

                <p className="text-xs leading-6 text-white/60">
                  Ask about scholarships, exchange programs,
                  deadlines, application strategies,
                  mentor guidance, or international
                  opportunities.
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="relative h-104 overflow-y-auto px-4 py-5">
              <div className="space-y-5">
                {messages.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04]/3 p-5">
                    <div className="flex items-center gap-3">
                      <Globe2 className="h-5 w-5 text-blue-300" />

                      <div className="text-sm font-medium text-white">
                        Welcome to the Global Intelligence Layer
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-white/55">
                      I can help you discover international
                      programs, scholarships, deadlines,
                      application support, and mentorship
                      opportunities.
                    </p>
                  </div>
                ) : null}

                {messages.map(
                  (message, index) => (
                    <motion.div
                      key={`${message.role}-${index}`}
                      initial={{
                        opacity: 0,
                        y: 12,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.25,
                      }}
                      className={`flex ${
                        message.role ===
                        "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-3xl px-4 py-3 ${
                          message.role ===
                          "user"
                            ? "border border-blue-400/20 bg-blue-500/15 text-white"
                            : "border border-white/10 bg-white/[0.04]/4 text-white/80"
                        }`}
                      >
                        <p className="text-sm leading-7">
                          {message.text}
                        </p>

                        {message.createdAt ? (
                          <div
                            className={`mt-3 text-[11px] ${
                              message.role ===
                              "user"
                                ? "text-blue-100/50"
                                : "text-white/30"
                            }`}
                          >
                            {formatDateTime(
                              message.createdAt,
                            )}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ),
                )}

                {loading ? (
                  <motion.div
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    className="flex justify-start"
                  >
                    <div className="rounded-3xl border border-white/10 bg-white/[0.04]/4 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
                        <div className="h-2 w-2 animate-pulse rounded-full bg-violet-300 delay-75" />
                        <div className="h-2 w-2 animate-pulse rounded-full bg-white/[0.04] delay-150" />
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04]/4 p-2 backdrop-blur-xl">
                <input
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void sendMessage();
                    }
                  }}
                  placeholder="Ask about global opportunities..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                />

                <button
                  onClick={() =>
                    void sendMessage()
                  }
                  disabled={loading}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-violet-500 text-white transition-all duration-300 hover:scale-105 disabled:opacity-50"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Floating Trigger */}
      <motion.button
        whileHover={{
          scale: 1.04,
        }}
        whileTap={{
          scale: 0.96,
        }}
        onClick={() =>
          setOpen((value) => !value)
        }
        className="group relative overflow-hidden rounded-full border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-2xl"
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_40%)] opacity-0 transition duration-500 group-hover:opacity-100" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-violet-500 shadow-[0_0_35px_rgba(59,130,246,0.3)]">
            <MessageSquareText className="h-5 w-5 text-white" />
          </div>

          <div className="text-left">
            <div className="text-sm font-medium text-white">
              Global Assistant
            </div>

            <div className="text-xs text-white/40">
              AI-powered guidance
            </div>
          </div>
        </div>
      </motion.button>
    </div>
  );
}

