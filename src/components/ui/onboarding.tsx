"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  Zap,
  AudioLines,
  Send,
  Mic,
  Keyboard,
  LayoutDashboard,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
} from "lucide-react";

interface OnboardingStep {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  highlight: string; // Short feature highlight
  route?: string; // Navigate to this route on this step
}

const STEPS: OnboardingStep[] = [
  {
    icon: LayoutDashboard,
    title: "Welcome to Mole World",
    description: "Your AI-powered film production and content factory. This dashboard controls everything — from generating images and videos using 13 AI models to distributing across 4 social platforms.",
    highlight: "One dashboard to rule them all",
  },
  {
    icon: Clapperboard,
    title: "Orchestrate",
    description: "Create content with a single command. Choose your pipeline (Local GPU or Higgsfield), pick an AI model, select a voice, and let the system handle the rest. WhatsApp commands work too!",
    highlight: "molt lesson The Fall of Rome -v morgan_freeman",
    route: "/orchestrate",
  },
  {
    icon: Zap,
    title: "Production Pipeline",
    description: "Monitor automated image and video generation. The system uses Ollama to score image quality (1-10) and automatically retries low-quality outputs. Watch 87 shots generate across 3 video models.",
    highlight: "Quality assessment + auto-retry",
    route: "/production",
  },
  {
    icon: AudioLines,
    title: "Narration Studio",
    description: "Add AI-narrated voiceovers to your videos. Auto-generate scripts with Ollama, then synthesize speech with F5-TTS using any of 70 cloned celebrity voices.",
    highlight: "70 voices including Morgan Freeman",
    route: "/narration",
  },
  {
    icon: Send,
    title: "Distribution Hub",
    description: "Schedule and publish content across X, Instagram, TikTok, and YouTube. Use the content calendar to plan posts, or hit 'Post Now' for instant publishing.",
    highlight: "4 platforms, one click",
    route: "/distribution",
  },
  {
    icon: Mic,
    title: "Voice Lab",
    description: "Browse and preview 70+ cloned voices across categories — narrators, actors, characters, and more. Each voice can be used for any content type.",
    highlight: "Preview any voice instantly",
    route: "/voices",
  },
  {
    icon: Keyboard,
    title: "Pro Tips",
    description: "Use Ctrl+K for the command palette, press '?' to see all keyboard shortcuts, R to refresh data, and N to toggle notifications. Number keys 1-7 navigate to pages instantly.",
    highlight: "Ctrl+K → Command palette",
  },
];

export function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const done = localStorage.getItem("mw-onboarding-complete");
    if (!done) {
      // Small delay to let the dashboard render first
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem("mw-onboarding-complete", "true");
    setShow(false);
    router.push("/");
  }, [router]);

  const handleSkip = useCallback(() => {
    localStorage.setItem("mw-onboarding-complete", "true");
    setShow(false);
  }, []);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (STEPS[nextStep].route) {
        router.push(STEPS[nextStep].route!);
      }
    } else {
      handleComplete();
    }
  }, [step, router, handleComplete]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      if (STEPS[prevStep].route) {
        router.push(STEPS[prevStep].route!);
      }
    }
  }, [step, router]);

  if (!show) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleSkip} />

      {/* Card */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.12] bg-bg-light shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-2xl bg-white/[0.06]">
          <div
            className="h-full bg-gradient-to-r from-cyan to-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Skip onboarding"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan/10 border border-cyan/20">
              <Icon size={24} className="text-cyan" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{current.title}</h2>
              <p className="mt-1 text-sm text-muted leading-relaxed">{current.description}</p>
            </div>
          </div>

          {/* Highlight */}
          <div className="rounded-lg bg-cyan/[0.06] border border-cyan/[0.12] px-4 py-3 mb-6">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan shrink-0" />
              <code className="text-xs text-cyan font-mono">{current.highlight}</code>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setStep(i);
                  if (STEPS[i].route) router.push(STEPS[i].route!);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-cyan" : i < step ? "w-1.5 bg-cyan/40" : "w-1.5 bg-white/[0.12]"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-muted hover:text-white transition-colors"
                >
                  <ArrowLeft size={12} />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 rounded-lg bg-cyan/20 border border-cyan/30 px-4 py-1.5 text-xs font-medium text-cyan hover:bg-cyan/30 transition-colors"
              >
                {isLast ? "Get Started" : "Next"}
                {!isLast && <ArrowRight size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Re-launches the onboarding wizard */
export function resetOnboarding() {
  localStorage.removeItem("mw-onboarding-complete");
  window.location.reload();
}
