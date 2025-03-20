import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generatePersonalizedResponse, handleTutorSession } from "@/lib/llm";
import supabaseClient from "@/lib/supabaseClient";

const TutorChat = ({ userId, userName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatContainerRef = useRef(null);
  const [avatar, setAvatar] = useState("robot"); // Default avatar
  const [giveHints, setGiveHints] = useState(true);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const avatars = {
    robot: "🤖",
    owl: "🦉",
    star: "⭐",
    wizard: "🧙",
    teacher: "👩‍🏫",
  };

  const sendMessage = async (message) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setIsThinking(true);

    try {
      const response = await generatePersonalizedResponse(userId, message);
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: JSON.parse(response) },
      ]);
    } catch (error) {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: {
            mainResponse: "Oops! Let's try that again! 🚀",
            followUpQuestions: [
              "Can you rephrase that?",
              "Let's try a different question",
            ],
          },
        },
      ]);
    }
  };

  const changeAvatar = (newAvatar) => {
    setAvatar(newAvatar);
  };

  // Fetch initial hint setting
  useEffect(() => {
    const fetchPreferences = async () => {
      const { data } = await supabaseClient
        .from("profile")
        .select("give_hints")
        .eq("id", userId)
        .single();

      if (data) setGiveHints(data.give_hints);
    };
    fetchPreferences();
  }, [userId]);

  const toggleHints = async () => {
    const newValue = !giveHints;
    setGiveHints(newValue);
    await supabaseClient
      .from("profile")
      .update({ give_hints: newValue })
      .eq("id", userId);
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-[#FFE66D]/20 to-[#E1F5FE]/50 backdrop-blur-sm">
      {/* Fun Sidebar */}
      <div className="w-24 p-4 border-r-2 border-[#FFE66D] bg-[#E1F5FE] flex flex-col items-center rounded-tr-3xl rounded-br-3xl shadow-lg">
        <div className="mb-8 mt-4">
          <motion.div
            className="text-4xl cursor-pointer"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            {avatars[avatar]}
          </motion.div>
        </div>

        {/* Avatar Selection */}
        <div className="space-y-4 mb-8">
          {Object.entries(avatars).map(([key, emoji]) => (
            <motion.button
              key={key}
              onClick={() => changeAvatar(key)}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                avatar === key ? "bg-[#FF6B6B] text-white" : "bg-white"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {emoji}
            </motion.button>
          ))}
        </div>

        {/* Hint Toggle */}
        <div className="mt-auto mb-8">
          <p className="text-xs text-center mb-2 font-[Baloo] text-[#2D3047]">
            Step Hints
          </p>
          <button
            onClick={toggleHints}
            className={`w-14 h-7 rounded-full p-1 transition-colors ${
              giveHints ? "bg-[#4ECDC4]" : "bg-gray-300"
            }`}
          >
            <motion.div
              className="w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ x: giveHints ? 28 : 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 bg-white/80 border-b-2 border-[#FFE66D] flex items-center">
          <div className="text-2xl font-[Fredoka] text-[#FF6B6B] ml-4">
            <span className="text-[#4ECDC4]">STEP</span>WISE
          </div>
          <div className="ml-auto text-[#2D3047] font-[Baloo]">
            Happy learning, {userName}! ✨
          </div>
        </div>

        {/* Chat Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 bg-white/60 rounded-bl-3xl"
        >
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center text-[#2D3047]"
              >
                <div className="text-8xl mb-6 animate-bounce">
                  {avatars[avatar]}
                </div>
                <p className="text-xl md:text-2xl font-[Baloo] bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
                  Ready to learn, {userName}? 🚀
                </p>
                <p className="text-md mt-4 max-w-md font-[Baloo] text-[#2D3047]">
                  Ask me any question and I'll help you understand step by step!
                </p>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 ${
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }`}
              >
                <div
                  className={`max-w-3xl p-4 rounded-2xl ${
                    message.role === "user"
                      ? "bg-[#4ECDC4]/90 text-white"
                      : "bg-white border-2 border-[#FFE66D]"
                  } shadow-md`}
                >
                  {message.role === "user" ? (
                    <p className="font-[Baloo]">{message.content}</p>
                  ) : (
                    <div className="font-[Baloo]">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{avatars[avatar]}</span>
                        <span className="font-bold text-[#FF6B6B]">
                          StepWise
                        </span>
                      </div>
                      <p>{message.content.mainResponse}</p>
                      {message.content.followUpQuestions && (
                        <div className="mt-4">
                          <p className="text-sm text-[#2D3047] mb-2">
                            Think of these questions to learn more:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.content.followUpQuestions.map((q, i) => (
                              <motion.button
                                key={i}
                                className="bg-[#FFE66D]/50 hover:bg-[#FFE66D] px-3 py-1 rounded-full text-sm text-[#2D3047]"
                               
                                //onClick={() => sendMessage(q)}
                              >
                                {q}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isThinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center mt-4 ml-4"
              >
                <div className="flex items-center bg-white p-3 rounded-xl shadow-md">
                  <span className="mr-2">{avatars[avatar]}</span>
                  <div className="flex space-x-1">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-2 h-2 bg-[#FF6B6B] rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: 0.2,
                      }}
                      className="w-2 h-2 bg-[#FFE66D] rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: 0.4,
                      }}
                      className="w-2 h-2 bg-[#4ECDC4] rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-6 border-t-2 border-[#FFE66D] bg-white/80">
          <div className="flex items-center gap-4 max-w-4xl mx-auto">
            <input
              type="text"
              className="flex-1 p-4 text-lg border-2 border-[#4ECDC4] rounded-2xl focus:outline-none focus:border-[#FF6B6B] font-[Baloo] placeholder-[#4ECDC4]/70 bg-white/80"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What would you like to learn today?"
              onKeyPress={(e) =>
                e.key === "Enter" && input.trim() && sendMessage(input)
              }
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-4 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white rounded-2xl font-[Fredoka] shadow-lg disabled:opacity-50 transition-all"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
            >
              Ask {avatars[avatar]}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;
