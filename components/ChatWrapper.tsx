import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generatePersonalizedResponse } from "@/lib/llm";
import supabaseClient from "@/lib/supabaseClient";
import TutorChat from "./ChatInterface";

export const ChatWrapper = ({ userId, userName }) => {
  const [filters, setFilters] = useState({
    giveHints: true,
    difficulty: "medium",
    learningStyle: "interactive",
    subjectFocus: "auto",
    mediaPreference: "text",
  });

  // Fetch initial filter settings from profile
  useEffect(() => {
    const fetchPreferences = async () => {
      const { data } = await supabaseClient
        .from("profile")
        .select("give_hints, preferences")
        .eq("id", userId)
        .single();

      if (data) {
        setFilters({
          giveHints: data.give_hints,
          ...data.preferences,
        });
      }
    };
    fetchPreferences();
  }, [userId]);

  const updateFilter = async (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));

    // Update backend
    await supabaseClient
      .from("profile")
      .update({ [filterName]: value })
      .eq("id", userId);
  };

  return (
    <div className="flex h-screen w-full bg-white/90 backdrop-blur-sm">
      {/* Filter Sidebar */}
      <div className="w-64 p-6 border-r-4 border-[#FFE66D] bg-[#E1F5FE]">
        <h3 className="text-[#2D3047] font-[Fredoka] text-xl mb-6">
          Learning Preferences
        </h3>

        <div className="space-y-6">
          {/* Hint Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[#2D3047] font-[Baloo]">Show Hints</span>
            <button
              onClick={() => updateFilter("giveHints", !filters.giveHints)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                filters.giveHints ? "bg-[#4ECDC4]" : "bg-[#FF6B6B]"
              }`}
            >
              <motion.div
                className="w-4 h-4 bg-white rounded-full shadow-md"
                animate={{ x: filters.giveHints ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
            </button>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-2">
            <label className="text-[#2D3047] font-[Baloo]">Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => updateFilter("difficulty", e.target.value)}
              className="w-full p-2 rounded-lg border-2 border-[#4ECDC4] bg-white font-[Baloo]"
            >
              <option value="easy">Beginner</option>
              <option value="medium">Intermediate</option>
              <option value="hard">Advanced</option>
            </select>
          </div>

          {/* Learning Style */}
          <div className="space-y-2">
            <label className="text-[#2D3047] font-[Baloo]">
              Learning Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["Visual", "Auditory", "Interactive", "Text"].map((style) => (
                <motion.button
                  key={style}
                  whileHover={{ scale: 1.05 }}
                  className={`p-2 rounded-lg text-sm ${
                    filters.learningStyle.toLowerCase() === style.toLowerCase()
                      ? "bg-[#FF6B6B] text-white"
                      : "bg-[#FFE66D] text-[#2D3047]"
                  }`}
                  onClick={() =>
                    updateFilter("learningStyle", style.toLowerCase())
                  }
                >
                  {style}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Subject Focus */}
          <div className="space-y-2">
            <label className="text-[#2D3047] font-[Baloo]">
              Focus Subjects
            </label>
            <div className="flex flex-wrap gap-2">
              {["Math", "Science", "History", "Auto"].map((subject) => (
                <motion.button
                  key={subject}
                  whileHover={{ scale: 1.05 }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filters.subjectFocus.toLowerCase() === subject.toLowerCase()
                      ? "bg-[#4ECDC4] text-white"
                      : "bg-[#FFE66D] text-[#2D3047]"
                  }`}
                  onClick={() =>
                    updateFilter("subjectFocus", subject.toLowerCase())
                  }
                >
                  {subject}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Media Preference */}
          <div className="space-y-2">
            <label className="text-[#2D3047] font-[Baloo]">Content Type</label>
            <div className="flex gap-2">
              {["Text", "Visual", "Both"].map((type) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.05 }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filters.mediaPreference.toLowerCase() === type.toLowerCase()
                      ? "bg-[#FF6B6B] text-white"
                      : "bg-[#4ECDC4]/30 text-[#2D3047]"
                  }`}
                  onClick={() =>
                    updateFilter("mediaPreference", type.toLowerCase())
                  }
                >
                  {type}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col p-6">
        <TutorChat userId={userId} userName={userName} />
      </div>
    </div>
  );
};
