"use client";

import supabaseClient from "@/lib/supabaseClient";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const SignIn = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Function to check authentication and redirect if logged in
  const checkAuth = async () => {
    try {
      const { data, error } = await supabaseClient.auth.getSession();

      if (error) throw error;

      if (data?.session) {
        router.push("/profile");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Failed to check authentication status");
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for authentication state changes
    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          router.push("/profile");
        }
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  // Handle Google Sign-In
  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
      });

      if (error) throw error;

      toast.success("Redirecting to authentication...");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#FFF3E0] to-[#E8F4FF]">
        <div className="text-2xl font-bold text-[#4ECDC4]">
          Checking authentication...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-[#FFF3E0] to-[#E8F4FF] pt-5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-48 h-48 bg-[#FF6B6B]/10 rounded-full -top-24 -left-24 animate-float"></div>
        <div className="absolute w-64 h-64 bg-[#4ECDC4]/10 rounded-full -bottom-32 -right-32 animate-float-delayed"></div>
      </div>

      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 md:px-8 mb-4 z-10">
        <div className="relative hover:scale-105 transition-transform cursor-pointer">
          <Image
            src="/logo.png"
            alt="StepWise Logo"
            width={160}
            height={60}
            priority
            className="drop-shadow-lg"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full flex-1 grid md:grid-cols-2 items-center gap-8 px-4 md:px-8 py-6 z-10">
        {/* Mascot Image */}
        <div className="w-full flex justify-center order-2 md:order-1 group cursor-pointer">
          <Image
            src="/hero.png"
            alt="Friendly Learning Buddy"
            width={700}
            height={700}
            className="h-auto transition-transform group-hover:rotate-2"
            priority
          />
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center md:items-start text-gray-900 order-1 md:order-2">
          <div className="max-w-2xl">
            <h1 className="mb-6">
              <div className="text-4xl sm:text-5xl lg:text-6xl text-[#4ECDC4] mb-4 font-[Baloo] cursor-default">
                Learn Smarter With
              </div>
              <div className="relative inline-block cursor-default">
                <span className="text-5xl sm:text-6xl lg:text-7xl font-[Fredoka] font-bold text-[#FF6B6B] tracking-wide">
                  STEPWISE
                </span>
                <div className="absolute bottom-0 left-0 w-full h-3 bg-[#FFE66D] rounded-full transform -rotate-2" />
              </div>
            </h1>

            <p className="mb-8 text-xl text-[#2D3047] leading-relaxed font-[Comic Neue] cursor-default">
              Your 🤖 robot study buddy that{" "}
              <strong className="text-[#4ECDC4]">adapts to YOU!</strong>
              Get 🎮 game-like lessons and 📚 step-by-step help that makes
              learning feel like{" "}
              <span className="text-[#FF6B6B] font-bold">playtime!</span>
            </p>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="px-8 py-4 text-xl rounded-2xl font-bold bg-[#4ECDC4] hover:bg-[#45B7AF] text-white shadow-lg hover:scale-105 transition-all flex items-center gap-3 w-full md:w-auto cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="animate-spin">🌀</span> Loading...
                </>
              ) : (
                <>
                  Start Learning Adventure!
                  <span className="text-2xl">🎪</span>
                </>
              )}
            </button>

            <p className="mt-8 text-lg text-[#2D3047] font-[Baloo]">
              Already have an account?{" "}
              <button
                className="text-[#FF6B6B] hover:text-[#FF5252] font-bold underline underline-offset-4 decoration-[#FFE66D] decoration-3 cursor-pointer"
                onClick={handleLogin}
                disabled={loading}
              >
                Sign in here! 🚪
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
