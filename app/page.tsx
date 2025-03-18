"use client";

import supabaseClient from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const SignIn = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Function to check authentication and redirect if logged in
  const checkAuth = async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
      router.push("/profile"); // Redirect if user is logged in
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
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // Handle Google Sign-In
  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) {
      console.error("Login error:", error.message);
    }
    setLoading(false);
  };

  return (
    <div>
      {" "}
      <button
        onClick={handleLogin}
        disabled={loading}
        className="mt-6 md:mt-10 cursor-pointer px-6 md:px-8 text-base md:text-xl rounded-xl h-10 md:h-12 bg-gradient-to-r from-[#00a884] to-[#02c26a] hover:from-[#468267] hover:to-[#00a884] transition-all ease-in-out duration-300"
      >
        {loading ? "Signing in..." : "Get Started"}
      </button>
    </div>
  );
};

export default SignIn;
