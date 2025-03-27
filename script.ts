// Type Definitions
type LearningStyle = "visual" | "auditory" | "kinesthetic" | "reading_writing";
type Interest = string;
type Subject = string;

interface UserProfile {
  learningStyle: LearningStyle;
  interests: Interest[];
  currentSubject: Subject;
  performanceHistory: PerformanceEntry[];
}

interface PerformanceEntry {
  subject: Subject;
  score: number;
  timestamp: Date;
}

interface PersonalizedContent {
  content: string;
  difficulty: number;
  personalizationScore: number;
}

// Personalization Strategies
const personalizationStrategies = {
  learningStyleMapping: {
    visual: {
      preferredApproaches: [
        "diagrams",
        "visual metaphors",
        "image-based explanations",
      ],
      transformations: [
        (content: string) =>
          `Here's a visual breakdown of the concept:\n${content}`,
        (content: string) => `Imagine this concept as a picture: ${content}`,
      ],
    },
    auditory: {
      preferredApproaches: [
        "storytelling",
        "verbal explanations",
        "sound-based analogies",
      ],
      transformations: [
        (content: string) =>
          `Let me tell you a story that explains this: ${content}`,
        (content: string) =>
          `Think of this concept like a conversation: ${content}`,
      ],
    },
    kinesthetic: {
      preferredApproaches: [
        "practical examples",
        "interactive scenarios",
        "hands-on explanations",
      ],
      transformations: [
        (content: string) =>
          `Here's a practical way to understand this: ${content}`,
        (content: string) =>
          `Imagine you're experiencing this concept directly: ${content}`,
      ],
    },
    reading_writing: {
      preferredApproaches: [
        "detailed explanations",
        "structured notes",
        "academic language",
      ],
      transformations: [
        (content: string) => `Detailed explanation of the concept:\n${content}`,
        (content: string) => `Here's a structured breakdown: ${content}`,
      ],
    },
  },

  interestMapping: {
    technology: {
      subjectAdapters: {
        math: "Explore mathematical concepts through computational thinking",
        physics:
          "Understand physical principles behind technological innovations",
        biology: "Connect biological systems to technological analogies",
      },
    },
    sports: {
      subjectAdapters: {
        math: "Apply mathematical concepts to sports statistics and performance analysis",
        physics: "Examine physical principles in athletic movements",
        biology: "Investigate physiological aspects of sports performance",
      },
    },
  },
};

/**
 * Calculate adaptive difficulty based on performance history
 */
function calculateAdaptiveDifficulty(
  performanceHistory: PerformanceEntry[]
): number {
  if (performanceHistory.length === 0) return 0.5;

  const recentScores = performanceHistory.slice(-5).map((entry) => entry.score);
  const averageScore =
    recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;

  if (averageScore > 0.8) return 0.7;
  if (averageScore < 0.5) return 0.3;
  return 0.5;
}

/**
 * Apply learning style specific transformations
 */
function applyLearningStyleTransformation(
  content: string,
  learningStyle: LearningStyle
): string {
  const styleConfig =
    personalizationStrategies.learningStyleMapping[learningStyle] ||
    personalizationStrategies.learningStyleMapping.reading_writing;

  const transformations = styleConfig.transformations;
  const selectedTransformation =
    transformations[Math.floor(Math.random() * transformations.length)];

  return selectedTransformation(content);
}

/**
 * Align content with user interests
 */
function alignWithUserInterests(
  content: string,
  interests: Interest[],
  subject: Subject
): string {
  const matchedInterest = interests.find((interest) =>
    Object.keys(personalizationStrategies.interestMapping).includes(interest)
  );

  if (!matchedInterest) return content;

  const interestAdapters =
    personalizationStrategies.interestMapping[matchedInterest].subjectAdapters;

  const subjectAdapter = interestAdapters[subject];
  return subjectAdapter ? `${subjectAdapter}. ${content}` : content;
}

/**
 * Calculate comprehensive personalization score
 */
function calculatePersonalizationScore(
  userProfile: UserProfile,
  content: string
): number {
  const { learningStyle, interests, currentSubject } = userProfile;

  const scoringFactors = [
    personalizationStrategies.learningStyleMapping[
      learningStyle
    ]?.preferredApproaches.some((approach) => content.includes(approach))
      ? 25
      : 0,

    interests.some((interest) =>
      content.toLowerCase().includes(interest.toLowerCase())
    )
      ? 25
      : 0,

    content.toLowerCase().includes(currentSubject.toLowerCase()) ? 25 : 0,

    userProfile.performanceHistory.length > 0 ? 25 : 0,
  ];

  return scoringFactors.reduce((sum, score) => sum + score, 0);
}

/**
 * Personalize content based on user profile
 */
function personalizeContent(
  content: string,
  userProfile: UserProfile
): PersonalizedContent {
  const { learningStyle, interests, currentSubject, performanceHistory } =
    userProfile;

  // 1. Learning Style Adaptation
  const stylizedContent = applyLearningStyleTransformation(
    content,
    learningStyle
  );

  // 2. Interest Alignment
  const interestedContent = alignWithUserInterests(
    stylizedContent,
    interests,
    currentSubject
  );

  // 3. Difficulty Adjustment
  const adaptiveDifficulty = calculateAdaptiveDifficulty(performanceHistory);

  // 4. Generate Personalization Score
  const personalizationScore = calculatePersonalizationScore(
    userProfile,
    content
  );

  return {
    content: interestedContent,
    difficulty: adaptiveDifficulty,
    personalizationScore,
  };
}

/**
 * Generate personalized learning recommendations
 */
function generateRecommendations(userProfile: UserProfile): string[] {
  const { interests, currentSubject, performanceHistory } = userProfile;

  // Identify potential knowledge gaps
  const weakPerformanceSubjects = performanceHistory
    .filter((entry) => entry.score < 0.6)
    .map((entry) => entry.subject);

  // Generate recommendations based on interests and weak subjects
  return interests.flatMap((interest) => {
    const interestAdapters =
      personalizationStrategies.interestMapping[interest]?.subjectAdapters ||
      {};

    return weakPerformanceSubjects.map(
      (subject) =>
        interestAdapters[subject] ||
        `Explore ${subject} through ${interest}-based learning`
    );
  });
}

/**
 * Demonstration function
 */
function demonstratePersonalizationEngine() {
  const userProfile: UserProfile = {
    learningStyle: "visual",
    interests: ["technology", "sports"],
    currentSubject: "physics",
    performanceHistory: [
      { subject: "math", score: 0.4, timestamp: new Date() },
      { subject: "physics", score: 0.6, timestamp: new Date() },
    ],
  };

  const originalContent =
    "Newton's laws describe the relationship between a body and the forces acting upon it, and how a body moves in response to those forces.";

  // Personalize the content
  const personalizedResult = personalizeContent(originalContent, userProfile);

  console.log("Personalized Content:", personalizedResult.content);
  console.log("Difficulty Level:", personalizedResult.difficulty);
  console.log(
    "Personalization Score:",
    personalizedResult.personalizationScore
  );

  // Generate recommendations
  const recommendations = generateRecommendations(userProfile);
  console.log("Recommendations:", recommendations);
}

// Export functions for use in other modules
export {
  personalizeContent,
  generateRecommendations,
  calculatePersonalizationScore,
};
