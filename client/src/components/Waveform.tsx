import { cn } from "@/lib/utils";

interface WaveformProps {
  isPlaying: boolean;
  className?: string;
}

export function Waveform({ isPlaying, className }: WaveformProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1 h-14", className)}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={cn("wave-bar", isPlaying && "playing")}
        />
      ))}
    </div>
  );
}
