import React, { useState, useEffect, useRef } from "react";
import { handleTutorSession } from "@/lib/llm"; // Import from your existing file

// Main Chat UI Component
const TutorChat = ({ userId, userName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [showDetails, setShowDetails] = useState({});

  // Automatically scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Call the tutor API with user's message
      const response = await handleTutorSession(userId, input);

      // Process each conversation step
      response.conversation_steps.forEach((step, index) => {
        const isLastStep = index === response.conversation_steps.length - 1;

        setTimeout(() => {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now() + index,
              role: "assistant",
              content: step.answer,
              metadata: {
                steps: step.steps,
                followupQuestions: step.followup_questions,
                confidenceScore: step.confidence_score,
                keyConcepts: step.key_concepts,
                isFinalAnswer: step.is_final_answer,
              },
              isFinalAnswer: isLastStep,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);

          if (isLastStep) {
            setIsTyping(false);
          }
        }, index * 300); // Stagger messages for a more natural flow
      });
    } catch (error) {
      console.error("Error in tutor session:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now(),
          role: "assistant",
          content:
            "I'm having trouble processing your question. Please try again.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setIsTyping(false);
    }
  };

  // Toggle showing additional details for a message
  const toggleDetails = (messageId) => {
    setShowDetails((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">AI Learning Assistant</h1>
        <p className="text-sm">
          Hello, {userName}! Ask me any question about your studies.
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 my-8">
            <p>Start your learning session by asking a question!</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-3/4 p-4 rounded-lg shadow ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : message.metadata?.isFinalAnswer
                  ? "bg-green-100 border-l-4 border-green-500"
                  : "bg-white"
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-bold">
                  {message.role === "user" ? "You" : "Tutor"}
                </span>
                <span className="text-xs opacity-70">{message.timestamp}</span>
              </div>

              <div className="whitespace-pre-wrap">{message.content}</div>

              {message.role === "assistant" && message.metadata && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleDetails(message.id)}
                    className="text-sm text-blue-600 hover:underline flex items-center"
                  >
                    {showDetails[message.id] ? "Hide details" : "Show details"}
                    <svg
                      className={`w-4 h-4 ml-1 transform ${
                        showDetails[message.id] ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showDetails[message.id] && (
                    <div className="mt-2 text-sm bg-gray-50 p-3 rounded">
                      {message.metadata.steps.length > 0 && (
                        <div className="mb-2">
                          <p className="font-semibold">Steps:</p>
                          <ul className="list-disc pl-5">
                            {message.metadata.steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {message.metadata.keyConcepts.length > 0 && (
                        <div className="mb-2">
                          <p className="font-semibold">Key Concepts:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.metadata.keyConcepts.map(
                              (concept, idx) => (
                                <span
                                  key={idx}
                                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                                >
                                  {concept}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mb-2">
                        <p className="font-semibold">Confidence Score:</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{
                              width: `${
                                message.metadata.confidenceScore * 100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-right mt-1">
                          {Math.round(message.metadata.confidenceScore * 100)}%
                        </p>
                      </div>
                    </div>
                  )}

                  {message.metadata.followupQuestions.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold text-sm">
                        Suggested follow-up questions:
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.metadata.followupQuestions.map(
                          (question, idx) => (
                            <button
                              key={idx}
                              className="bg-gray-200 hover:bg-gray-300 rounded-full px-3 py-1 text-sm"
                              onClick={() => {
                                setInput(question);
                              }}
                            >
                              {question}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="bg-white p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className={`px-4 py-2 rounded-lg font-medium ${
              isTyping || !input.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default TutorChat;
