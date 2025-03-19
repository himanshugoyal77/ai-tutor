import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
}

interface StepwiseOption {
  id: string;
  text: string;
}

interface StepwiseResponse {
  question: string;
  options: StepwiseOption[];
  hint?: string;
}

const StepwiseChat = ({ userId }: { userId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse bot response to check if it's a stepwise response
  const parseResponse = (
    responseText: string
  ): { isStepwise: boolean; content: string | StepwiseResponse } => {
    try {
      const parsed = JSON.parse(responseText);

      if (!parsed.response) {
        return { isStepwise: false, content: responseText };
      }

      // Check if it contains options which indicates a stepwise response
      if (parsed.response.includes("**") && parsed.response.includes("1. A)")) {
        // Extract the question (text between first set of **)
        const questionMatch = parsed.response.match(/\*\*(.*?)\*\*/);
        const question = questionMatch ? questionMatch[1] : "";

        // Extract options
        const optionsRegex = /\d\.\s([A-D])\)\s(.*?)(?=\n\d\.|$)/gs;
        const options: StepwiseOption[] = [];
        let match;

        while ((match = optionsRegex.exec(parsed.response)) !== null) {
          options.push({
            id: match[1],
            text: match[2].trim(),
          });
        }

        // Extract hint if present
        const hintMatch = parsed.response.match(
          /\*\*Hint:\*\*\s(.*?)(?=\n|$)/s
        );
        const hint = hintMatch ? hintMatch[1].trim() : undefined;

        return {
          isStepwise: true,
          content: { question, options, hint },
        };
      } else {
        // Direct response
        return { isStepwise: false, content: parsed.response };
      }
    } catch (e) {
      // Fallback to treating as plain text if parsing fails
      return { isStepwise: false, content: responseText };
    }
  };

  const handleSubmit = async (e: React.FormEvent | string) => {
    if (typeof e !== "string") e.preventDefault();
    const userInput = typeof e === "string" ? e : input;

    if (!userInput.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userInput,
      isBot: false,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate bot response
    setIsBotTyping(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ input: userInput, userId }),
    });

    const responseText = await res.text();

    const botMessage: Message = {
      id: Date.now().toString(),
      text: responseText,
      isBot: true,
    };

    setMessages((prev) => [...prev, botMessage]);
    setIsBotTyping(false);
  };

  const handleOptionSelect = (option: string) => {
    handleSubmit(option);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm">
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="Stepwise.ai Logo"
            width={40}
            height={40}
            className="mr-2"
          />
          <h1 className="text-2xl font-bold text-orange-500">
            stepwise<span className="text-teal-500">.ai</span>
          </h1>
        </div>
        <button className="px-6 py-2 text-white bg-coral-500 rounded-full hover:bg-coral-600 transition">
          Join the Fun!
        </button>
      </div>

      {/* Chat container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.isBot ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-3/4 rounded-2xl p-4 ${
                message.isBot
                  ? "bg-white text-gray-800 shadow-md"
                  : "bg-teal-500 text-white"
              }`}
            >
              {message.isBot ? (
                (() => {
                  const { isStepwise, content } = parseResponse(message.text);

                  if (isStepwise) {
                    const stepwiseContent = content as StepwiseResponse;
                    return (
                      <div className="space-y-4">
                        <p className="font-medium text-lg">
                          {stepwiseContent.question}
                        </p>
                        <div className="space-y-2">
                          {stepwiseContent.options.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => handleOptionSelect(option.id)}
                              className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition flex items-center"
                            >
                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center mr-3">
                                {option.id}
                              </span>
                              <span>{option.text}</span>
                            </button>
                          ))}
                        </div>
                        {stepwiseContent.hint && (
                          <div className="mt-4 p-3 bg-orange-100 rounded-lg border-l-4 border-orange-500">
                            <p className="font-medium">Hint:</p>
                            <p>{stepwiseContent.hint}</p>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return <p>{content as string}</p>;
                  }
                })()
              ) : (
                <p>{message.text}</p>
              )}
            </div>
          </div>
        ))}
        {isBotTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex space-x-2">
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div className="p-4 bg-white shadow-lg">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your study buddy..."
            className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="p-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default StepwiseChat;
