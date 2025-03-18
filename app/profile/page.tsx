"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import supabaseClient from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type ProfileFormData = {
  email: string;
  username: string;
  avatar_url: string;
  age: number;
  standard: string;
  favourite_subjects: string;
  learning_goals: string;
};

export default function ProfileForm() {
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<ProfileFormData>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Create Profile</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input
          type="text"
          {...register("username", { required: true })}
          placeholder="Username"
          className="w-full p-2 border rounded"
        />

        <input
          type="number"
          {...register("age", { valueAsNumber: true })}
          placeholder="Age"
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          {...register("standard")}
          placeholder="Standard (e.g. Grade 5)"
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          {...register("favourite_subjects")}
          placeholder="Favourite Subjects (comma separated)"
          className="w-full p-2 border rounded"
        />
        <textarea
          {...register("learning_goals")}
          placeholder="Learning Goals"
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
      {message && <p className="mt-4 text-center text-green-500">{message}</p>}
    </div>
  );
}
