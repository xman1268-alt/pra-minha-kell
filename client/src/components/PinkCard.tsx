import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { motion } from "framer-motion";

interface PinkCardProps extends HTMLAttributes<HTMLDivElement> {
  delay?: number;
}

export function PinkCard({ className, children, delay = 0, ...props }: PinkCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className={cn(
        "bg-white/85 backdrop-blur-md rounded-3xl p-6 w-full",
        "shadow-[0_8px_32px_rgba(233,30,140,0.15)]",
        "border border-pink-100",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
