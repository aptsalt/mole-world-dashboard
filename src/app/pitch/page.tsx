"use client";

import {
  Lightbulb, Pen, Cpu, GitBranch, Mic, LayoutDashboard,
  Rocket, ArrowRight, ChevronRight, Monitor, Zap,
  Film, Sparkles, ExternalLink,
} from "lucide-react";

// ── Slide Data ───────────────────────────────────────

interface PitchSlide {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  metrics: { label: string; value: string }[];
  highlights: string[];
}

const SLIDES: PitchSlide[] = [
  {
    step: 1,
    title: "The Vision",
    subtitle: "One person. Zero budget. Full animated film.",
    description:
      "What if a solo engineer could build an entire animated short film using AI? The Mole World is a dystopian narrative set in underground tunnels where humans are controlled via neural implants. Protagonists Anaya and Deepak discover each other and spark a rebellion. Chapter 1 covers the opening 2\u20135 minutes.",
    color: "var(--cyan)",
    icon: <Lightbulb size={24} />,
    metrics: [
      { label: "Scenes", value: "14" },
      { label: "Shots", value: "25" },
      { label: "Characters", value: "6" },
      { label: "Runtime", value: "2\u20135 min" },
    ],
    highlights: [
      "Original screenplay and storyboard",
      "25 sequential shots forming continuous narrative",
      "7 unique underground locations",
    ],
  },
  {
    step: 2,
    title: "Prompt Engineering",
    subtitle: "Crafting the cinematic language for AI",
    description:
      "Each of the 89 shots required carefully engineered prompts that balance visual fidelity, narrative coherence, and character consistency. A style prefix system ensures uniform cinematic quality across every frame, while emotion-driven descriptions guide the AI toward the intended mood.",
    color: "#8b5cf6",
    icon: <Pen size={24} />,
    metrics: [
      { label: "Unique Prompts", value: "89" },
      { label: "Prefix Length", value: "12 tokens" },
      { label: "Iterations", value: "3\u20135x / shot" },
      { label: "Consistency", value: "Style Lock" },
    ],
    highlights: [
      "Cinematic prefix: grain, lighting, composition",
      "Character-specific visual descriptors maintained across shots",
      "Emotion tags drive camera angle and color grading",
    ],
  },
  {
    step: 3,
    title: "GPU / ML Engineering",
    subtitle: "Enterprise-grade inference infrastructure",
    description:
      "Running WanVideo 2.1 (14 billion parameters) on a local RTX 4090 with 16GB VRAM. Built a custom ComfyUI pipeline for automated batch generation, queue management, and fault recovery. Each clip renders in ~34 minutes at full VRAM utilization.",
    color: "#f59e0b",
    icon: <Cpu size={24} />,
    metrics: [
      { label: "GPU", value: "RTX 4090" },
      { label: "Model", value: "14B params" },
      { label: "Per Clip", value: "~34 min" },
      { label: "Total GPU", value: "19.8 hrs" },
    ],
    highlights: [
      "WanVideo 2.1 14B \u2014 state-of-the-art video generation",
      "ComfyUI orchestration with automated queue and restarts",
      "Fault-tolerant: auto-retry on OOM, checkpoint recovery",
    ],
  },
  {
    step: 4,
    title: "Dual Model Architecture",
    subtitle: "V1 for speed. V2 for quality. Both for comparison.",
    description:
      "A two-pass rendering strategy: V1 Standard generates all 25 shots quickly for editorial review, while V2 Enhanced re-renders each shot with higher quality settings. This enables side-by-side comparison and iterative refinement without blocking the production pipeline.",
    color: "#3b82f6",
    icon: <GitBranch size={24} />,
    metrics: [
      { label: "V1 Clips", value: "25 / 25" },
      { label: "V2 Clips", value: "9 / 25" },
      { label: "V1 Avg", value: "36.8 min" },
      { label: "V2 Avg", value: "34.4 min" },
    ],
    highlights: [
      "V1 complete \u2014 full editorial cut available",
      "V2 in progress \u2014 2.7x higher fidelity output",
      "Diff overlay tool for frame-by-frame comparison",
    ],
  },
  {
    step: 5,
    title: "Voice & Narration",
    subtitle: "AI-generated voice acting pipeline",
    description:
      "All 89 narrations generated through a custom TTS pipeline with multiple voice profiles. Each character has a dedicated voice actor profile with reference audio for consistent tone. The system supports emotional range mapping and scene-appropriate delivery.",
    color: "#22c55e",
    icon: <Mic size={24} />,
    metrics: [
      { label: "Narrations", value: "89" },
      { label: "Voice Profiles", value: "6" },
      { label: "Audio Size", value: "76.6 MB" },
      { label: "Format", value: "WAV/MP3" },
    ],
    highlights: [
      "Character-specific voice actor profiles",
      "Emotional tone mapped to scene mood descriptors",
      "Automated audio compositing with video clips",
    ],
  },
  {
    step: 6,
    title: "Production Dashboard",
    subtitle: "Real-time production intelligence",
    description:
      "Built a comprehensive production dashboard through 43+ iterative feature batches. Started as a single HTML file (15,000+ lines) with glass-morphism UI, then migrated to Next.js + TypeScript for portfolio deployment. Live pipeline monitoring, clip management, render analytics, and storyboard visualization.",
    color: "#ec4899",
    icon: <LayoutDashboard size={24} />,
    metrics: [
      { label: "Feature Batches", value: "43+" },
      { label: "Lines of Code", value: "15K+" },
      { label: "Pages", value: "8" },
      { label: "Stack", value: "Next.js" },
    ],
    highlights: [
      "Glass-morphism dark UI with live data refresh",
      "Real-time render tracking, GPU monitoring, activity feed",
      "Migrated to Next.js + TypeScript + Zustand + Recharts",
    ],
  },
  {
    step: 7,
    title: "The Outcome",
    subtitle: "From concept to production in one sprint",
    description:
      "A complete AI film production pipeline \u2014 from screenplay to rendered clips to narrated audio to editing suite \u2014 built by one person. The system demonstrates end-to-end ML engineering, prompt engineering, infrastructure management, and full-stack development. Ready for chapters 2\u20137.",
    color: "var(--cyan)",
    icon: <Rocket size={24} />,
    metrics: [
      { label: "Pipeline", value: "End-to-End" },
      { label: "Team Size", value: "1 person" },
      { label: "Budget", value: "$0" },
      { label: "Next", value: "Ch. 2\u20137" },
    ],
    highlights: [
      "Full stack: AI generation \u2192 Voice \u2192 Editing \u2192 Dashboard",
      "Production-grade monitoring and fault tolerance",
      "Portfolio-ready with live Vercel deployment",
    ],
  },
];

// ── Sub-components ───────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass p-3 text-center min-w-[100px]">
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] font-medium text-muted uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function SlideSection({ slide, isLast }: { slide: PitchSlide; isLast: boolean }) {
  return (
    <div className="relative flex gap-6 md:gap-10">
      {/* Timeline */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
          style={{ background: `${slide.color}20`, border: `2px solid ${slide.color}` }}
        >
          <span className="text-sm font-bold" style={{ color: slide.color }}>{slide.step}</span>
        </div>
        {!isLast && (
          <div className="w-px flex-1 min-h-[40px] mt-2" style={{ background: `${slide.color}30` }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-12 flex-1 min-w-0">
        <div className="glass p-6 md:p-8 hover:border-white/[0.12] transition-all group hover-lift">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${slide.color}15`, color: slide.color }}
            >
              {slide.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{slide.title}</h3>
              <p className="text-sm text-muted mt-0.5">{slide.subtitle}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-text/80 mb-6">{slide.description}</p>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            {slide.metrics.map((m) => (
              <MetricCard key={m.label} label={m.label} value={m.value} color={slide.color} />
            ))}
          </div>

          {/* Highlights */}
          <div className="space-y-2">
            {slide.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight size={14} className="mt-0.5 shrink-0" style={{ color: slide.color }} />
                <span className="text-xs text-muted">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Skill badges ─────────────────────────────────────

const SKILLS = [
  "Python", "TypeScript", "Next.js", "React", "Flask",
  "PyTorch", "ComfyUI", "WanVideo 2.1", "TTS/Voice AI",
  "Zustand", "Tailwind CSS", "Recharts",
  "GPU Computing", "ML Inference", "Prompt Engineering",
  "CI/CD", "System Design",
];

// ── Page ─────────────────────────────────────────────

export default function PitchPage() {
  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Hero */}
      <div className="relative mb-16 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-bg via-bg-light to-bg p-8 md:p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Film size={16} className="text-cyan" />
            <span className="text-xs font-semibold text-cyan uppercase tracking-widest">
              Development Journey
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            The Mole World
          </h1>
          <p className="text-lg text-muted max-w-2xl">
            An AI-powered animated short film built from scratch by one engineer.
            From screenplay to screen — ML pipeline, voice acting, and production suite.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-cyan/10 px-3 py-1.5 text-xs font-medium text-cyan">
              <Monitor size={12} /> RTX 4090
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400">
              <Zap size={12} /> WanVideo 2.1 14B
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
              <Sparkles size={12} /> 89 AI-Generated Shots
            </span>
          </div>
        </div>
        {/* Decorative gradient orbs */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan/5 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      {/* Timeline Slides */}
      <div className="mb-16">
        {SLIDES.map((slide, i) => (
          <SlideSection key={slide.step} slide={slide} isLast={i === SLIDES.length - 1} />
        ))}
      </div>

      {/* Skills */}
      <div className="glass p-6 md:p-8 mb-12">
        <h3 className="text-sm font-semibold text-white mb-4">Technical Skills Demonstrated</h3>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((skill) => (
            <span key={skill} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-muted hover:bg-cyan/10 hover:text-cyan transition-colors">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mb-8">
        <div className="glass glow-cyan inline-flex flex-col items-center p-8">
          <Rocket size={32} className="text-cyan mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Built by Deep Chand</h3>
          <p className="text-sm text-muted mb-4 max-w-md">
            Solo founder &amp; engineer. Turning bleeding-edge AI into production-grade products.
          </p>
          <div className="flex gap-3">
            <a
              href="https://github.com/deepchand"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.1] transition-colors"
            >
              GitHub <ExternalLink size={12} />
            </a>
            <a
              href="/"
              className="flex items-center gap-1.5 rounded-lg bg-cyan/15 px-4 py-2 text-sm font-medium text-cyan hover:bg-cyan/25 transition-colors"
            >
              View Dashboard <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
