"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function LoadingPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#FFF5D6] to-[#E1F5FE] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-64 h-64 bg-[#FFD700]/10 rounded-full top-20 -left-32 animate-float"></div>
        <div className="absolute w-48 h-48 bg-[#4CAF50]/10 rounded-full bottom-20 -right-24 animate-float-delayed"></div>
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-8 z-10"
      >
        {/* Logo */}
        <div className="relative hover:scale-105 transition-transform">
          <Image
            src="/logo.png"
            alt="StepWise Logo"
            width={200}
            height={80}
            priority
            className="drop-shadow-lg animate-pulse"
          />
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{
              y: [-10, 10, -10],
              rotate: [0, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="text-6xl"
          >
            🚀
          </motion.div>

          <div className="flex gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-3 h-3 bg-[#FF6B6B] rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
              className="w-3 h-3 bg-[#4ECDC4] rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
              className="w-3 h-3 bg-[#FFE66D] rounded-full"
            />
          </div>

          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-[Fredoka] text-[#2D3047] text-center"
          >
            Preparing your learning adventure...
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
