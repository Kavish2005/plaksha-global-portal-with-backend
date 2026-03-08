"use client";

import { useState } from "react";
import api from "@/services/api";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

export default function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post<{ reply: string }>("/chat", {
        message: trimmed,
        sessionId: "frontend-session",
      });
      setMessages([...nextMessages, { role: "bot", text: response.data.reply }]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "bot",
          text: "I could not connect right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white shadow-xl rounded-xl border z-50">
      <div className="p-3 border-b font-semibold bg-gray-50">Global Assistant</div>

      <div className="p-4 h-72 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">
            Ask about programs, deadlines, mentor bookings, or how to contact the office.
          </p>
        ) : null}

        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className="mb-3">
            <p
              className={`p-2 rounded-lg text-sm ${
                message.role === "user"
                  ? "bg-gray-100"
                  : "bg-[var(--plaksha-teal)] text-white"
              }`}
            >
              {message.role === "user" ? "You: " : "Bot: "}
              {message.text}
            </p>
          </div>
        ))}
      </div>

      <div className="flex border-t">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void sendMessage();
            }
          }}
          className="flex-1 p-2 outline-none"
          placeholder="Ask something..."
        />

        <button onClick={() => void sendMessage()} className="px-4 bg-[var(--plaksha-teal)] text-white">
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
