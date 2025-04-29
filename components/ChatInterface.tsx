"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generatePersonalizedResponse } from "@/lib/llm";
import supabaseClient from "@/lib/supabaseClient";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "react-hot-toast";
import { chatwithMemory } from "@/lib/mem";

interface Message {
  id: string;
  role: "user" | "ai";
  content: any;
  likes?: number;
  disliked?: boolean;
  timestamp?: string;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface TutorChatProps {
  user: any;
  userName: string;
  topic?: string;
}

const TutorChat: React.FC<TutorChatProps> = ({ user, userName, topic }) => {
  const userId = user.id;
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [giveHints, setGiveHints] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Effects
  useEffect(() => {
    if (topic) {
      setInput(`Can you explain ${topic} to me?`);
    }
  }, [topic]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchPreferences = async () => {
      const { data } = await supabaseClient
        .from("profile")
        .select("give_hints")
        .eq("id", user.id)
        .single();

      if (data) setGiveHints(data.give_hints);
    };

    const fetchChatSessions = async () => {
      const { data } = await supabaseClient
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setChatSessions(
          data.map((session) => ({
            id: session.id,
            title: session.title || "New Chat",
            lastMessage: session.last_message || "",
            timestamp: new Date(session.created_at).toLocaleString(),
          }))
        );
      }
    };

    fetchPreferences();
    fetchChatSessions();
  }, [user.id]);

  // Helper functions
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  };

  const formatContent = (content: string) => {
    return (
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2">{children}</ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2">{children}</ul>
          ),
          strong: ({ children }) => (
            <strong className="text-[#2D3047]">{children}</strong>
          ),
          p: ({ children }) => <p className="my-2">{children}</p>,
        }}
      >
        {content}
      </Markdown>
    );
  };

  const createNewSession = async () => {
    // Generate a dynamic title based on time and date
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = now.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });

    // Create dynamic title
    let dynamicTitle = `Session on ${dateStr} at ${timeStr}`;

    // If the last message in input field has content, use that for the title
    if (input.trim()) {
      const titleFromInput =
        input.length > 30 ? `${input.substring(0, 30)}...` : input;
      dynamicTitle = titleFromInput;
    }

    // Create the session in Supabase
    const { data, error } = await supabaseClient
      .from("chat_sessions")
      .insert([
        {
          user_id: user.id,
          title: dynamicTitle,
          last_message: "",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating new session:", error);
      toast.error("Failed to create a new chat session. Please try again.");
      return;
    }

    if (data) {
      setActiveSession(data.id);
      setMessages([]);
      setChatSessions((prev) => [
        {
          id: data.id,
          title: dynamicTitle,
          lastMessage: "",
          timestamp: new Date().toLocaleString(),
        },
        ...prev,
      ]);

      // Log the new session creation
      console.log(`Created new session: ${dynamicTitle} (${data.id})`);
    }
  };

  const loadSession = async (sessionId: string) => {
    const { data } = await supabaseClient
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(
        data.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "ai",
          content: msg.content,
          likes: msg.likes,
          disliked: msg.disliked,
          timestamp: msg.created_at,
        }))
      );
      setActiveSession(sessionId);
    }
  };

  // API handlers
  const updateHistory = useCallback(
    async (content: string) => {
      try {
        await supabaseClient
          .from("user_histories")
          .insert([{ user_id: user.id, content }]);
      } catch (error) {
        console.error("Error updating history:", error);
      }
    },
    [user.id]
  );

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Create new session if none exists
    if (!activeSession) {
      await createNewSession();
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Save user message to database
      await supabaseClient.from("chat_messages").insert([
        {
          session_id: activeSession,
          role: "user",
          content: message,
          user_id: userId,
        },
      ]);

      const { data: userProfile, error } = await supabaseClient
        .from("profile")
        .select(
          "username, age, standard, favourite_subjects, learning_goals, give_hints"
        )
        .eq("id", userId)
        .single();

      // Get AI response
      const response = await generatePersonalizedResponse(
        userId,
        message,
        userProfile
      );
      // console.log("going to call chatwithMemory");
      //const response = await chatwithMemory(message, userProfile, userId);
      console.log("Response from chatwithMemory:", response);
      const aiContent = JSON.parse(response);

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: "ai",
        content: aiContent,
        likes: 0,
        disliked: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Save AI response to database
      await supabaseClient.from("chat_messages").insert([
        {
          session_id: activeSession,
          role: "ai",
          content: aiContent,
          user_id: userId,
        },
      ]);

      // Update session title if first message
      if (messages.length === 0) {
        const title =
          message.length > 30 ? `${message.substring(0, 30)}...` : message;
        await supabaseClient
          .from("chat_sessions")
          .update({
            title,
            last_message: aiContent.mainResponse.substring(0, 100),
          })
          .eq("id", activeSession);

        setChatSessions((prev) =>
          prev.map((session) =>
            session.id === activeSession
              ? {
                  ...session,
                  title,
                  lastMessage: aiContent.mainResponse.substring(0, 100),
                }
              : session
          )
        );
      } else {
        // Update last message
        await supabaseClient
          .from("chat_sessions")
          .update({ last_message: aiContent.mainResponse.substring(0, 100) })
          .eq("id", activeSession);

        setChatSessions((prev) =>
          prev.map((session) =>
            session.id === activeSession
              ? {
                  ...session,
                  lastMessage: aiContent.mainResponse.substring(0, 100),
                }
              : session
          )
        );
      }

      // Update history if first message
      if (messages.length === 0 && !topic) {
        await updateHistory(`User asked about: ${message}`);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("Failed to get response. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: {
            mainResponse:
              "I'm having trouble understanding. Could you rephrase or ask something else?",
            followUpQuestions: [
              "Can you explain this in simpler terms?",
              "What specifically would you like to know?",
            ],
          },
          likes: 0,
          disliked: false,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (
    messageId: string,
    type: "undestood" | "didn't understand"
  ) => {
    try {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                likes: type === "undestood" ? (msg.likes || 0) + 1 : msg.likes,
                disliked: type === "didn't understand",
              }
            : msg
        )
      );

      // Update in database
      await supabaseClient
        .from("chat_messages")
        .update({
          likes: type === "undestood" ? 1 : 0,
          disliked: type === "didn't understand",
        })
        .eq("id", messageId);

      await updateHistory(
        `User ${type}d the explanation: ${
          messages.find((m) => m.id === messageId)?.content.mainResponse || ""
        }`
      );

      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  const toggleHints = async () => {
    const newValue = !giveHints;
    setGiveHints(newValue);
    try {
      await supabaseClient
        .from("profile")
        .update({ give_hints: newValue })
        .eq("id", userId);
    } catch (error) {
      console.error("Error updating hints preference:", error);
      setGiveHints(!newValue); // Revert on error
    }
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-[#FFE66D]/10 to-[#E1F5FE]/20">
      {/* Sidebar with chat sessions */}
      <div className="w-64 p-4 bg-white shadow-md flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-[#2D3047]">
          Chat Sessions
        </h2>

        <button
          onClick={createNewSession}
          className="mb-4 px-4 py-2 bg-[#4ECDC4] hover:bg-[#3DB7AF] text-white rounded-lg font-medium transition-colors"
        >
          + New Chat
        </button>

        <div className="flex-1 overflow-y-auto">
          {chatSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => loadSession(session.id)}
              className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                activeSession === session.id
                  ? "bg-[#4ECDC4] text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <div className="font-medium truncate">{session.title}</div>
              <div className="text-xs truncate">
                {session.lastMessage || "No messages yet"}
              </div>
              <div className="text-xs mt-1">
                {new Date(session.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="flex items-center cursor-pointer">
            <span className="text-sm text-gray-600 mr-2">Show Hints</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={giveHints}
                onChange={toggleHints}
                className="sr-only"
              />
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  giveHints ? "bg-[#4ECDC4]" : "bg-gray-300"
                }`}
              ></div>
              <div
                className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  giveHints ? "transform translate-x-6" : ""
                }`}
              ></div>
            </div>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b flex items-center shadow-sm">
          <div className="ml-auto flex items-center">
            <span className="text-sm text-gray-600">Welcome, {userName}</span>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-xl font-medium text-gray-700 mb-2">
                How can I help you learn today?
              </h2>
              <p className="text-gray-500 max-w-md">
                {activeSession
                  ? "Start typing to begin your learning session"
                  : "Select a chat or create a new one to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-3xl rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-[#4ECDC4] text-white"
                        : "bg-white border border-gray-200"
                    } shadow-sm`}
                  >
                    {message.role === "user" ? (
                      <div className="flex items-start">
                        <div className="mr-3">👤</div>
                        <div>{message.content}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center mb-2">
                          <span className="mr-2">🤖</span>
                          <span className="font-medium">StepWise Tutor</span>
                          <div className="ml-auto flex space-x-2">
                            <button
                              onClick={() =>
                                handleFeedback(message.id, "undestood")
                              }
                              className="text-gray-400 hover:text-[#4ECDC4] cursor-pointer"
                            >
                              <span className="sr-only">Like</span>
                              👍
                            </button>
                            <button
                              onClick={() =>
                                handleFeedback(message.id, "didn't understand")
                              }
                              className="text-gray-400 hover:text-[#FF6B6B] cursor-pointer"
                            >
                              <span className="sr-only">Dislike</span>
                              👎
                            </button>
                          </div>
                        </div>
                        <div className="prose max-w-none">
                          {formatContent(message.content.mainResponse)}
                        </div>
                        {giveHints && message.content.followUpQuestions && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {message.content.followUpQuestions.length > 0 && (
                              <h4 className="text-sm font-medium text-gray-500 mb-2">
                                Try answering these questions:
                              </h4>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {message.content.followUpQuestions.map((q, i) => (
                                <button
                                  key={i}
                                  //onClick={() => sendMessage(q)}
                                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center p-4">
                  <div className="flex space-x-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-gray-500">Thinking...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-3 max-w-4xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question here..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-[#4ECDC4] hover:bg-[#3DB7AF] text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Sending..." : "Ask"}
            </button>
          </form>
        </div>
      </div>

      {/* Feedback Toast */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 border border-gray-200"
          >
            <div className="flex items-center">
              <span className="text-[#4ECDC4] mr-2">✓</span>
              <span>Feedback recorded. Thank you!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorChat;
