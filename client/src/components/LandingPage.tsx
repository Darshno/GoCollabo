import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Clapperboard,
  ArrowUpRight,
  Compass,
  BriefcaseBusiness,
  Sparkles,
  Layers,
  ChevronRight,
  Menu,
  X,
  UserCheck,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface LandingPageProps {
  onLogin: () => void;
  onSelectRole: (role: "creator" | "brand") => void;
}

interface OrbitAvatar {
  id: string;
  name: string;
  role: string;
  image: string;
  angle: number; // degrees
  radius: number; // percentage or px
  initials: string;
}

const ORBIT_AVATARS_RING1: OrbitAvatar[] = [
  {
    id: "a1",
    name: "Mara Chen",
    role: "AI Director",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    angle: 45,
    radius: 105,
    initials: "MC",
  },
  {
    id: "a2",
    name: "Noah Williams",
    role: "3D Animator",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    angle: 225,
    radius: 105,
    initials: "NW",
  },
];

const ORBIT_AVATARS_RING2: OrbitAvatar[] = [
  {
    id: "a3",
    name: "Elena Rostova",
    role: "Prompt Architect",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
    angle: 120,
    radius: 155,
    initials: "ER",
  },
  {
    id: "a4",
    name: "Dev Patel",
    role: "Lighting & Texture",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    angle: 300,
    radius: 155,
    initials: "DP",
  },
];

const ORBIT_AVATARS_RING3: OrbitAvatar[] = [
  {
    id: "a5",
    name: "Kaelen Vance",
    role: "Worldbuilder",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80",
    angle: 30,
    radius: 205,
    initials: "KV",
  },
  {
    id: "a6",
    name: "Maya Lin",
    role: "Motion Designer",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    angle: 200,
    radius: 205,
    initials: "ML",
  },
];

const ORBIT_AVATARS_RING4: OrbitAvatar[] = [
  {
    id: "a7",
    name: "Lucas Vance",
    role: "Cinematographer",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80",
    angle: 85,
    radius: 250,
    initials: "LV",
  },
  {
    id: "a8",
    name: "Sarah Jenkins",
    role: "Brand Strategist",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
    angle: 275,
    radius: 250,
    initials: "SJ",
  },
];

const TICKER_ITEMS = [
  "DISCOVER TALENT",
  "BUILD PORTFOLIOS",
  "FIND BRIEFS",
  "CREATE TOGETHER",
  "AI CINEMATOGRAPHY",
  "BRAND WORLDS",
  "GENERATIVE DIRECTION",
  "PROMPT ARCHITECTURE",
  "SYNTHETIC MOTION",
  "COMMISSION CRAFT",
];

function AvatarNode({
  avatar,
  counterClass,
}: {
  avatar: OrbitAvatar;
  counterClass: string;
}) {
  const [imgError, setImgError] = useState(false);

  // Position on ring circle using trigonometry
  const radian = (avatar.angle * Math.PI) / 180;
  const x = Math.cos(radian) * avatar.radius;
  const y = Math.sin(radian) * avatar.radius;

  return (
    <div
      className="absolute top-1/2 left-1/2 pointer-events-auto"
      style={{
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
    >
      <div className={`relative group ${counterClass}`}>
        <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full p-[2px] bg-[#0B0D12] border border-[#8A8D98]/30 shadow-md transition-all duration-300 group-hover:scale-115 group-hover:border-[#C8F568]">
          {imgError ? (
            <div className="w-full h-full rounded-full bg-[#0B0D12] text-[#C8F568] flex items-center justify-center text-xs font-bold font-urbanist">
              {avatar.initials}
            </div>
          ) : (
            <img
              src={avatar.image}
              alt={avatar.name}
              onError={() => setImgError(true)}
              loading="lazy"
              className="w-full h-full rounded-full object-cover"
            />
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#C8F568] border-2 border-[#0B0D12]" />
        </div>

        {/* Hover Tooltip */}
        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 whitespace-nowrap bg-[#0B0D12] text-[#F8F7F2] border border-[#8A8D98]/30 px-2.5 py-1 rounded-md text-[11px] shadow-lg">
          <p className="font-bold">{avatar.name}</p>
          <p className="text-[10px] text-[#8A8D98]">{avatar.role}</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onLogin, onSelectRole }: LandingPageProps) {
  const [, setLocation] = useLocation();
  const auth = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Typewriter state
  const fullHeadlinePart1 = "Find your people. ";
  const fullHeadlineHighlight = "Make great work happen.";
  const fullText = fullHeadlinePart1 + fullHeadlineHighlight;

  const [typedLength, setTypedLength] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setTypedLength(fullText.length);
      setIsTypingComplete(true);
      return;
    }

    const startDelay = setTimeout(() => {
      const interval = setInterval(() => {
        setTypedLength((prev) => {
          if (prev >= fullText.length) {
            clearInterval(interval);
            setIsTypingComplete(true);
            return prev;
          }
          return prev + 1;
        });
      }, 38);

      return () => clearInterval(interval);
    }, 280);

    return () => clearTimeout(startDelay);
  }, [fullText]);

  // Derived current displayed text
  const currentDisplayed = fullText.slice(0, typedLength);
  const part1Current = currentDisplayed.slice(0, fullHeadlinePart1.length);
  const highlightCurrent =
    typedLength > fullHeadlinePart1.length
      ? currentDisplayed.slice(fullHeadlinePart1.length)
      : "";

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#0B0D12] flex flex-col selection:bg-[#C8F568] selection:text-[#0B0D12]">
      {/* 1. HEADER */}
      <header className="sticky top-0 z-40 bg-[#F8F7F2]/90 backdrop-blur-md border-b border-[#0B0D12]/10 entrance-fade-down">
        <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between px-5 lg:px-10">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0D12] rounded-lg"
            aria-label="GoCollabo home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B0D12] text-[#C8F568]">
              <Clapperboard size={18} />
            </span>
            <span className="font-urbanist text-xl font-black tracking-[-0.04em] text-[#0B0D12]">
              Go<span className="font-medium text-[#8A8D98]">Collabo</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Landing Navigation" className="hidden md:flex items-center gap-8">
            <Link
              href="/discover"
              className="nav-link-underline text-sm font-semibold text-[#0B0D12] hover:text-[#0B0D12] transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/briefs"
              className="nav-link-underline text-sm font-semibold text-[#0B0D12] hover:text-[#0B0D12] transition-colors"
            >
              Briefs
            </Link>
            <a
              href="#how-it-works"
              className="nav-link-underline text-sm font-semibold text-[#0B0D12] hover:text-[#0B0D12] transition-colors"
            >
              How it works
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {auth.user ? (
              <>
                <Link
                  href={auth.user.accountType === "brand" ? "/brand" : "/creator"}
                  className="rounded-full bg-[#0B0D12] text-[#F8F7F2] px-5 py-2 text-sm font-bold transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8F568]"
                >
                  Workspace
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await auth.logout();
                  }}
                  className="rounded-full border border-[#0B0D12]/20 px-4 py-2 text-xs font-semibold text-[#8A8D98] hover:text-[#0B0D12] hover:border-[#0B0D12]"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLogin}
                  className="rounded-full px-5 py-2 text-sm font-bold text-[#0B0D12] hover:bg-[#0B0D12]/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0D12]"
                >
                  Log in
                </button>

                {/* Animated conic border button for Join Now */}
                <div className="conic-animated-border">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRole("creator");
                      onLogin();
                    }}
                    className="relative z-10 flex items-center gap-1.5 rounded-full bg-[#0B0D12] px-5 py-2 text-sm font-bold text-[#F8F7F2] transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8F568]"
                  >
                    Join Now <ArrowUpRight size={14} className="text-[#C8F568]" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-[#0B0D12]/15 text-[#0B0D12] hover:bg-[#0B0D12]/5"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#0B0D12]/10 bg-[#F8F7F2] px-6 py-5 space-y-4 shadow-xl">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-bold text-[#0B0D12]"
              >
                Discover
              </Link>
              <Link
                href="/briefs"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-bold text-[#0B0D12]"
              >
                Briefs
              </Link>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-bold text-[#0B0D12]"
              >
                How it works
              </a>
            </nav>
            <div className="pt-3 border-t border-[#0B0D12]/10 flex flex-col gap-2.5">
              {auth.user ? (
                <Link
                  href={auth.user.accountType === "brand" ? "/brand" : "/creator"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-full bg-[#0B0D12] py-2.5 text-sm font-bold text-[#F8F7F2]"
                >
                  Workspace
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogin();
                    }}
                    className="w-full rounded-full border border-[#0B0D12]/20 py-2.5 text-sm font-bold text-[#0B0D12]"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectRole("creator");
                      onLogin();
                    }}
                    className="w-full rounded-full bg-[#0B0D12] py-2.5 text-sm font-bold text-[#F8F7F2] flex items-center justify-center gap-1.5"
                  >
                    Join Now <ArrowUpRight size={14} className="text-[#C8F568]" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 px-5 lg:px-10">
        <div className="mx-auto max-w-[1360px] grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-7 space-y-6 lg:space-y-8 entrance-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0B0D12]/15 bg-white/70 px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase text-[#0B0D12]">
              <span className="h-2 w-2 rounded-full bg-[#C8F568]" />
              The AI Creative Marketplace
            </div>

            {/* Typewriter Heading */}
            <h1
              className="font-urbanist text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-extrabold tracking-[-0.04em] leading-[1.04] text-[#0B0D12] min-h-[140px] sm:min-h-[170px] lg:min-h-[210px]"
              aria-label={fullText}
            >
              <span>{part1Current}</span>
              {highlightCurrent && (
                <span className="text-[#0B0D12] bg-[#C8F568]/40 px-1 rounded-sm decoration-[#C8F568]">
                  {highlightCurrent}
                </span>
              )}
              {!isTypingComplete && (
                <span
                  className="inline-block w-[4px] h-[0.9em] ml-1 bg-[#C8F568] animate-cursor-blink align-baseline rounded-full"
                  aria-hidden="true"
                />
              )}
            </h1>

            {/* Supporting Copy */}
            <p className="max-w-xl text-base sm:text-lg text-[#8A8D98] leading-relaxed">
              Discover creative talent, explore brand opportunities, and turn good
              ideas into great collaborations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* Primary Pill Button with Sliding Electric Lime Hover Fill */}
              <div className="conic-animated-border">
                <button
                  type="button"
                  onClick={() => {
                    onSelectRole("brand");
                    setLocation("/discover");
                  }}
                  className="group relative z-10 overflow-hidden rounded-full bg-[#0B0D12] px-7 py-3.5 text-sm sm:text-base font-bold text-[#F8F7F2] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8F568]"
                >
                  {/* Sliding Lime Layer */}
                  <span
                    className="absolute inset-0 bg-[#C8F568] -translate-x-full transition-transform duration-400 ease-out group-hover:translate-x-0"
                    aria-hidden="true"
                  />
                  <span className="relative z-10 flex items-center gap-2 transition-colors duration-300 group-hover:text-[#0B0D12]">
                    Start collaborating <ArrowUpRight size={17} />
                  </span>
                </button>
              </div>

              {/* Secondary CTA */}
              <button
                type="button"
                onClick={() => {
                  onSelectRole("creator");
                  setLocation("/creator");
                }}
                className="group flex items-center gap-2 rounded-full border-2 border-[#0B0D12] px-6 py-3.5 text-sm sm:text-base font-bold text-[#0B0D12] hover:bg-[#0B0D12] hover:text-[#F8F7F2] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0D12]"
              >
                Build creator profile
              </button>
            </div>

            {/* Verification & Trust badges */}
            <div className="pt-4 flex items-center gap-6 text-xs text-[#8A8D98]">
              <span className="flex items-center gap-1.5">
                <UserCheck size={14} className="text-[#0B0D12]" /> Verified Portfolios
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#0B0D12]" /> Direct Collaboration
              </span>
            </div>
          </div>

          {/* Right Column: Animated Orbit Visualization */}
          <div className="lg:col-span-5 flex justify-center items-center entrance-orbit">
            <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] md:w-[460px] md:h-[460px] lg:w-[500px] lg:h-[500px] max-w-full flex items-center justify-center">
              {/* Ring 4 (Outer) - Counter Clockwise */}
              <div
                className="orbit-ring orbit-ccw-ring4 absolute rounded-full border border-[#8A8D98]/20 pointer-events-none"
                style={{ width: "500px", height: "500px", maxWidth: "98vw", maxHeight: "98vw" }}
              >
                {ORBIT_AVATARS_RING4.map((avatar) => (
                  <AvatarNode
                    key={avatar.id}
                    avatar={avatar}
                    counterClass="orbit-avatar-ring4"
                  />
                ))}
              </div>

              {/* Ring 3 - Clockwise */}
              <div
                className="orbit-ring orbit-cw-ring3 absolute rounded-full border border-[#8A8D98]/25 pointer-events-none"
                style={{ width: "410px", height: "410px", maxWidth: "80vw", maxHeight: "80vw" }}
              >
                {/* Accent dots on ring 3 */}
                <div className="absolute top-[18%] left-[12%] w-1.5 h-1.5 rounded-full bg-[#C8F568]" />
                <div className="absolute bottom-[22%] right-[10%] w-1.5 h-1.5 rounded-full bg-[#C8F568]" />
                {ORBIT_AVATARS_RING3.map((avatar) => (
                  <AvatarNode
                    key={avatar.id}
                    avatar={avatar}
                    counterClass="orbit-avatar-ring3"
                  />
                ))}
              </div>

              {/* Ring 2 - Counter Clockwise */}
              <div
                className="orbit-ring orbit-ccw-ring2 absolute rounded-full border border-[#8A8D98]/30 border-dashed pointer-events-none"
                style={{ width: "310px", height: "310px", maxWidth: "62vw", maxHeight: "62vw" }}
              >
                {/* Accent dot on ring 2 */}
                <div className="absolute top-[10%] right-[25%] w-1.5 h-1.5 rounded-full bg-[#C8F568]" />
                {ORBIT_AVATARS_RING2.map((avatar) => (
                  <AvatarNode
                    key={avatar.id}
                    avatar={avatar}
                    counterClass="orbit-avatar-ring2"
                  />
                ))}
              </div>

              {/* Ring 1 (Inner) - Clockwise */}
              <div
                className="orbit-ring orbit-cw-ring1 absolute rounded-full border border-[#8A8D98]/35 pointer-events-none"
                style={{ width: "210px", height: "210px", maxWidth: "44vw", maxHeight: "44vw" }}
              >
                {ORBIT_AVATARS_RING1.map((avatar) => (
                  <AvatarNode
                    key={avatar.id}
                    avatar={avatar}
                    counterClass="orbit-avatar-ring1"
                  />
                ))}
              </div>

              {/* Center Metrics Circle */}
              <div className="relative z-20 w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#0B0D12] text-[#F8F7F2] p-4 flex flex-col items-center justify-center text-center shadow-[0_12px_36px_rgba(11,13,18,0.28)] border-2 border-[#C8F568]/50">
                <span className="font-urbanist text-[11px] font-bold tracking-wider uppercase text-[#C8F568]">
                  Better work, together.
                </span>
                <span className="font-urbanist text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  500+
                </span>
                <span className="text-[10px] text-[#8A8D98] font-medium leading-tight">
                  Creators + Brands
                </span>
                <span className="mt-1 text-[8.5px] uppercase tracking-wider text-[#8A8D98]/80 bg-white/10 px-2 py-0.5 rounded-full">
                  Illustrative demo
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CAPABILITIES HORIZONTAL TICKER */}
      <section className="border-y border-[#0B0D12]/10 bg-[#0B0D12] text-[#F8F7F2] py-4 overflow-hidden">
        <div className="ticker-mask relative w-full overflow-hidden">
          <div className="ticker-track flex items-center gap-8 text-xs sm:text-sm font-extrabold uppercase tracking-[0.2em]">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
              <div key={index} className="flex items-center gap-8 shrink-0">
                <span className="text-[#F8F7F2] hover:text-[#C8F568] transition-colors">
                  {item}
                </span>
                <span className="text-[#C8F568] text-sm" aria-hidden="true">
                  ✦
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS / BENEFITS */}
      <section id="how-it-works" className="py-20 lg:py-28 px-5 lg:px-10">
        <div className="mx-auto max-w-[1360px] space-y-16">
          <div className="max-w-2xl space-y-3">
            <div className="eyebrow text-[#8A8D98]">Workflow Engine</div>
            <h2 className="font-urbanist text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.03em] text-[#0B0D12]">
              Built for the work between the prompts.
            </h2>
            <p className="text-base text-[#8A8D98] leading-relaxed">
              Generic talent platforms miss the nuances of generative media.
              GoCollabo organizes process, tools, and taste into an actionable marketplace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Step 1 */}
            <div className="rounded-2xl border border-[#0B0D12]/10 bg-white p-8 flex flex-col justify-between space-y-6 shadow-sm hover:border-[#0B0D12]/30 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-urbanist text-xs font-black text-[#0B0D12] bg-[#C8F568] px-2.5 py-1 rounded-full">
                    01
                  </span>
                  <Sparkles size={20} className="text-[#0B0D12]" />
                </div>
                <h3 className="font-urbanist text-xl font-bold text-[#0B0D12]">
                  Curated Creator Profiles
                </h3>
                <p className="text-sm text-[#8A8D98] leading-relaxed">
                  Showcase projects by generative tools (Runway, Midjourney, ComfyUI),
                  workflow styles, and deliverable aspect ratios instead of flat resumes.
                </p>
              </div>
              <div className="pt-4 border-t border-[#0B0D12]/5 text-xs font-bold text-[#0B0D12] flex items-center gap-1">
                Portfolio Studio ready <ChevronRight size={14} className="text-[#C8F568]" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-[#0B0D12]/10 bg-white p-8 flex flex-col justify-between space-y-6 shadow-sm hover:border-[#0B0D12]/30 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-urbanist text-xs font-black text-[#0B0D12] bg-[#C8F568] px-2.5 py-1 rounded-full">
                    02
                  </span>
                  <BriefcaseBusiness size={20} className="text-[#0B0D12]" />
                </div>
                <h3 className="font-urbanist text-xl font-bold text-[#0B0D12]">
                  Signal-Driven Brief Desk
                </h3>
                <p className="text-sm text-[#8A8D98] leading-relaxed">
                  Brands publish clear briefs with target audience truth, deliverable counts,
                  and licensing requirements to attract the exact right creative minds.
                </p>
              </div>
              <div className="pt-4 border-t border-[#0B0D12]/5 text-xs font-bold text-[#0B0D12] flex items-center gap-1">
                Structured briefs <ChevronRight size={14} className="text-[#C8F568]" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-[#0B0D12]/10 bg-white p-8 flex flex-col justify-between space-y-6 shadow-sm hover:border-[#0B0D12]/30 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-urbanist text-xs font-black text-[#0B0D12] bg-[#C8F568] px-2.5 py-1 rounded-full">
                    03
                  </span>
                  <Layers size={20} className="text-[#0B0D12]" />
                </div>
                <h3 className="font-urbanist text-xl font-bold text-[#0B0D12]">
                  Direct Collaboration Requests
                </h3>
                <p className="text-sm text-[#8A8D98] leading-relaxed">
                  Initiate targeted collaboration requests with real project scopes,
                  timeline commitments, and integrated status tracking from pitch to final cut.
                </p>
              </div>
              <div className="pt-4 border-t border-[#0B0D12]/5 text-xs font-bold text-[#0B0D12] flex items-center gap-1">
                Transparent proposals <ChevronRight size={14} className="text-[#C8F568]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CREATOR & BRAND ENTRY POINTS */}
      <section className="py-12 lg:py-20 px-5 lg:px-10 bg-white border-y border-[#0B0D12]/10">
        <div className="mx-auto max-w-[1360px] grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Creator Entry Card */}
          <div className="rounded-3xl bg-[#0B0D12] text-[#F8F7F2] p-8 sm:p-12 flex flex-col justify-between space-y-8 relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#C8F568]">
                <span>FOR CREATORS</span>
              </div>
              <h3 className="font-urbanist text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-white">
                Turn your process into a point of view.
              </h3>
              <p className="text-sm sm:text-base text-[#8A8D98] leading-relaxed">
                Build a portfolio tailored to generative films, concept worlds, and commercial campaigns.
                Showcase your tool stack and get discovered by brands ready to hire.
              </p>
            </div>
            <div className="relative z-10 pt-4">
              <button
                type="button"
                onClick={() => {
                  onSelectRole("creator");
                  setLocation("/creator");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#C8F568] px-6 py-3 text-sm font-black text-[#0B0D12] hover:bg-white transition-colors"
              >
                Create your portfolio <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          {/* Brand Entry Card */}
          <div className="rounded-3xl border border-[#0B0D12]/15 bg-[#F8F7F2] p-8 sm:p-12 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#0B0D12]">
                <span>FOR BRANDS & STUDIOS</span>
              </div>
              <h3 className="font-urbanist text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-[#0B0D12]">
                Find the right kind of vision.
              </h3>
              <p className="text-sm sm:text-base text-[#8A8D98] leading-relaxed">
                Filter verified creators by style, workflow speed, and specific tool proficiencies.
                Publish clear briefs and shortlist specialists without noisy middlemen.
              </p>
            </div>
            <div className="pt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  onSelectRole("brand");
                  setLocation("/discover");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#0B0D12] px-6 py-3 text-sm font-bold text-[#F8F7F2] hover:bg-[#0B0D12]/85 transition-colors"
              >
                Explore creators <Compass size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectRole("brand");
                  setLocation("/briefs/new");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[#0B0D12] px-5 py-3 text-sm font-bold text-[#0B0D12] hover:bg-[#0B0D12]/5 transition-colors"
              >
                Post a brief
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CALL TO ACTION */}
      <section className="py-20 lg:py-28 px-5 lg:px-10">
        <div className="mx-auto max-w-[1360px] rounded-3xl bg-[#0B0D12] text-[#F8F7F2] p-8 sm:p-16 lg:p-20 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="font-urbanist text-xs font-bold tracking-widest uppercase text-[#C8F568]">
              Join the synthetic creative network
            </span>
            <h2 className="font-urbanist text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.04em] text-white leading-tight">
              Ready to create something original?
            </h2>
            <p className="text-sm sm:text-base text-[#8A8D98] max-w-xl mx-auto leading-relaxed">
              Whether you are an AI filmmaker crafting worlds or a brand seeking bold aesthetics,
              GoCollabo is your collaborative home.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <div className="conic-animated-border">
                <button
                  type="button"
                  onClick={() => {
                    onSelectRole("brand");
                    setLocation("/discover");
                  }}
                  className="group relative z-10 overflow-hidden rounded-full bg-[#0B0D12] px-8 py-3.5 text-sm sm:text-base font-bold text-[#F8F7F2] transition-all duration-300"
                >
                  <span
                    className="absolute inset-0 bg-[#C8F568] -translate-x-full transition-transform duration-400 ease-out group-hover:translate-x-0"
                    aria-hidden="true"
                  />
                  <span className="relative z-10 flex items-center gap-2 transition-colors duration-300 group-hover:text-[#0B0D12]">
                    Start collaborating now <ArrowUpRight size={17} />
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={onLogin}
                className="rounded-full border border-white/20 px-7 py-3.5 text-sm sm:text-base font-bold text-white hover:border-white transition-colors"
              >
                Sign in to your account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="mt-auto border-t border-[#0B0D12]/10 bg-[#F8F7F2] py-12 px-5 lg:px-10">
        <div className="mx-auto max-w-[1360px] flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#8A8D98]">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-[#0B0D12]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B0D12] text-[#C8F568]">
                <Clapperboard size={14} />
              </span>
              <span className="font-urbanist font-extrabold text-sm text-[#0B0D12]">
                GoCollabo
              </span>
            </Link>
            <span className="text-[#0B0D12]/20">|</span>
            <span>© 2026 GoCollabo. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/discover" className="hover:text-[#0B0D12]">
              Discover
            </Link>
            <Link href="/briefs" className="hover:text-[#0B0D12]">
              Briefs
            </Link>
            <a href="#how-it-works" className="hover:text-[#0B0D12]">
              How it works
            </a>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-[#C8F568]" />
            <span>Sample data is marked; creator profiles are self-reported.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
