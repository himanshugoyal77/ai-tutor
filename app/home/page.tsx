"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, memo } from "react";
import supabaseClient from "@/lib/supabaseClient";
import { Mistral } from "@mistralai/mistralai";

const mistralClient = new Mistral({
  apiKey: "vCucHIiFaWXny9K4HXv3nMxkaGzK1fph",
});

const defaultTopics = [
  {
    title: "Fractions Basics",
    description: "Understand numerator, denominator, and simple operations",
    emoji: "½",
  },
  {
    title: "Chemical Reactions",
    description: "Learn about reaction types and balancing equations",
    emoji: "⚗️",
  },
  {
    title: "Ancient Civilizations",
    description: "Explore Egyptian, Greek, and Roman history",
    emoji: "🏛️",
  },
  {
    title: "Algebra Fundamentals",
    description: "Master variables, equations, and expressions",
    emoji: "𝑥",
  },
  {
    title: "Human Anatomy",
    description: "Study major body systems and organs",
    emoji: "🧬",
  },
  {
    title: "Climate Change",
    description: "Understand greenhouse effect and sustainability",
    emoji: "🌍",
  },
];

const HomePage = () => {
  const router = useRouter();
  const [recommendedTopics, setRecommendedTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  const generateAIRecommendations = useCallback(async (history: any) => {
    const historyText = history.map((entry: any) => entry.content).join("\n");

    const prompt = `Based on this learning history, suggest 3 relevant topics:
    ${historyText}
    
    Respond with a JSON array of topic objects with "title" and "description"
    
    Example response:
    [
      {
        "title": "Determinants in Linear Algebra",
        "description": "Determinants are special numbers that can be calculated from square matrices..."
      }
    ]`;

    try {
      const response = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: prompt }],
        responseFormat: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content) || [];
    } catch (error) {
      console.error("AI recommendation failed:", error);
      return [];
    }
  }, []);

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

  const handleTopicSelect = useCallback(
    async (topicTitle: string) => {
      await updateHistory(topicTitle);
      router.push(`/chat?topic=${encodeURIComponent(topicTitle)}`);
    },
    [updateHistory, router]
  );

  const handleCustomTopic = useCallback(async () => {
    const customTopic = prompt("Enter the topic you'd like to learn about:");
    if (customTopic) {
      await updateHistory(customTopic);
      router.push(`/chat?topic=${encodeURIComponent(customTopic)}`);
    }
  }, [updateHistory, router]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      setUserId(user?.id || "");

      const cacheKey = `recommendedTopics-${user?.id}`;
      const cachedTopics = sessionStorage.getItem(cacheKey);
      if (cachedTopics) {
        setRecommendedTopics(JSON.parse(cachedTopics));
        setLoading(false);
        return;
      }

      try {
        if (user?.id) {
          const { data: history } = await supabaseClient
            .from("user_histories")
            .select("content")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (history?.length) {
            const recommendations = await generateAIRecommendations(history);
            setRecommendedTopics(recommendations);
            sessionStorage.setItem(cacheKey, JSON.stringify(recommendations));
          }
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [generateAIRecommendations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[#4ECDC4] text-xl">
          Loading your learning path...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5D6] to-[#E1F5FE] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Image
            src="/logo.png"
            alt="StepWise Logo"
            width={240}
            height={80}
            className="mx-auto mb-6"
          />
          <h1 className="text-5xl font-[Fredoka] text-[#2D3047] mb-4">
            Start Learning
          </h1>
          <p className="text-xl text-[#4ECDC4] font-[Baloo]">
            Choose your learning adventure
          </p>
        </div>

        {recommendedTopics.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-[Fredoka] text-[#2D3047] mb-6">
              Recommended For You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedTopics.map((topic, index) => (
                <TopicCard
                  key={`recommended-${index}`}
                  emoji={topic.emoji || "📚"}
                  title={topic.title}
                  description={topic.description}
                  onClick={handleTopicSelect}
                  borderColor="border-[#4ECDC4]"
                  textColor="text-[#4ECDC4]"
                />
              ))}

              <TopicCard
                emoji="✨"
                title="Custom Topic"
                description="Want to learn something else? Click here to enter your own topic!"
                onClick={() => router.push(`/chat`)}
                borderColor="border-[#4ECDC4]"
                textColor="text-[#4ECDC4]"
              />
            </div>
          </div>
        )}

        <div className="mb-16">
          <h2 className="text-3xl font-[Fredoka] text-[#2D3047] mb-6">
            Popular Learning Topics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultTopics.map((topic, index) => (
              <TopicCard
                key={`default-${index}`}
                emoji={topic.emoji}
                title={topic.title}
                description={topic.description}
                onClick={handleTopicSelect}
                borderColor="border-[#FFE66D]"
                textColor="text-[#FF6B6B]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TopicCard = memo(
  ({
    emoji,
    title,
    description,
    onClick,
    borderColor,
    textColor,
  }: {
    emoji: string;
    title: string;
    description: string;
    onClick: (title: string) => void;
    borderColor: string;
    textColor: string;
  }) => (
    <div
      onClick={() => onClick(title)}
      className={`bg-white p-6 rounded-2xl border-2 cursor-pointer hover:shadow-lg transition-all ${borderColor}`}
    >
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className={`text-2xl font-[Fredoka] mb-2 ${textColor}`}>{title}</h3>
      <p className="text-[#2D3047] font-[Baloo]">{description}</p>
    </div>
  )
);

TopicCard.displayName = "TopicCard";

export default HomePage;
