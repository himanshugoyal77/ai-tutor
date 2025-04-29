"use client";
const api_key = "vCucHIiFaWXny9K4HXv3nMxkaGzK1fph";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, memo } from "react";
import supabaseClient from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { Mistral } from "@mistralai/mistralai";
import { debounce } from "lodash";

const mistralClient = new Mistral({
  apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY || api_key,
});

const defaultTopics = [
  {
    title: "Space Exploration",
    description: "Learn about planets, stars, and space missions",
    emoji: "🚀",
  },

  {
    title: "Human Anatomy",
    description: "Study the human body and its systems",
    emoji: "🧠",
  },

  {
    title: "Renewable Energy",
    description: "Discover solar, wind, and hydro power technologies",
    emoji: "☀️",
  },

  {
    title: "Genetics & DNA",
    description: "Understand heredity and genetic engineering",
    emoji: "🧬",
  },

  {
    title: "Artificial Intelligence",
    description: "Discover how machines learn and think",
    emoji: "🤖",
  },
];

const HomePage = () => {
  const router = useRouter();
  const [recommendedTopics, setRecommendedTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabaseClient
          .from("profile")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;
        setUserProfile(profileData);

        // Fetch user's learning paths
        const { data: pathsData, error: pathsError } = await supabaseClient
          .from("learning_paths")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (pathsError) throw pathsError;
      } catch (err) {
        console.error(err);
      }
    };

    if (userId) fetchUserData();
  }, [userId]);

  console.log("User Profile:", userProfile);
  const generateAIRecommendations = useCallback(
    debounce(async (history: any, cacheKey: string) => {
      try {
        const historyText = history
          .map((entry: any) => entry.content)
          .join("\n");

        const prompt = `Based on this learning history
        and user profile, suggest 3 relevant topics:
        \nhisotry: ${historyText}
        \nUser profile: ${JSON.stringify(userProfile)}
        \n the topics should be for age group of ${userProfile?.age} years old
        \nThe topics should be relevant to the user's interests and learning goals.

        
        Respond with a JSON array of topic objects with "title", "description" and "emoji"
        
        Example response:
        [
          {
            "title": "Plate Tectonics",
            "description": "The theory explaining the movement of Earth's lithosphere...",
            "emoji": "🌎"
          }
        ]`;

        const response = await mistralClient.chat.complete({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: prompt }],
          responseFormat: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content) || [];
        setRecommendedTopics(result);
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (error) {
        console.error("AI recommendation failed:", error);
        toast.error("Couldn't generate recommendations");
      } finally {
        setLoading(false);
        setRecommendationLoading(false);
      }
    }, 10000), // 1-second debounce
    []
  );
  const updateHistory = useCallback(
    async (topic: string) => {
      if (!userId) return;

      try {
        await supabaseClient.from("user_histories").insert([
          {
            user_id: userId,
            content: `User interested in learning ${topic}`,
          },
        ]);
      } catch (error) {
        console.error("Failed to update history:", error);
      }
    },
    [userId]
  );

  const handleTopicSelect = useCallback(
    async (topicTitle: string) => {
      console.log("Selected topic:", topicTitle);
      try {
        setLoading(true);
        await updateHistory(topicTitle);
        if (topicTitle === "Custom Topic") {
          router.push("/chat");

          return;
        }
        router.push(`/chat?topic=${encodeURIComponent(topicTitle)}`);
      } catch (error) {
        toast.error("Failed to start learning session");
      } finally {
        setLoading(false);
      }
    },
    [updateHistory, router]
  );

  const handleLogout = useCallback(async () => {
    try {
      await supabaseClient.auth.signOut();
      sessionStorage.clear();
      router.push("/");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  }, [router]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      setUserId(user?.id || "");

      try {
        setRecommendationLoading(true);
        if (user?.id) {
          const { data: history } = await supabaseClient
            .from("user_histories")
            .select("content")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (history?.length) {
            setRecommendationLoading(true);
            const recommendations = await generateAIRecommendations(history);
            setRecommendedTopics(recommendations);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
        setRecommendationLoading(false);
      }
    };

    fetchRecommendations();
  }, [generateAIRecommendations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF5D6] to-[#E1F5FE]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4ECDC4] mx-auto mb-4"></div>
          <p className="text-[#2D3047] font-[Baloo] text-xl">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5D6] to-[#E1F5FE] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <div className="flex justify-between items-center mb-6">
            <Image
              src="/logo.png"
              alt="StepWise Logo"
              width={180}
              height={60}
              className="ml-4"
            />
            <div className="flex gap-3 items-center mr-4">
              <button
                className="bg-[#FF6B6B] text-white py-2 px-4 rounded-lg hover:bg-[#FF4C4C] transition-all cursor-pointer"
                onClick={() => router.push(`/path?userId=${userId}`)}
              >
                Learning paths
              </button>
              <button
                onClick={handleLogout}
                className="bg-[#FF6B6B] text-white py-2 px-4 rounded-lg hover:bg-[#FF4C4C] transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-[Fredoka] text-[#2D3047] mb-4">
            Start Learning
          </h1>
          <p className="text-lg md:text-xl text-[#4ECDC4] font-[Baloo]">
            Choose your learning adventure
          </p>
        </div>

        {recommendationLoading &&
          [1, 2, 3].map((_, index) => (
            <Section
              key={index}
              title="Loading..."
              topics={[
                {
                  title: "Loading...",
                  description: "Loading...",
                  emoji: "⏳",
                },
              ]}
              handleTopicSelect={() => {}}
              colorClass="text-[#4ECDC4]"
              borderClass="border-[#4ECDC4]"
            />
          ))}

        {recommendedTopics && recommendedTopics.length > 0 && (
          <Section
            title="Recommended For You"
            topics={recommendedTopics}
            handleTopicSelect={handleTopicSelect}
            colorClass="text-[#4ECDC4]"
            borderClass="border-[#4ECDC4]"
          />
        )}

        <Section
          title="Popular Learning Topics"
          topics={defaultTopics}
          handleTopicSelect={handleTopicSelect}
          colorClass="text-[#FF6B6B]"
          borderClass="border-[#FFE66D]"
        />
      </div>
    </div>
  );
};

const Section = memo(
  ({
    title,
    topics,
    handleTopicSelect,
    colorClass,
    borderClass,
  }: {
    title: string;
    topics: any[];
    handleTopicSelect: (title: string) => void;
    colorClass: string;
    borderClass: string;
  }) => (
    <div className="mb-10 md:mb-16">
      <h2 className={`text-2xl md:text-3xl font-[Fredoka] mb-6 ${colorClass}`}>
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {topics.map((topic, index) => (
          <TopicCard
            key={`${title}-${index}`}
            emoji={topic.emoji}
            title={topic.title}
            description={topic.description}
            onClick={handleTopicSelect}
            borderColor={borderClass}
            textColor={colorClass}
          />
        ))}
        <TopicCard
          emoji="✨"
          title="Custom Topic"
          description="Want to learn something else? Enter your own topic!"
          onClick={handleTopicSelect}
          borderColor="border-[#4ECDC4]"
          textColor="text-[#4ECDC4]"
        />
      </div>
    </div>
  )
);

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
      className={`bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border-2 cursor-pointer hover:shadow-lg transition-all ${borderColor} hover:scale-[1.02]`}
    >
      <div className="text-3xl md:text-4xl mb-3 md:mb-4">{emoji}</div>
      <h3 className={`text-xl md:text-2xl font-[Fredoka] mb-2 ${textColor}`}>
        {title}
      </h3>
      <p className="text-[#2D3047] font-[Baloo] text-sm md:text-base">
        {description}
      </p>
    </div>
  )
);

TopicCard.displayName = "TopicCard";
Section.displayName = "Section";

export default HomePage;
