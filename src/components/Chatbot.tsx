"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, SendHorizontal } from "lucide-react";
import { apiGet, apiPost } from "@/services/api";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
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
              { role: "user" as const, text: item.query, createdAt: item.createdAt },
              { role: "bot" as const, text: item.response, createdAt: item.createdAt },
            ]),
        );
      } catch (_error) {
        setMessages([]);
      }
    }

    void loadHistory();
  }, [activeUser]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await apiPost<{ reply: string; interaction: ChatInteraction }>("/chat", {
        message: trimmed,
      });
      setMessages([...nextMessages, { role: "bot", text: response.reply, createdAt: response.interaction.createdAt }]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "bot",
          text: getErrorMessage(error) || "I could not connect right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[22rem]">
      {open ? (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-black/5 bg-[var(--portal-panel)] px-4 py-3">
            <div>
              <p className="font-semibold">Global Assistant</p>
              <p className="text-xs text-slate-500">Rule-based today, LLM-ready next</p>
            </div>
            <button className="text-sm text-slate-500" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <div className="h-80 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">
                Ask about programs, deadlines, mentor bookings, approvals, or how to contact the office.
              </p>
            ) : null}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === "user" ? "bg-slate-100 text-slate-700" : "bg-[var(--portal-teal)] text-white"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.createdAt ? (
                    <p className={`mt-1 text-[11px] ${message.role === "user" ? "text-slate-400" : "text-white/70"}`}>
                      {formatDateTime(message.createdAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-black/5 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void sendMessage();
                }
              }}
              className="flex-1 rounded-2xl border border-black/10 px-4 py-2 outline-none"
              placeholder="Ask something..."
            />

            <button
              onClick={() => void sendMessage()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--portal-teal)] text-white"
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--portal-teal)] px-5 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <MessageSquareText size={16} />
          Global Assistant
        </button>
      </div>
    </div>
  );
}
