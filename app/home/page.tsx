"use client";

import supabaseClient from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const page = () => {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [userId, setUserId] = useState("");

  React.useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session) {
        const { data: userData } = await supabaseClient.auth.getUser();
        setUserId(userData.user?.id as string);
      } else {
        router.push("/");
      }
    };

    checkAuth();
  }, []);

  async function handleSend() {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ input, userId }),
    });
    setResponse(await res.text());
  }

  return (
    <div>
      <div>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button onClick={handleSend}>Send</button>
        <p>{response}</p>
      </div>
      <h1>Chat with me!</h1>
      <button
        onClick={async () => {
          await supabaseClient.auth.signOut();
          router.push("/");
        }}
      >
        logout
      </button>
    </div>
  );
};

export default page;
