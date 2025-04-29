"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import supabaseClient from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LoadingPage from "@/components/LoadingScreen";
import { toast } from "react-hot-toast";

type ProfileFormData = {
  username: string;
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
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors },
  } = useForm<ProfileFormData>();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabaseClient.auth.getUser();

        if (authError || !user) {
          throw authError || new Error("User not authenticated");
        }

        const { data: profile, error: profileError } = await supabaseClient
          .from("profile")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (profile?.isprofile_setup) {
          router.push("/home");
          return;
        }

        // Pre-fill form if partial profile exists
        if (profile) {
          reset({
            username: profile.username || "",
            age: profile.age || 0,
            standard: profile.standard || "",
            favourite_subjects: profile.favourite_subjects?.join(", ") || "",
            learning_goals: profile.learning_goals?.join(", ") || "",
          });
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load profile data");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndProfile();
  }, [router, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        throw authError || new Error("User not authenticated");
      }

      const formattedData = {
        ...data,
        id: user.id,
        email: user.email,
        avatar_url: user.user_metadata.avatar_url || "",
        favourite_subjects: data.favourite_subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        learning_goals: data.learning_goals
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        isprofile_setup: true,
      };

      // Upsert the profile data
      const { error } = await supabaseClient
        .from("profile")
        .upsert(formattedData, { onConflict: "id" });

      if (error) throw error;

      toast.success("Profile saved successfully!");
      router.push("/home");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    const fields = steps[currentStep].fields;
    const isValid = await trigger(fields as any);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } else {
      toast.error("Please fill in all required fields");
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
          className={`w-3 h-3 rounded-full transition-colors ${
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
                {errors.username && (
                  <span className="text-[#FF6B6B] text-sm ml-2">Required</span>
                )}
              </label>
              <input
                {...register("username", { required: true })}
                placeholder="Super Learner Name"
                className={`p-4 rounded-xl border-2 ${
                  errors.username ? "border-[#FF6B6B]" : "border-[#4ECDC4]"
                } focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FFE66D]`}
              />
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[#2D3047] font-[Baloo] text-xl">
                How young are you? 🎂
              </label>
              <input
                type="number"
                {...register("age", {
                  valueAsNumber: true,
                  min: { value: 5, message: "Age must be at least 5" },
                  max: { value: 120, message: "Age must be less than 120" },
                })}
                placeholder="Enter your magic number"
                className={`p-4 rounded-xl border-2 ${
                  errors.age ? "border-[#FF6B6B]" : "border-[#4ECDC4]"
                } focus:border-[#FF6B6B]`}
              />
              {errors.age && (
                <span className="text-[#FF6B6B] text-sm">
                  {errors.age.message}
                </span>
              )}
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

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-[#FFF3E0] to-[#E8F4FF] pt-5 relative overflow-hidden items-center justify-center">
      <div className="absolute -z-10 inset-0 overflow-hidden">
        <div className="absolute w-48 h-48 bg-[#FF6B6B]/10 rounded-full -top-24 -left-24 animate-float"></div>
        <div className="absolute w-64 h-64 bg-[#4ECDC4]/10 rounded-full -bottom-32 -right-32 animate-float-delayed"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full mx-4 bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-4 border-[#FFE66D]"
      >
        <h2 className="text-2xl sm:text-3xl font-[Fredoka] text-center mb-6 text-[#FF6B6B]">
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
                disabled={isSubmitting}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-[#4ECDC4] text-white rounded-xl font-[Baloo] hover:bg-[#3DA89F] transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={isSubmitting}
                className="ml-auto px-6 sm:px-8 py-2 sm:py-3 bg-[#FF6B6B] text-white rounded-xl font-[Baloo] hover:bg-[#FF5252] transition-colors disabled:opacity-50"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="ml-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white rounded-xl font-[Baloo] hover:scale-105 transition-all disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">🌀</span> Saving...
                  </span>
                ) : (
                  "Start Learning Adventure!"
                )}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
