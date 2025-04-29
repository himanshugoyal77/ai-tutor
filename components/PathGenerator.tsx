"use client";
import { useState, useEffect } from "react";
import Groq from "groq-sdk";
import supabaseClient from "../lib/supabaseClient";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const LearningPathGenerator = () => {
  // Prevents server-side rendering issues
  if (typeof window === "undefined") {
    return null;
  }

  const router = useRouter();

  const userId =
    new URLSearchParams(window.location.search).get("userId") ||
    "defaultUserId";

  const [userProfile, setUserProfile] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [timePeriod, setTimePeriod] = useState("4 weeks");
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [syllabusText, setSyllabusText] = useState("");
  const [learningPath, setLearningPath] = useState(null);
  const [parsedLearningPath, setParsedLearningPath] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [userLearningPaths, setUserLearningPaths] = useState([]);
  const [viewMode, setViewMode] = useState("create"); // create, view
  const [selectedPathId, setSelectedPathId] = useState(null);

  const groq = new Groq({
    apiKey: "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",
    dangerouslyAllowBrowser: true,
  });

  // Fetch user profile and existing learning paths
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

        setSelectedPathId(pathsData[0]?.id || null);
        setUserLearningPaths(pathsData);
      } catch (err) {
        setError("Failed to load user data");
        console.error(err);
      }
    };

    if (userId) fetchUserData();
  }, [userId]);

  // Handle file upload and extract text
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSyllabusFile(file);

    try {
      // For PDF text extraction - you'll need a PDF parsing library
      if (file.type === "application/pdf") {
        // This is a placeholder for PDF parsing logic
        // In a real implementation, you would use a library like pdf.js or pdfjs-dist

        setSyllabusText(`Syllabus content from: ${file.name}`);
        const formData = new FormData();
        formData.append("FILE", file);
        // Example implementation with PDF.js would be something like:

        const response = await fetch("/api/parse-data", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const parsedText = await response.text();

        setSyllabusText(parsedText);
      } else {
        // For text files like .txt, .doc, etc.
        const text = await file.text();

        console.log("text", text);
        setSyllabusText(text);
      }
    } catch (err) {
      setError("Failed to parse syllabus file");
      console.error(err);
    }
  };

  // Generate learning path
  const generateLearningPath = async () => {
    if (!selectedSubject || !timePeriod) {
      setError("Please select a subject and time period");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine the number of weeks from the selected time period
      const weekCount =
        timePeriod === "semester" ? 16 : parseInt(timePeriod.split(" ")[0]);

      // Construct the prompt for Groq
      const prompt = `
        Create a personalized learning path for ${
          userProfile?.username || "the student"
        } 
        (age ${userProfile?.age || "N/A"}, grade ${
        userProfile?.standard || "N/A"
      }).
        
        Requirements:
        - Subject: ${selectedSubject}
        - Time period: ${timePeriod} (${weekCount} weeks)
        - Student's favorite subjects: ${
          userProfile?.favourite_subjects?.join(", ") || "Not specified"
        }
        - Learning goals: ${
          JSON.parse(userProfile?.learning_goals || "[]")?.join(", ") ||
          "General mastery"
        }
        
        ${
          syllabusText
            ? `Syllabus content:\n${syllabusText}`
            : "No syllabus provided"
        }
        
        Generate a structured learning path with:
        1. Weekly breakdown of topics (${weekCount} weeks total)
        2. Key concepts to focus on each week
        3. Recommended resources for each week
        4. Assessment checkpoints
        5. Adaptive suggestions based on student's profile
        
        Format the response as a JSON object with the following structure:
        {
          "title": "Learning Path title",
          "subject": "${selectedSubject}",
          "description": "A brief description of the learning path",
          "duration": "${timePeriod}",
          "weeks": [
            {
              "week": 1,
              "title": "Week 1 Title",
              "topics": ["Topic 1", "Topic 2", ...],
              "concepts": ["Concept 1", "Concept 2", ...],
              "resources": ["Resource 1", "Resource 2", ...],
              "assessments": ["Assessment 1", "Assessment 2", ...],
              "suggestions": "Personalized suggestions for the student"
            },
            ...
          ]
        }
      `;

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-70b-8192",
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const contentJson = JSON.parse(response.choices[0].message.content);
      setLearningPath(response.choices[0].message.content);
      setParsedLearningPath(contentJson);

      // Store the learning path in Supabase
      const { data, error: saveError } = await supabaseClient
        .from("learning_paths")
        .insert({
          user_id: userId,
          subject: selectedSubject,
          title: contentJson.title,
          description: contentJson.description,
          duration: timePeriod,
          syllabus_text: syllabusText || null,
          content: contentJson,
          created_at: new Date().toISOString(),
        })
        .select();

      setSelectedPathId(data[0]?.id || null);

      if (saveError) throw saveError;

      // Refresh user learning paths
      const { data: updatedPaths, error: fetchError } = await supabaseClient
        .from("learning_paths")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setUserLearningPaths(updatedPaths);
    } catch (err) {
      setError("Failed to generate or save learning path");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const viewLearningPath = async (pathId) => {
    try {
      const { data, error } = await supabaseClient
        .from("learning_paths")
        .select("*")
        .eq("id", pathId)
        .single();

      if (error) throw error;
      setParsedLearningPath(data.content);
      setSelectedPathId(pathId);
      setViewMode("view");
    } catch (err) {
      setError("Failed to load learning path");
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Personalized Learning Path Generator
      </h1>

      {userProfile ? (
        <div className="space-y-6">
          {/* User's Existing Learning Paths */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Your Learning Paths
              </h2>
              <button
                onClick={() => {
                  setViewMode("create");
                  setParsedLearningPath(null);
                  setSelectedPathId(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Create New Path
              </button>
            </div>

            {userLearningPaths.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userLearningPaths.map((path) => (
                  <div
                    key={path.id}
                    onClick={() => viewLearningPath(path.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition hover:shadow-md ${
                      selectedPathId === path.id
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200"
                    }`}
                  >
                    <h3 className="font-medium text-lg text-gray-800">
                      {path.title}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Subject: {path.subject}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Duration: {path.duration}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Created: {new Date(path.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                No learning paths created yet.
              </p>
            )}
          </div>

          {viewMode === "create" ? (
            <div className="space-y-6 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Create New Learning Path
              </h2>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold text-blue-800">
                  Student Profile
                </h2>
                <p className="text-gray-700">
                  {userProfile.username}, Grade {userProfile.standard}, Age{" "}
                  {userProfile.age}
                </p>
                {userProfile.favourite_subjects?.length > 0 && (
                  <p className="text-gray-700">
                    Favorite Subjects:{" "}
                    {userProfile.favourite_subjects.join(", ")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Subject
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                      <option value="">Select a subject</option>
                      {userProfile.favourite_subjects?.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Period
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(e.target.value)}
                    >
                      <option value="2 weeks">2 Weeks</option>
                      <option value="4 weeks">4 Weeks</option>
                      <option value="8 weeks">8 Weeks</option>
                      <option value="12 weeks">12 Weeks</option>
                      <option value="semester">Full Semester (16 Weeks)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Syllabus (Optional)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        id="syllabus-upload"
                        className="hidden"
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="syllabus-upload"
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 cursor-pointer transition"
                      >
                        Choose File
                      </label>
                      <span className="text-sm text-gray-500">
                        {syllabusFile ? syllabusFile.name : "No file chosen"}
                      </span>
                    </div>
                    {syllabusFile && (
                      <p className="mt-1 text-xs text-gray-500">
                        {syllabusFile.type === "application/pdf"
                          ? "PDF detected - text will be extracted"
                          : "Text file detected"}
                      </p>
                    )}
                    {syllabusText && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Extracted Text Preview
                        </label>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 max-h-24 overflow-y-auto">
                          {syllabusText.length > 200
                            ? syllabusText.substring(0, 200) + "..."
                            : syllabusText}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={generateLearningPath}
                disabled={isLoading || !selectedSubject}
                className={`px-6 py-3 rounded-md text-white font-medium ${
                  isLoading || !selectedSubject
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } transition`}
              >
                {isLoading ? "Generating..." : "Generate Learning Path"}
              </button>

              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  {parsedLearningPath?.title}
                </h2>
                <button
                  onClick={() => {
                    setViewMode("create");
                    setSelectedPathId(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                >
                  Back to Create
                </button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-700 font-medium">
                  {parsedLearningPath?.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {parsedLearningPath?.subject}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {parsedLearningPath?.duration}
                  </span>
                </div>

                {/* Show syllabus text if available from the selected path */}
                {userLearningPaths.find((path) => path.id === selectedPathId)
                  ?.syllabus_text && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Syllabus Used
                    </h4>
                    <div className="text-sm text-gray-600 max-h-24 overflow-y-auto">
                      {
                        userLearningPaths.find(
                          (path) => path.id === selectedPathId
                        )?.syllabus_text
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stepper UI for weeks */}
          {parsedLearningPath && (
            <div className="mt-8">
              {/* Week selector */}
              <div className="flex overflow-x-auto pb-2 mb-4 space-x-2">
                {parsedLearningPath.weeks.map((week, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`px-4 py-2 rounded-md whitespace-nowrap transition ${
                      activeStep === index
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Week {week.week}
                  </button>
                ))}
              </div>

              {/* Current week content */}
              {parsedLearningPath.weeks[activeStep] && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">
                    Week {parsedLearningPath.weeks[activeStep].week}:{" "}
                    {parsedLearningPath.weeks[activeStep].title}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-blue-700 mb-2">
                          Topics
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {parsedLearningPath.weeks[activeStep].topics.map(
                            (topic, idx) => (
                              <li key={idx} className="text-gray-700">
                                <a
                                  href={`/chat?id=${selectedPathId}&topic=${topic}`}
                                >
                                  {topic}
                                </a>
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-blue-700 mb-2">
                          Key Concepts
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {parsedLearningPath.weeks[activeStep].concepts.map(
                            (concept, idx) => (
                              <li key={idx} className="text-gray-700">
                                {concept}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-blue-700 mb-2">
                          Resources
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {parsedLearningPath.weeks[activeStep].resources.map(
                            (resource, idx) => (
                              <li key={idx} className="text-gray-700">
                                {resource}
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-blue-700 mb-2">
                          Assessments
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {parsedLearningPath.weeks[activeStep].assessments.map(
                            (assessment, idx) => (
                              <li key={idx} className="text-gray-700">
                                {assessment}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      Personalized Suggestions
                    </h4>
                    <p className="text-gray-700">
                      {parsedLearningPath.weeks[activeStep].suggestions}
                    </p>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                      disabled={activeStep === 0}
                      className={`px-4 py-2 rounded-md ${
                        activeStep === 0
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Previous Week
                    </button>

                    <button
                      onClick={() =>
                        setActiveStep(
                          Math.min(
                            parsedLearningPath.weeks.length - 1,
                            activeStep + 1
                          )
                        )
                      }
                      disabled={
                        activeStep === parsedLearningPath.weeks.length - 1
                      }
                      className={`px-4 py-2 rounded-md ${
                        activeStep === parsedLearningPath.weeks.length - 1
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Next Week
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center items-center h-32">
          <p className="text-gray-500">Loading user profile...</p>
        </div>
      )}
    </div>
  );
};

export default LearningPathGenerator;
