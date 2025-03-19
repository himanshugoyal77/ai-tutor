"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import supabaseClient from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LoadingPage from "@/components/LoadingScreen";

type ProfileFormData = {
  email: string;
  username: string;
  avatar_url: string;
  age: number;
  standard: string;
  favourite_subjects: string;
  learning_goals: string;
};

const steps = [
  { title: "👋 Let's Get Started!", fields: ["username", "age"] },
  { title: "📚 School Info", fields: ["standard"] },
  { title: "⭐ Your Favorites", fields: ["favourite_subjects"] },
  { title: "🎯 Learning Goals", fields: ["learning_goals"] },
];

export default function ProfileForm() {
  const router = useRouter();
  const { register, handleSubmit, reset, trigger } = useForm<ProfileFormData>();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      const { data: profile, error } = await supabaseClient
        .from("profile")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error.message);
        return;
      }

      if (profile?.isprofile_setup) {
        router.push("/home");
        setLoading(false);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <LoadingPage />;
  }

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      setMessage("Error: User not authenticated");
      setLoading(false);
      router.push("/");
      return;
    }

    // Convert the comma-separated favourite_subjects into an array
    const formattedData = {
      ...data,
      id: user?.id,
      email: user.email,
      avatar_url: user.user_metadata.avatar_url,
      favourite_subjects: data.favourite_subjects
        ? data.favourite_subjects.split(",").map((s) => s.trim())
        : [],
      learning_goals: data.learning_goals
        ? data.learning_goals.split(",").map((s) => s.trim())
        : [],
      isprofile_setup: true,
    };

    // check if user already has a profile
    const { data: existingProfile } = await supabaseClient
      .from("profile")
      .select("*")
      .eq("id", user.id);
    console.log("user ud", user.id);
    console.log("existingProfile", existingProfile);

    if (existingProfile && existingProfile.length > 0) {
      console.log("inside existing profile");
      // Update the existing profile
      const { error } = await supabaseClient
        .from("profile")
        .update([formattedData])
        .eq("id", user.id);

      console.log("updating");
      if (error) {
        setMessage("Error: " + error.message);
      } else {
        console.log("updated");
        setMessage("Profile updated successfully!");
        reset();
        router.push("/home");
      }
      setLoading(false);
      return;
    }

    // Insert into Supabase
    const { error } = await supabaseClient
      .from("profile")
      .insert([formattedData]);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Profile created successfully!");
      reset();
      router.push("/home");
    }

    setLoading(false);
  };

  const nextStep = async () => {
    const fields = steps[currentStep].fields;
    const isValid = await trigger(fields as any);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const StepProgress = () => (
    <div className="flex justify-center gap-2 mb-8">
      {steps.map((_, index) => (
        <div
          key={index}
          className={`w-3 h-3 rounded-full ${
            index === currentStep ? "bg-[#FF6B6B]" : "bg-[#4ECDC4]/30"
          }`}
        />
      ))}
    </div>
  );

  const StepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <label className="text-[#2D3047] font-[Baloo] text-xl">
                What should we call you? 🎩
              </label>
              <input
                {...register("username", { required: true })}
                placeholder="Super Learner Name"
                className="p-4 rounded-xl border-2 border-[#4ECDC4] focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FFE66D]"
              />
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[#2D3047] font-[Baloo] text-xl">
                How young are you? 🎂
              </label>
              <input
                type="number"
                {...register("age", { valueAsNumber: true })}
                placeholder="Enter your magic number"
                className="p-4 rounded-xl border-2 border-[#4ECDC4] focus:border-[#FF6B6B]"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col gap-6">
            <label className="text-[#2D3047] font-[Baloo] text-xl">
              What grade are you in? 🏫
            </label>
            <input
              {...register("standard")}
              placeholder="Example: Grade 5"
              className="p-4 rounded-xl border-2 border-[#4ECDC4] focus:border-[#FF6B6B]"
            />
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-6">
            <label className="text-[#2D3047] font-[Baloo] text-xl">
              What subjects make you excited? 🌟
            </label>
            <input
              {...register("favourite_subjects")}
              placeholder="Math, Science, Art..."
              className="p-4 rounded-xl border-2 border-[#4ECDC4] focus:border-[#FF6B6B]"
            />
            <p className="text-[#4ECDC4] text-sm">Separate with commas</p>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col gap-6">
            <label className="text-[#2D3047] font-[Baloo] text-xl">
              What do you want to conquer? 🏆
            </label>
            <textarea
              {...register("learning_goals")}
              placeholder="I want to master fractions, learn about dinosaurs..."
              className="p-4 rounded-xl border-2 border-[#4ECDC4] h-32 focus:border-[#FF6B6B]"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-[#FFF3E0] to-[#E8F4FF] pt-5 relative overflow-hidden items-center justify-center">
      <div className="absolute -z-10 inset-0 overflow-hidden">
        <div className="absolute w-48 h-48 bg-[#FF6B6B]/10 rounded-full -top-24 -left-24 animate-float"></div>
        <div className="absolute w-64 h-64 bg-[#4ECDC4]/10 rounded-full -bottom-32 -right-32 animate-float-delayed"></div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border-4 border-[#FFE66D]"
      >
        <h2 className="text-3xl font-[Fredoka] text-center mb-6 text-[#FF6B6B]">
          {steps[currentStep].title}
        </h2>

        <StepProgress />

        <form>
          <StepContent />

          <div className="flex justify-between mt-8 gap-4">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-[#4ECDC4] text-white rounded-xl font-[Baloo] hover:bg-[#3DA89F] transition-colors"
              >
                ← Back
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="ml-auto px-8 py-3 bg-[#FF6B6B] text-white rounded-xl font-[Baloo] hover:bg-[#FF5252] transition-colors"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                onClick={handleSubmit(onSubmit)}
                className="ml-auto px-8 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white rounded-xl font-[Baloo] hover:scale-105 transition-all"
              >
                {loading ? "🚀 Launching..." : "Start Learning Adventure!"}
              </button>
            )}
          </div>
        </form>

        {message && (
          <p className="mt-4 text-center text-[#4ECDC4] font-[Comic Neue]">
            {message}
          </p>
        )}
      </motion.div>
    </div>
  );
}
