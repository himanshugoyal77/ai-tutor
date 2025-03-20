import React, { useState, useEffect, useRef } from "react";
import { generatePersonalizedResponse, handleTutorSession } from "@/lib/llm";

const TutorChat = ({ userId, userName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatContainerRef = useRef(null);
  const [avatar, setAvatar] = useState("owl"); // Default avatar

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const avatars = {
    owl: "🦉",
    robot: "🤖",
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
            mainResponse: "Oops! I got confused. Can you try asking me again?",
            followUpQuestions: ["Let's try a different question"],
          },
        },
      ]);
    }
  };

  const changeAvatar = (newAvatar) => {
    setAvatar(newAvatar);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto p-4 bg-blue-50 rounded-xl shadow-md border-4 border-blue-300">
      {/* Header with avatar selection */}
      <div className="bg-blue-500 text-white p-3 rounded-t-lg mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Learning Buddy</h2>
        <div className="flex space-x-2">
          {Object.entries(avatars).map(([key, emoji]) => (
            <button
              key={key}
              onClick={() => changeAvatar(key)}
              className={`text-2xl ${
                avatar === key ? "bg-blue-600 rounded-full p-1" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Chat container */}
      <div
        ref={chatContainerRef}
        className="h-96 overflow-y-auto p-2 bg-white rounded-lg mb-4 border-2 border-blue-200"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <div className="text-5xl mb-4">{avatars[avatar]}</div>
            <p className="text-lg font-semibold">
              Hi there! I'm your learning buddy.
            </p>
            <p className="mt-2">
              Ask me anything about your homework or lessons!
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${
              msg.role === "user" ? "flex justify-end" : "flex justify-start"
            }`}
          >
            {msg.role === "ai" && (
              <div className="mr-2 text-3xl self-end mb-1">
                {avatars[avatar]}
              </div>
            )}

            <div
              className={`max-w-3/4 ${
                msg.role === "user" ? "order-first" : "order-last"
              }`}
            >
              <div
                className={`p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-green-100 text-black rounded-bl-none border-2 border-green-200"
                }`}
              >
                {typeof msg.content === "string"
                  ? msg.content
                  : msg.content.mainResponse}
              </div>

              {msg.role === "ai" && msg.content.followUpQuestions && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.content.followUpQuestions.map((question, i) => (
                    <button
                      key={i}
                      className="text-sm bg-yellow-100 hover:bg-yellow-200 text-black px-3 py-2 rounded-full border-2 border-yellow-300 transition-transform hover:scale-105"
                      onClick={() => sendMessage(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {msg.role === "ai" && msg.content.relatedTopics && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Related Topics:</p>
                  <div className="flex flex-wrap gap-1">
                    {msg.content.relatedTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="ml-2 bg-blue-100 p-2 rounded-full h-10 w-10 flex items-center justify-center text-blue-500 font-bold">
                {userName ? userName[0].toUpperCase() : "U"}
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center mt-2">
            <div className="mr-2 text-3xl">{avatars[avatar]}</div>
            <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none inline-block">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-center mt-2">
        <input
          type="text"
          className="flex-1 p-3 border-2 border-blue-300 rounded-full text-lg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question here..."
          onKeyPress={(e) =>
            e.key === "Enter" && input.trim() && sendMessage(input)
          }
        />
        <button
          className="ml-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isThinking}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TutorChat;
