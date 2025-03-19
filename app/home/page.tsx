"use client";


import TutorChat from "@/components/ChatInterface";
import ChatInterface from "@/components/ChatInterface";
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

  async function updateHistory() {
    const res = await fetch("/api/history", {
      method: "POST",
      body: JSON.stringify({ userId, content: `User interested in ${input}` }),
    });
    console.log("History update response:", await res.json());

    setInput("");
  }

  const handleClick = async () => {
    const res = await fetch("/api/history", {
      method: "POST",
      body: JSON.stringify({
        userId,
        content: `User understands the explaination on ${input}`,
      }),
    });
    console.log("History update clicked", await res.json());
  };

  const toggleHint = async () => {
    const { data: profile } = await supabaseClient
      .from("profile")
      .select("give_hints")
      .eq("id", userId)
      .single();

    const { error } = await supabaseClient
      .from("profile")
      .update({ give_hints: !profile?.give_hints })
      .eq("id", userId);

    if (error) {
      console.error("Supabase Update Error:", error.message);
      return;
    }

    alert("suceesfully toggled");
  };

  return (
    <div>
      {/* <ChatInterface userId={userId} /> */}
      {/* <StepwiseChat userId={userId} /> */}
      <TutorChat userId={userId} userName={"Himanshu"} />
      {/* <ChatBox userId={userId} /> */}
    </div>
  );
};

export default page;
