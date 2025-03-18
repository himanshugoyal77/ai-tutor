"use client"

import { useState } from "react";

export default function Chat({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");

  async function handleSend() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, input }),
    });
    const data = await res.json();
    setResponse(data.response);
  }

  return (
    <div className="chat-container">
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSend}>Send</button>
      <p>{response}</p>
    </div>
  );
}
