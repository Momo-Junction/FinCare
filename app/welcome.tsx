"use client";

import { useEffect, useState } from "react";

export default function Welcome() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const dismiss = () => setVisible(false);
    const timeout = window.setTimeout(dismiss, 1700);
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  if (!visible) return null;
  return <div className="fincare-welcome" aria-hidden="true" onAnimationEnd={(event) => {
    if (event.target === event.currentTarget) setVisible(false);
  }}>
    <div className="fincare-welcome-content">
      <p className="text-5xl font-bold tracking-tight sm:text-7xl">FinCare</p>
      <p className="mt-3 text-sm text-blue-100 sm:text-base">AI-powered insights for fairer cancer care</p>
      <div className="fincare-welcome-line" />
    </div>
  </div>;
}
