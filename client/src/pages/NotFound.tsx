import { useLocation } from "wouter";
import { PinkButton } from "@/components/PinkButton";
import { FloatingNotes } from "@/components/FloatingNotes";
import { Home } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FloatingNotes />
      <div className="text-center z-10 space-y-6">
        <div className="text-8xl">🎵</div>
        <h1 className="text-4xl font-['Playfair_Display'] font-bold gradient-text">404</h1>
        <p className="text-gray-400">This page doesn't exist... yet!</p>
        <PinkButton onClick={() => setLocation("/")}>
          <Home className="w-4 h-4" /> Back Home
        </PinkButton>
      </div>
    </div>
  );
}
