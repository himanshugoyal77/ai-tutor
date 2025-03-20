import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generatePersonalizedResponse, handleTutorSession } from "@/lib/llm";
import supabaseClient from "@/lib/supabaseClient";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const formatContent = (content) => {
  // Split into paragraphs preserving \n
  return content.split("\n").map((line, index) => {
    // Format numbered lists
    if (/^\d+\.\s/.test(line)) {
      return (
        <div key={index} className="flex items-start my-2">
          <span className="text-[#FF6B6B] font-bold mr-2">
            {line.match(/^\d+/)[0]}.
          </span>
          <span className="flex-1">{line.replace(/^\d+\.\s*/, "")}</span>
        </div>
      );
    }

    // Format lettered options
    if (/^[a-zA-Z]\)\s/.test(line)) {
      return (
        <div key={index} className="flex items-start my-2">
          <span className="text-[#4ECDC4] font-bold mr-2">{line[0]})</span>
          <span className="flex-1">{line.slice(2)}</span>
        </div>
      );
    }

    // Format bold text (remove markdown **)
    if (/\*\*(.*?)\*\*/.test(line)) {
      return (
        <strong key={index} className="text-[#2D3047]">
          {line.replace(/\*\*/g, "")}
        </strong>
      );
    }

    return <div key={index}>{line}</div>;
  });
};

const TutorChat = ({ userId, userName, topic }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatContainerRef = useRef(null);
  const [avatar, setAvatar] = useState("robot"); // Default avatar
  const [giveHints, setGiveHints] = useState(true);
  const [showEmojiAnimation, setShowEmojiAnimation] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [userAvatar, setUserAvatar] = useState("👧"); // Default user avatar
  const [celebrationCount, setCelebrationCount] = useState(0);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [likedMessages, setLikedMessages] = useState([]);

  useEffect(() => {
    if (topic) {
      setInput(`Can you explain ${topic} to me?`);
    }
  }, [userId, topic]);

  const handleLike = (index) => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      if (newMessages[index].role === "ai") {
        const updatedLikes = newMessages[index].likes + 1;

        // Check if we've reached 10 likes and haven't celebrated yet
        if (updatedLikes === 10 && !hasCelebrated) {
          setCelebrationCount((prev) => prev + 1);
          setHasCelebrated(true);
          handleClick("likes");
        }

        newMessages[index] = {
          ...newMessages[index],
          likes: updatedLikes,
          disliked: false,
        };
      }
      return newMessages;
    });
  };

  // Celebration animation effect
  useEffect(() => {
    if (celebrationCount > 0) {
      setSelectedEmoji("🎉");
      setShowEmojiAnimation(true);
      const timer = setTimeout(() => {
        setShowEmojiAnimation(false);
        setHasCelebrated(false); // Reset after animation
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [celebrationCount]);

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

  // User avatars for selection
  const userAvatars = ["👦", "👧", "👨", "👩", "🧒"];

  const updateHistory = useCallback(
    async (topic: string) => {
      if (!userId) return;

      await fetch("/api/history", {
        method: "POST",
        body: JSON.stringify({
          userId,
          content: `User interested in learning ${topic}`,
        }),
      });
    },
    [userId]
  );


  const sendMessage = async (message) => {
    if (messages.length === 0 && !topic) {
      await updateHistory(message);
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: message, avatar: userAvatar },
    ]);
    setInput("");
    setIsThinking(true);

    try {
      const response = await generatePersonalizedResponse(userId, message);
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: JSON.parse(response),
          likes: 0,
          disliked: false,
        },
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
          likes: 0,
          disliked: false,
        },
      ]);
    }
  };

  const changeAvatar = (newAvatar) => {
    setSelectedEmoji(avatars[newAvatar]);
    setShowEmojiAnimation(true);

    // After animation completes, update the avatar
    setTimeout(() => {
      setAvatar(newAvatar);
      setShowEmojiAnimation(false);
    }, 1500);
  };

  const changeUserAvatar = (newAvatar) => {
    setUserAvatar(newAvatar);
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

  const handleClick = async (type) => {
    // type is either "likes" or "dislikes"
    if (likedMessages.includes(messages[messages.length - 1].id)) return;

    setLikedMessages((prev) => [...prev, messages[messages.length - 1].id]);

    const res = await fetch("/api/history", {
      method: "POST",
      body: JSON.stringify({
        userId,
        content: `User ${type} the explaination on ${
          // Get the last AI message
          messages[messages.length - 1].content.mainResponse
        }`,
      }),
    });
    console.log("History update clicked", await res.json());
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-[#FFE66D]/20 to-[#E1F5FE]/50 backdrop-blur-sm relative">
      {/* Emoji Animation Overlay */}
      <AnimatePresence>
        {showEmojiAnimation && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50 bg-black/10 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-9xl"
              initial={{ scale: 0.2, rotate: -20 }}
              animate={{
                scale: [0.2, 1.5, 1],
                rotate: [-20, 20, 0],
                y: [0, -50, 0],
              }}
              transition={{ duration: 1.2 }}
            >
              {selectedEmoji}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="ml-auto text-[#2D3047] font-[Baloo] flex items-center">
            <span className="mr-2">{userAvatar}</span>
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
                    <div className="font-[Baloo] flex items-start">
                      <div className="w-8 h-8 rounded-full bg-[#2D3047]/10 flex items-center justify-center mr-3 flex-shrink-0">
                        {message.avatar || userAvatar}
                      </div>
                      <p>{message.content}</p>
                    </div>
                  ) : (
                    <div className="font-[Baloo]">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{avatars[avatar]}</span>
                        <span className="font-bold text-[#FF6B6B]">
                          StepWise
                        </span>

                        {/* Like/Dislike Buttons */}
                        <div className="ml-auto flex gap-2">
                          <motion.button
                            onClick={() => handleLike(index)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="text-sm flex items-center gap-1"
                          >
                            <span
                              onClick={() => handleClick("likes")}
                              className={`${
                                message.likes > 0
                                  ? "text-[#4ECDC4]"
                                  : "text-gray-400"
                              }`}
                            >
                              👍
                            </span>
                            {message.likes > 0 && (
                              <span className="text-[#4ECDC4] font-bold">
                                {message.likes}
                              </span>
                            )}
                          </motion.button>

                          <motion.button
                            onClick={() => handleClick("dislikes")}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className={`text-sm ${
                              message.disliked
                                ? "text-[#FF6B6B]"
                                : "text-gray-400"
                            }`}
                          >
                            👎
                          </motion.button>
                        </div>
                      </div>
                      <div>{formatContent(message.content.mainResponse)}</div>
                      {!giveHints && message.content.followUpQuestions && (
                        <div className="mt-4">
                          <p className="text-sm text-[#2D3047] mb-2">
                            Here are some follow-up questions you can ask:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.content.followUpQuestions.map((q, i) => (
                              <motion.button
                                key={i}
                                className="bg-[#FFE66D]/50 hover:bg-[#FFE66D] px-3 py-1 rounded-full text-sm text-[#2D3047]"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => sendMessage(q)}
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
