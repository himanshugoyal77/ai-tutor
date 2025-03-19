"use client";
import { useState } from "react";

export default function ChatBox({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState("general");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message: input, topic }),
    });

    const data = await res.json();
    const aiResponse = { role: "assistant", content: data.response };
    setMessages([...messages, userMessage, aiResponse]);
    setInput("");
  };

  return (
    <div className="max-w-lg mx-auto p-4 bg-white shadow-lg rounded-lg">
      <div className="h-80 overflow-y-auto p-2 border border-gray-300 rounded">
        {messages.map((msg, index) => (
          <p
            key={index}
            className={`p-2 ${
              msg.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <strong>{msg.role === "user" ? "You" : "AI"}:</strong> {msg.content}
          </p>
        ))}
      </div>
      <div className="flex mt-2">
        <input
          type="text"
          className="flex-1 p-2 border rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
