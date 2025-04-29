"use client";
import React from "react";

import dynamic from "next/dynamic";

const DynamicLearningPathGenerator = dynamic(
  () => import("../../components/PathGenerator"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

const page = () => {
  return (
    <div>
      <DynamicLearningPathGenerator />
    </div>
  );
};

export default page;
