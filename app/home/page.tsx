"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import supabaseClient from "@/lib/supabaseClient";
import { Mistral } from "@mistralai/mistralai";

const mistralClient = new Mistral({
  apiKey: "vCucHIiFaWXny9K4HXv3nMxkaGzK1fph",
});

// Hardcoded default topics
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

  useEffect(() => {
    const fetchRecommendations = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      setUserId(user?.id);
      try {
        if (true) {
          // Get user history
          const { data: history } = await supabaseClient
            .from("user_histories")
            .select("content")
            .eq("user_id", user?.id)
            .order("created_at", { ascending: false })
            .limit(20);

          // Generate AI recommendations
          if (history?.length) {
            const recommendations = await generateAIRecommendations(history);
            setRecommendedTopics(recommendations);
          }
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const generateAIRecommendations = async (history: any) => {
    const historyText = history.map((entry: any) => entry.content).join("\n");

    const prompt = `Based on this learning history, suggest 3 relevant topics:
    ${historyText}
    
    Respond with a JSON array of topic objects with "title" and "description"
    
    
    example response:
    [
    {
        "title": "Determinants in Linear Algebra",
        "description": "Determinants are special numbers that can be calculated from the elements of a square matrix. They are crucial for solving systems of linear equations, calculating inverses of matrices, and understanding the properties of linear transformations. This topic will cover the calculation and application of determinants in various contexts."
    },
    {
        "title": "Applications of Linear Algebra in Computer Graphics",
        "description": "Linear algebra is fundamental in computer graphics for modeling transformations such as rotations, reflections, and scaling. This topic will explore how matrices and vectors are used to represent and manipulate objects in 2D and 3D space, enabling complex graphic renditions and animations."
    },
    {
        "title": "Eigenvalues and Eigenvectors",
        "description": "Eigenvalues and eigenvectors are key concepts in linear algebra that help in understanding the stability and behavior of linear systems. This topic will delve into the calculation of eigenvalues and eigenvectors, their geometric interpretation, and their applications in fields such as physics, engineering, and data analysis."
    }
]
    `;

    try {
      const response = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: prompt }],
        responseFormat: { type: "json_object" },
      });

      console.log("AI Response:", response);
      return JSON.parse(response.choices[0].message.content) || [];
    } catch (error) {
      console.error("AI recommendation failed:", error);
      return [];
    }
  };

  const updateHistory = async (topic) => {
    const res = await fetch("/api/history", {
      method: "POST",
      body: JSON.stringify({
        userId,
        content: `User interested in learning ${topic}`,
      }),
    });
    console.log("History update clicked", await res.json());
  };

  const handleTopicSelect = async (topicTitle: string) => {
    await updateHistory(topicTitle);

    router.push(`/chat?topic=${encodeURIComponent(topicTitle)}`);
  };

  if (loading || status === "loading") {
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
        {/* Header Section */}
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

        {/* Recommended Topics Section */}
        {recommendedTopics.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-[Fredoka] text-[#2D3047] mb-6">
              Recommended For You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedTopics.map((topic, index) => (
                <div
                  key={`recommended-${index}`}
                  onClick={() => handleTopicSelect(topic.title)}
                  className="bg-white p-6 rounded-2xl border-2 border-[#4ECDC4] cursor-pointer 
                    hover:shadow-lg transition-all"
                >
                  <div className="text-4xl mb-4">{topic.emoji || "📚"}</div>
                  <h3 className="text-2xl font-[Fredoka] text-[#4ECDC4] mb-2">
                    {topic.title}
                  </h3>
                  <p className="text-[#2D3047] font-[Baloo]">
                    {topic.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Default Topics Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-[Fredoka] text-[#2D3047] mb-6">
            Popular Learning Topics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultTopics.map((topic, index) => (
              <div
                key={`default-${index}`}
                onClick={() => handleTopicSelect(topic.title)}
                className="bg-white p-6 rounded-2xl border-2 border-[#FFE66D] cursor-pointer 
                  hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">{topic.emoji}</div>
                <h3 className="text-2xl font-[Fredoka] text-[#FF6B6B] mb-2">
                  {topic.title}
                </h3>
                <p className="text-[#2D3047] font-[Baloo]">
                  {topic.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
