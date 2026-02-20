import { useEffect, useRef } from "react";

const noteChars = ["♪", "♫", "♬", "♩", "🎵", "🎶"];

export function FloatingNotes() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    for (let i = 0; i < 12; i++) {
      const el = document.createElement("div");
      el.className = "note";
      el.textContent = noteChars[Math.floor(Math.random() * noteChars.length)];
      el.style.left = `${Math.random() * 100}%`;
      el.style.animationDuration = `${9 + Math.random() * 12}s`;
      el.style.animationDelay = `${Math.random() * 10}s`;
      el.style.fontSize = `${1 + Math.random() * 1.3}rem`;
      container.appendChild(el);
    }
    return () => { container.innerHTML = ""; };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
    />
  );
}
