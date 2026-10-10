import { useAuth } from "@/_core/hooks/useAuth";
import { AuthDialog } from "@/components/AuthDialog";
import {
  Breadcrumbs,
  MobileTabBar,
  SideRail,
  SkipLink,
  Topbar,
  showsWorkspaceChrome,
  useRouteChangeEffects,
} from "@/components/Navigation";
import { LandingPage } from "@/components/LandingPage";
import { trpc } from "@/lib/trpc";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Filter,
  Grid2X2,
  HeartHandshake,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  LogIn,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FilterDropdown } from "@/components/FilterDropdown";

const PortfolioStudio = lazy(() => import("@/pages/PortfolioStudio"));

type WorkMode = "remote" | "hybrid" | "on-site";
type Creator = {
  id: string;
  name: string;
  slug: string;
  headline: string;
  location: string;
  mode: WorkMode;
  skills: string[];
  tools: string[];
  types: string[];
  styles: string[];
  experience: string;
  rates: string;
  formats: string[];
  availability: string;
  verification: string;
  bio: string;
  workflow: string;
  published?: boolean;
  projects: {
    title: string;
    type: string;
    image: string;
    description: string;
    concept?: boolean;
    role?: string | null;
    challenge?: string | null;
    approach?: string | null;
    outcomes?: string | null;
    impactSummary?: string | null;
    skills?: string | null;
    tools?: string | null;
  }[];
};
type Brief = {
  id: string;
  title: string;
  objective: string;
  type: string;
  style: string;
  platform: string;
  budget: string;
  deadline: string;
  status: "draft" | "published" | "closed";
  audience?: string;
  duration?: string;
  ratio?: string;
  deliverables?: number;
  location?: string;
  mode?: WorkMode;
  licensing?: string;
  creatorIds: string[];
};
type PersistedCreator = {
  profile: {
    id: number;
    slug: string;
    name: string;
    headline: string;
    bio: string;
    location: string;
    workMode: WorkMode;
    skills: string;
    tools: string;
    contentTypes: string;
    styles: string;
    experience: string;
    rates: string | null;
    formats: string;
    workflow: string;
    verificationStatus: string;
    availability: string;
    published: boolean;
  };
  projects: Array<{
    id: number;
    title: string;
    description: string;
    imageUrl: string | null;
    contentType: string;
    isConcept: boolean;
    role: string | null;
    challenge: string | null;
    approach: string | null;
    outcomes: string | null;
    impactSummary: string | null;
    skills: string | null;
    tools: string | null;
  }>;
};
type PersistedBrief = {
  id: number;
  title: string;
  objective: string;
  contentType: string;
  style: string;
  audience: string;
  platform: string;
  duration: string;
  aspectRatio: string;
  deliverables: number;
  budget: string;
  deadline: string;
  location: string;
  workMode: WorkMode;
  licensing: string;
  status: "draft" | "published" | "closed";
};

function mapCreator(record: PersistedCreator): Creator {
  const { profile } = record;
  return {
    id: String(profile.id),
    slug: profile.slug,
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    mode: profile.workMode,
    skills: split(profile.skills),
    tools: split(profile.tools),
    types: split(profile.contentTypes),
    styles: split(profile.styles),
    experience: profile.experience,
    rates: profile.rates || "Range not shared",
    formats: split(profile.formats),
    availability: profile.availability,
    verification: profile.verificationStatus.toUpperCase(),
    bio: profile.bio,
    workflow: profile.workflow,
    published: profile.published,
    projects: record.projects.map(project => ({
      title: project.title,
      description: project.description,
      type: project.contentType,
      image: project.imageUrl || "",
      concept: project.isConcept,
      role: project.role,
      challenge: project.challenge,
      approach: project.approach,
      outcomes: project.outcomes,
      impactSummary: project.impactSummary,
      skills: project.skills,
      tools: project.tools,
    })),
  };
}

function mapBrief(brief: PersistedBrief): Brief {
  return {
    id: String(brief.id),
    title: brief.title,
    objective: brief.objective,
    type: brief.contentType,
    style: brief.style,
    platform: brief.platform,
    budget: brief.budget,
    deadline: brief.deadline,
    status: brief.status,
    audience: brief.audience,
    duration: brief.duration,
    ratio: brief.aspectRatio,
    deliverables: brief.deliverables,
    location: brief.location,
    mode: brief.workMode,
    licensing: brief.licensing,
    creatorIds: [],
  };
}

const seedCreators: Creator[] = [
  {
    id: "c1",
    slug: "mara-chen",
    name: "Mara Chen",
    headline: "Director + visual systems designer for impossible worlds",
    location: "Los Angeles, CA",
    mode: "remote",
    skills: ["Direction", "Worldbuilding", "Compositing"],
    tools: ["Runway", "ComfyUI", "After Effects"],
    types: ["Film", "Brand film", "Editorial"],
    styles: ["Surreal", "Cinematic", "Textural"],
    experience: "6–8 years",
    rates: "$2.5k–$8k / project",
    formats: ["16:9", "9:16", "1:1"],
    availability: "Available in November",
    verification: "SELF-REPORTED",
    bio: "Mara builds cinematic worlds that feel discovered rather than designed. Her work moves between atmospheric short films, launch films, and visual identity systems for teams working at the edge of culture.",
    workflow:
      "A tight concept loop, visual reference pass, then rapid look development before production. Every delivery includes organized source files and a usage note.",
    projects: [
      {
        title: "The Quiet Between",
        type: "AI short film",
        image:
          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=85",
        description: "A speculative film about memory, rendered as weather.",
      },
      {
        title: "Solace / 03",
        type: "Brand world",
        image:
          "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&q=85",
        description: "Atmospheric launch system for a new ritual object.",
        concept: true,
      },
      {
        title: "Soft Geometry",
        type: "Editorial motion",
        image:
          "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&q=85",
        description: "A moving study in light, skin, and architectural rhythm.",
      },
    ],
  },
  {
    id: "c2",
    slug: "noah-williams",
    name: "Noah Williams",
    headline: "AI animator making joyful, precise brand motion",
    location: "London, UK",
    mode: "hybrid",
    skills: ["3D animation", "Motion design", "Character"],
    tools: ["Blender", "Sora", "Cinema 4D"],
    types: ["Social", "Product film", "Explainer"],
    styles: ["Playful", "Graphic", "Warm"],
    experience: "4–6 years",
    rates: "$1.8k–$5k / project",
    formats: ["9:16", "1:1", "4:5"],
    availability: "Open for one project",
    verification: "SELF-REPORTED",
    bio: "Noah combines classic motion discipline with generative play. He is especially good at translating a fuzzy product truth into a visual system that can scale across a campaign.",
    workflow:
      "Storyboard in frames, prototype movement early, then build a small reusable motion language so every cut feels related.",
    projects: [
      {
        title: "Everyday Future",
        type: "Product story",
        image:
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=85",
        description: "A playful product film for a world that is already here.",
      },
      {
        title: "Melt / Move",
        type: "Motion identity",
        image:
          "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1200&q=85",
        description: "A warm, elastic visual language for a culture platform.",
        concept: true,
      },
      {
        title: "Good Objects",
        type: "Social series",
        image:
          "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&q=85",
        description: "Nine-second stories for objects with a point of view.",
      },
    ],
  },
  {
    id: "c3",
    slug: "aisha-kim",
    name: "Aisha Kim",
    headline: "Generative artist for fashion, music, and future-facing culture",
    location: "Seoul, KR",
    mode: "remote",
    skills: ["Image making", "Art direction", "Styleframes"],
    tools: ["Midjourney", "Krea", "Photoshop"],
    types: ["Campaign", "Cover art", "Social"],
    styles: ["Editorial", "Chromatic", "Human"],
    experience: "3–5 years",
    rates: "$900–$3k / project",
    formats: ["4:5", "1:1", "16:9"],
    availability: "Available now",
    verification: "SELF-REPORTED",
    bio: "Aisha makes images that hold attention at thumb speed. Her practice is rooted in fashion image-making but expands into tactile worlds, campaign systems, and album environments.",
    workflow:
      "Start with a visual tension, collect a precise reference wall, then create a small set of hero frames before expanding into a family of assets.",
    projects: [
      {
        title: "After the Signal",
        type: "Fashion campaign",
        image:
          "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200&q=85",
        description:
          "Chromatic portraiture for a collection built around threshold states.",
      },
      {
        title: "Nite Bloom",
        type: "Cover world",
        image:
          "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&q=85",
        description: "A nocturnal visual system for an electronic record.",
        concept: true,
      },
      {
        title: "Second Skin",
        type: "Editorial series",
        image:
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200&q=85",
        description: "A study of body, fabric, and synthetic light.",
      },
    ],
  },
  {
    id: "c4",
    slug: "leo-martins",
    name: "Leo Martins",
    headline: "Experimental filmmaker blending documentary texture with AI",
    location: "São Paulo, BR",
    mode: "remote",
    skills: ["Editing", "Documentary", "Sound"],
    tools: ["DaVinci Resolve", "Runway", "ElevenLabs"],
    types: ["Film", "Music video", "Documentary"],
    styles: ["Raw", "Human", "Noir"],
    experience: "8–10 years",
    rates: "$3k–$12k / project",
    formats: ["16:9", "2.39:1", "9:16"],
    availability: "Waitlist only",
    verification: "NOT VERIFIED",
    bio: "Leo works with the friction between a real voice and an impossible image. He brings documentary instincts to synthetic production, keeping emotion before spectacle.",
    workflow:
      "Find the real human beat first. Build references around it, then use generative tools only where they give the story a new pressure or texture.",
    projects: [
      {
        title: "The Last Light Club",
        type: "Short film",
        image:
          "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&q=85",
        description: "A nocturne about the people who keep the lights on.",
      },
      {
        title: "Pulses",
        type: "Music video",
        image:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=85",
        description: "Handheld energy translated into a synthetic night.",
        concept: true,
      },
      {
        title: "Field Notes",
        type: "Documentary study",
        image:
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=85",
        description: "Fragments from a city learning a new language.",
      },
    ],
  },
];

const seedBriefs: Brief[] = [
  {
    id: "b1",
    title: "A softer internet",
    objective: "Launch film for a new privacy-first social product.",
    type: "Brand film",
    style: "Human, tactile, optimistic",
    platform: "Paid social + site",
    budget: "$5k–$10k",
    deadline: "Nov 18, 2026",
    status: "published",
    creatorIds: [],
  },
  {
    id: "b2",
    title: "Rituals for the everyday",
    objective: "Create a modular image world for a home objects collection.",
    type: "Campaign",
    style: "Editorial, warm, considered",
    platform: "Instagram + OOH",
    budget: "$2k–$5k",
    deadline: "Dec 02, 2026",
    status: "draft",
    creatorIds: [],
  },
];

const key = "framefoundry-demo-v1";
function loadState() {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}
function split(value: string) {
  return value
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}
function initials(name: string) {
  return name
    .split(" ")
    .map(x => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "ghost" | "light" | "dark";
  [key: string]: unknown;
}) {
  const styles = {
    primary: "bg-[var(--navy)] text-white hover:bg-[#1d2948]",
    ghost:
      "bg-transparent text-[var(--ink)] border border-[var(--line)] hover:border-[#b6bdd0]",
    light: "bg-white text-[var(--ink)] hover:bg-[#f1f3f8]",
    dark: "bg-white/10 text-white hover:bg-white/15 border border-white/10",
  };
  return (
    <button
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
function Tag({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "lime" | "dark";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone === "lime" ? "bg-[var(--lime)] text-[var(--navy)]" : tone === "dark" ? "bg-white/10 text-white" : "bg-[#f0f2f7] text-[#5e667a]"}`}
    >
      {children}
    </span>
  );
}
function CreatorCard({
  creator,
  saved,
  onSave,
  allowSave = true,
}: {
  creator: Creator;
  saved: boolean;
  onSave: () => void;
  allowSave?: boolean;
}) {
  const [, setLocation] = useLocation();
  return (
    <article className="surface portfolio-card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,20,35,.08)]">
      <button
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#e8ebf2] text-left"
        onClick={() => setLocation(`/creator/${creator.id}`)}
      >
        {creator.projects[0] ? (
          <>
            <img
              src={creator.projects[0].image}
              alt=""
              className="portfolio-img h-full w-full object-cover"
            />
            <span className="absolute left-3 top-3">
              <Tag tone="dark">{creator.projects[0].type}</Tag>
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-[#687087]">
            Portfolio coming soon
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white/85 p-2 text-[var(--navy)] backdrop-blur">
          <ArrowUpRight size={15} />
        </span>
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{creator.name}</h3>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]" />
            </div>
            <p className="mt-1 text-sm leading-5 text-[#687087]">
              {creator.headline}
            </p>
          </div>
          {allowSave && (
            <button
              aria-label="Save creator"
              onClick={e => {
                e.stopPropagation();
                onSave();
              }}
              className={`rounded-full border p-2 transition ${saved ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--navy)]" : "border-[var(--line)] text-[#9aa1b2] hover:text-[var(--ink)]"}`}
            >
              <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Tag>{creator.location}</Tag>
          <Tag>{creator.mode}</Tag>
          <Tag>{creator.availability}</Tag>
        </div>
      </div>
    </article>
  );
}

function Discover({
  creators,
  savedIds,
  toggleSave,
  isDemoData = true,
  allowSave = true,
}: {
  creators: Creator[];
  savedIds: string[];
  toggleSave: (id: string) => void;
  isDemoData?: boolean;
  allowSave?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All work");
  const [mode, setMode] = useState("Any mode");
  const [style, setStyle] = useState("All styles");
  const [sort, setSort] = useState("Featured");
  const allTypes = [
    "All work",
    ...Array.from(new Set(creators.flatMap(c => c.types))),
  ];
  const allStyles = [
    "All styles",
    ...Array.from(new Set(creators.flatMap(c => c.styles))),
  ];
  const allModes = ["Any mode", "remote", "hybrid", "on-site"];
  const allSorts = ["Featured", "Name", "Available"];
  const formatMode = (v: string) => {
    if (v === "remote") return "Remote";
    if (v === "hybrid") return "Hybrid";
    if (v === "on-site") return "On-site";
    return v;
  };
  const hasActiveFilters = Boolean(
    query.trim() ||
      type !== "All work" ||
      style !== "All styles" ||
      mode !== "Any mode"
  );
  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (type !== "All work" ? 1 : 0) +
    (style !== "All styles" ? 1 : 0) +
    (mode !== "Any mode" ? 1 : 0);
  const filtered = useMemo(() => {
    let list = creators.filter(c => {
      const hay = [
        c.name,
        c.headline,
        c.location,
        ...c.skills,
        ...c.tools,
        ...c.types,
        ...c.styles,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!query || hay.includes(query.toLowerCase())) &&
        (type === "All work" || c.types.includes(type)) &&
        (mode === "Any mode" || c.mode === mode) &&
        (style === "All styles" || c.styles.includes(style))
      );
    });
    if (sort === "Name")
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "Available")
      list = [...list].sort((a, b) =>
        a.availability.localeCompare(b.availability)
      );
    return list;
  }, [creators, query, type, mode, style, sort]);
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10">
      <div className="flex items-end justify-between gap-5 mobile-stack">
        <div>
          <div className="eyebrow mb-4">The creator index / 04.26</div>
          <h1 className="serif text-5xl leading-[.96] tracking-[-.05em] lg:text-7xl">
            Find the visual
            <br />
            <i>voice</i> your brief is missing.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#687087]">
            A considered index of AI filmmakers, animators, and artists. Search
            by the way they think, not just the tools they use.
          </p>
        </div>
        <div className="surface flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lime)] text-[var(--navy)]">
            <Grid2X2 size={15} />
          </div>
          <div>
            <div className="text-xl font-black mono">
              {filtered.length.toString().padStart(2, "0")}
            </div>
            <div className="eyebrow">matching creators</div>
          </div>
        </div>
      </div>
      <div className="mt-10 w-full max-w-full rounded-2xl border border-[#0B0D12]/15 bg-white p-3 shadow-[0_4px_20px_rgba(11,13,18,0.03)]">
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="group relative flex h-10 w-full sm:w-auto sm:flex-1 sm:min-w-[220px] lg:min-w-[240px] min-w-0 items-center gap-2 rounded-xl border border-[#0B0D12]/15 bg-[#F8F7F2] px-3 transition-all duration-150 hover:border-[#C8F568] hover:shadow-[0_1px_6px_rgba(200,245,104,0.15)] focus-within:border-[#0B0D12] focus-within:ring-2 focus-within:ring-[#C8F568]/40">
            <Search
              size={15}
              className="text-[#0B0D12]/70 shrink-0 transition-colors group-focus-within:text-[#0B0D12]"
            />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search names, tools,skill"
              aria-label="Search creators by name, tool, or skill"
              className="w-full min-w-0 bg-transparent text-xs sm:text-[13px] font-medium text-[#0B0D12] outline-none placeholder:text-[#8A8D98]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search text"
                className="text-[#8A8D98] hover:text-[#0B0D12] rounded-full p-1 hover:bg-[#0B0D12]/5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0B0D12]"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <FilterDropdown
            value={type}
            onChange={setType}
            options={allTypes}
            label="Work"
            ariaLabel="Filter by work category"
            defaultValue="All work"
          />
          <FilterDropdown
            value={style}
            onChange={setStyle}
            options={allStyles}
            label="Style"
            ariaLabel="Filter by visual style"
            defaultValue="All styles"
          />
          <FilterDropdown
            value={mode}
            onChange={setMode}
            options={allModes}
            label="Mode"
            ariaLabel="Filter by work arrangement"
            defaultValue="Any mode"
            formatOptionLabel={formatMode}
          />
          <FilterDropdown
            value={sort}
            onChange={setSort}
            options={allSorts}
            label="Sort"
            ariaLabel="Sort creators"
            defaultValue="Featured"
            align="end"
          />
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={() => {
              setQuery("");
              setType("All work");
              setStyle("All styles");
              setMode("Any mode");
            }}
            className={`group h-10 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium tracking-[-0.01em] transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-[#0B0D12] focus-visible:ring-offset-1 ${
              hasActiveFilters
                ? "text-[#0B0D12] hover:bg-[#C8F568]/25 hover:text-[#0B0D12] active:scale-95 cursor-pointer"
                : "text-[#0B0D12]/55 hover:text-[#0B0D12] hover:bg-[#0B0D12]/5 disabled:cursor-default"
            }`}
            aria-label="Reset all applied filters"
          >
            {hasActiveFilters && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#C8F568] border border-[#0B0D12]/30 shrink-0"
                aria-hidden="true"
              />
            )}
            <RotateCcw
              size={12}
              className={`transition-transform duration-200 group-hover:rotate-[-45deg] shrink-0 ${
                hasActiveFilters
                  ? "text-[#0B0D12]"
                  : "text-[#0B0D12]/50 group-hover:text-[#0B0D12]"
              }`}
            />
            <span>Reset</span>
            {hasActiveFilters && (
              <span className="flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full bg-[#0B0D12] text-[9px] font-bold text-[#C8F568]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <div className="eyebrow">
          {filtered.length} profiles{isDemoData ? " / sample data" : ""}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#98a0b1]">
          <span className="h-2 w-2 rounded-full bg-[var(--lime)]" />{" "}
          Availability is self-reported
        </div>
      </div>
      {filtered.length ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(c => (
            <CreatorCard
              key={c.id}
              creator={c}
              saved={savedIds.includes(c.id)}
              onSave={() => toggleSave(c.id)}
              allowSave={allowSave}
            />
          ))}
        </div>
      ) : (
        <div className="surface mt-4 flex min-h-[260px] flex-col items-center justify-center text-center">
          <SlidersHorizontal size={28} className="text-[#a1a8b8]" />
          <h3 className="mt-4 font-bold">No creators match those filters.</h3>
          <p className="mt-1 text-sm text-[#687087]">
            Try a broader style, tool, or work mode.
          </p>
        </div>
      )}
    </div>
  );
}

function Hero({
  setDemoRole,
  onRoleSelect,
}: {
  setDemoRole: (x: string) => void;
  onRoleSelect: (role: "creator" | "brand") => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10 lg:py-12">
      <section className="surface-dark hero-grid relative overflow-hidden px-6 py-12 lg:px-16 lg:py-20">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-white/55">
            <span className="h-2 w-2 rounded-full bg-[var(--lime)]" /> The
            creator marketplace for the synthetic age
          </div>
          <h1 className="serif text-6xl leading-[.91] tracking-[-.06em] lg:text-[112px]">
            Make the
            <br />
            <i>impossible</i>
            <br />
            look real.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-white/60 lg:text-lg">
            GoCollabo helps AI creators build the portfolio they actually
            want to be hired for — and gives brands a sharper way to find them.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button
              variant="light"
              onClick={() => {
                setDemoRole("creator");
                onRoleSelect("creator");
                setLocation("/creator");
              }}
            >
              Build your profile <ArrowUpRight size={15} />
            </Button>
            <Button
              variant="dark"
              onClick={() => {
                setDemoRole("brand");
                onRoleSelect("brand");
                setLocation("/discover");
              }}
            >
              Explore creators <Compass size={15} />
            </Button>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 hidden w-[245px] rotate-[-5deg] rounded-2xl bg-white p-3 text-[var(--ink)] shadow-2xl lg:block">
          <img
            src={seedCreators[0].projects[1].image}
            className="aspect-[4/3] w-full rounded-xl object-cover"
            alt=""
          />
          <div className="flex items-center justify-between px-1 pt-3">
            <span className="text-xs font-bold">Solace / 03</span>
            <span className="eyebrow">02 / 04</span>
          </div>
        </div>
      </section>
      <section className="grid gap-4 py-5 md:grid-cols-3">
        <div className="surface p-5">
          <div className="eyebrow">For creators</div>
          <h2 className="mt-4 text-xl font-black tracking-[-.03em]">
            Turn your process into a point of view.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#687087]">
            A profile builder for the work between the prompts.
          </p>
          <button
            onClick={() => {
              setDemoRole("creator");
              onRoleSelect("creator");
              setLocation("/creator");
            }}
            className="mt-5 text-sm font-bold"
          >
            Start building <ArrowUpRight size={14} className="inline" />
          </button>
        </div>
        <div className="surface p-5">
          <div className="eyebrow">For brands</div>
          <h2 className="mt-4 text-xl font-black tracking-[-.03em]">
            Find the right kind of strange.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#687087]">
            Search talent by taste, tools, and the way they work.
          </p>
          <button
            onClick={() => {
              setDemoRole("brand");
              onRoleSelect("brand");
              setLocation("/discover");
            }}
            className="mt-5 text-sm font-bold"
          >
            Browse the index <ArrowUpRight size={14} className="inline" />
          </button>
        </div>
        <div className="surface bg-[#f0f3db] p-5">
          <div className="eyebrow">New / brief desk</div>
          <h2 className="mt-4 text-xl font-black tracking-[-.03em]">
            Your next visual world starts with a clear brief.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#687087]">
            Give independent creators enough signal to make something original.
          </p>
          <button
            onClick={() => {
              setDemoRole("brand");
              onRoleSelect("brand");
              setLocation("/briefs/new");
            }}
            className="mt-5 text-sm font-bold"
          >
            Write a brief <ArrowUpRight size={14} className="inline" />
          </button>
        </div>
      </section>
    </div>
  );
}

function CreatorWorkspace({
  creators,
  setCreators,
  existingProfile,
  isLive = false,
  onSave,
}: {
  creators: Creator[];
  setCreators: (x: Creator[]) => void;
  existingProfile?: Creator;
  isLive?: boolean;
  onSave?: (profile: Creator, published: boolean) => Promise<Creator | void>;
}) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({
    name: "",
    headline: "",
    location: "",
    mode: "remote",
    skills: "",
    tools: "",
    types: "",
    styles: "",
    experience: "",
    formats: "16:9, 9:16",
    rates: "",
    workflow: "",
  });
  const [generatedProfile, setGeneratedProfile] = useState<Creator | undefined>(
    existingProfile
  );
  useEffect(() => {
    if (!existingProfile) return;
    setGeneratedProfile(existingProfile);
    setPublished(Boolean(existingProfile.published));
    setAnswers({
      name: existingProfile.name,
      headline: existingProfile.headline,
      location: existingProfile.location,
      mode: existingProfile.mode,
      skills: existingProfile.skills.join(", "),
      tools: existingProfile.tools.join(", "),
      types: existingProfile.types.join(", "),
      styles: existingProfile.styles.join(", "),
      experience: existingProfile.experience,
      formats: existingProfile.formats.join(", "),
      rates: existingProfile.rates,
      workflow: existingProfile.workflow,
    });
  }, [existingProfile]);
  const questions = [
    {
      key: "name",
      label: "First, what should people call you?",
      hint: "Your name or studio name",
      placeholder: "e.g. Mara Chen",
    },
    {
      key: "headline",
      label: "What do you make that people remember?",
      hint: "A one-line professional headline",
      placeholder:
        "e.g. Director + visual systems designer for impossible worlds",
    },
    {
      key: "location",
      label: "Where do you work from?",
      hint: "City, region, or distributed",
      placeholder: "e.g. Los Angeles, CA",
    },
    {
      key: "mode",
      label: "How do you prefer to work?",
      hint: "Choose the arrangement you support",
      placeholder: "remote, hybrid, or on-site",
    },
    {
      key: "skills",
      label: "What are your sharpest skills?",
      hint: "Separate with commas",
      placeholder: "Direction, worldbuilding, compositing",
    },
    {
      key: "tools",
      label: "Which tools or models are part of your practice?",
      hint: "Separate with commas",
      placeholder: "Runway, ComfyUI, After Effects",
    },
    {
      key: "types",
      label: "What kind of work do you want more of?",
      hint: "Separate with commas",
      placeholder: "Film, brand film, editorial",
    },
    {
      key: "styles",
      label: "How should the work feel?",
      hint: "Separate with commas",
      placeholder: "Surreal, cinematic, textural",
    },
    {
      key: "experience",
      label: "How would you describe your experience?",
      hint: "Keep it honest and specific",
      placeholder: "e.g. 4–6 years",
    },
    {
      key: "formats",
      label: "What formats can you deliver?",
      hint: "Aspect ratios or deliverable notes",
      placeholder: "16:9, 9:16, 1:1",
    },
    {
      key: "rates",
      label: "Want to share a typical range?",
      hint: "Optional — visibility is your choice",
      placeholder: "e.g. $2k–$5k / project",
    },
    {
      key: "workflow",
      label: "What does your process protect?",
      hint: "A sentence or two about how you work",
      placeholder: "Start with a tight concept loop, then prototype early…",
    },
  ];
  const q = questions[step];
  const update = (value: string) => setAnswers({ ...answers, [q.key]: value });
  const makeProfile = (profilePublished: boolean): Creator => {
    const profile: Creator = {
      id: existingProfile?.id || "me",
      slug: (answers.name || "my-profile")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      name: answers.name || "Your name",
      headline:
        answers.headline ||
        "Independent AI creator with a distinct point of view",
      location: answers.location || "Location not shared",
      mode: (answers.mode as WorkMode) || "remote",
      skills: split(answers.skills || "Creative direction"),
      tools: split(answers.tools || "AI tools"),
      types: split(answers.types || "Visual development"),
      styles: split(answers.styles || "Original"),
      experience: answers.experience || "Experience shared on request",
      rates: answers.rates || "Range not shared",
      formats: split(answers.formats || "16:9"),
      availability: "Available for conversations",
      verification: "SELF-REPORTED",
      bio: `${answers.name || "This creator"} is a ${answers.headline || "visual maker with a distinct point of view"}. Their practice explores ${answers.styles || "original visual language"} across ${answers.types || "creative work"}, with a focus on craft, clarity, and honest collaboration.`,
      workflow:
        answers.workflow ||
        "A considered process with room for iteration and clear handoffs.",
      published: profilePublished,
      projects: isLive
        ? []
        : [
          {
            title: "First project preview",
            type: split(answers.types || "Concept work")[0],
            image: seedCreators[1].projects[0].image,
            description:
              "A concept project. Add your own image, video, or asset when you publish.",
          },
        ],
    };
    return profile;
  };
  const generate = () => {
    const staysPublished = isLive && Boolean(existingProfile?.published);
    const profile = makeProfile(staysPublished);
    setGeneratedProfile(profile);
    if (!isLive) setCreators([...creators.filter(c => c.id !== "me"), profile]);
    setPublished(staysPublished);
    toast.success("Profile draft generated from your answers");
  };
  const persistProfile = async (nextPublished: boolean) => {
    const profile = generatedProfile || makeProfile(nextPublished);
    setSaving(true);
    try {
      if (onSave) {
        const persisted = await onSave(
          { ...profile, published: nextPublished },
          nextPublished
        );
        setGeneratedProfile(
          persisted || { ...profile, published: nextPublished }
        );
      } else {
        const next = { ...profile, published: nextPublished };
        setCreators([...creators.filter(creator => creator.id !== "me"), next]);
        setGeneratedProfile(next);
        toast.success(
          nextPublished
            ? "Profile published in this demo only"
            : "Draft saved in this demo only"
        );
      }
      setPublished(nextPublished);
    } catch {
      toast.error(
        "Could not save profile. Check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow mb-3">
            Creator workspace / profile builder
          </div>
          <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
            The work speaks
            <br />
            <i>louder</i> when it has context.
          </h1>
        </div>
        <Tag tone="lime">{isLive ? "Live account" : "Demo mode"}</Tag>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="surface min-h-[520px] p-6 lg:p-10">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              Question {String(step + 1).padStart(2, "0")} /{" "}
              {String(questions.length).padStart(2, "0")}
            </span>
            <span className="text-xs font-semibold text-[#a2a8b7]">
              {isLive
                ? existingProfile
                  ? "Loaded from your account"
                  : "Not saved yet"
                : "Saved locally as demo draft"}
            </span>
          </div>
          <div className="mt-16 max-w-xl">
            <div className="h-1 w-full rounded-full bg-[#eef0f5]">
              <div
                className="h-1 rounded-full bg-[var(--indigo)] transition-all"
                style={{ width: `${((step + 1) / questions.length) * 100}%` }}
              />
            </div>
            <h2 className="serif mt-10 text-4xl leading-tight tracking-[-.04em]">
              {q.label}
            </h2>
            <p className="mt-3 text-sm text-[#7a8294]">{q.hint}</p>
            {q.key === "mode" ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {(["remote", "hybrid", "on-site"] as WorkMode[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setAnswers({ ...answers, mode: v })}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold ${answers.mode === v ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--line)]"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                autoFocus
                value={answers[q.key] || ""}
                onChange={e => update(e.target.value)}
                placeholder={q.placeholder}
                rows={q.key === "workflow" ? 5 : 3}
                className="focus-ring mt-8 w-full resize-none rounded-2xl border border-[var(--line)] bg-[#fafbfe] p-4 text-lg outline-none placeholder:text-[#bcc1cd]"
              />
            )}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                disabled={step === 0}
                onClick={() => setStep(Math.max(0, step - 1))}
              >
                <ChevronLeft size={16} /> Back
              </Button>
              {step < questions.length - 1 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next <ChevronRight size={16} />
                </Button>
              ) : (
                <Button onClick={generate}>
                  <Sparkles size={16} /> Generate editable draft
                </Button>
              )}
            </div>
          </div>
        </section>
        <aside className="space-y-5">
          <div className="surface-dark p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div className="eyebrow text-white/45">Profile preview</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <ImageIcon size={16} />
              </div>
            </div>
            <div className="mt-12 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--lime)] text-lg font-black text-[var(--navy)]">
                {initials(answers.name || "You")}
              </div>
              <div>
                <div className="font-bold">{answers.name || "Your name"}</div>
                <div className="mt-1 text-sm text-white/55">
                  {answers.headline || "Your professional headline"}
                </div>
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-5">
              <div className="text-sm leading-6 text-white/65">
                {generatedProfile
                  ? "Your editable draft is ready. Nothing here is published until you choose to publish it."
                  : "Answer the questions to turn your process into a professional profile."}
              </div>
            </div>
            {generatedProfile && (
              <Button
                variant="light"
                className="mt-6 w-full"
                onClick={() => {
                  if (generatedProfile.id !== "me") {
                    setLocation(`/creator/${generatedProfile.id}`);
                  } else {
                    toast.info("Save your profile to preview it");
                  }
                }}
              >
                Preview profile <ArrowUpRight size={15} />
              </Button>
            )}
          </div>
          <div className="surface p-5">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#6c7bdc]" />
              <span className="text-sm font-bold">Honest by design</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#687087]">
              This fallback draft only uses the answers you provide. Concept
              work remains clearly labeled, and verification stays
              self-reported.
            </p>
          </div>
          {generatedProfile && (
            <div className="surface p-5">
              <div className="eyebrow">Publishing</div>
              <p className="mt-2 text-sm text-[#687087]">
                {published
                  ? "Your profile is public."
                  : "Your profile is private."}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void persistProfile(false)}
                >
                  Save draft
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => void persistProfile(!published)}
                >
                  {saving
                    ? "Saving…"
                    : published
                      ? "Unpublish"
                      : "Publish profile"}
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Profile({
  creator,
  saved,
  toggleSave,
  demoRole,
  briefs,
  canSave = true,
  onCollaborate,
}: {
  creator: Creator;
  saved: boolean;
  toggleSave: () => void;
  demoRole: string;
  briefs: Brief[];
  canSave?: boolean;
  onCollaborate?: (briefId: number, message: string) => Promise<void>;
}) {
  const [, setLocation] = useLocation();
  const [requestOpen, setRequestOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedBriefId, setSelectedBriefId] = useState(
    briefs.find(brief => brief.status === "published")?.id || ""
  );
  const [requestMessage, setRequestMessage] = useState(
    `Hi ${creator.name}, your work feels right for this brief because…`
  );
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (
      !briefs.some(
        brief => brief.id === selectedBriefId && brief.status === "published"
      )
    ) {
      setSelectedBriefId(
        briefs.find(brief => brief.status === "published")?.id || ""
      );
    }
  }, [briefs, selectedBriefId]);
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <button
        className="mb-8 text-sm font-bold text-[#687087]"
        onClick={() => setLocation("/discover")}
      >
        <ChevronLeft size={15} className="inline" /> Back to index
      </button>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <main>
          <div className="flex items-end justify-between gap-5 mobile-stack">
            <div>
              <div className="eyebrow mb-4">
                Creator profile / {creator.verification}
              </div>
              <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
                {creator.name}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-[#687087]">
                {creator.headline}
              </p>
            </div>
            {canSave && (
              <Button
                variant={saved ? "primary" : "ghost"}
                onClick={toggleSave}
              >
                <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
                {saved ? "Saved" : "Save creator"}
              </Button>
            )}
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {creator.projects.map((p, i) => (
              <article
                key={p.title}
                className={`portfolio-card surface overflow-hidden ${i === 0 ? "md:col-span-2" : ""}`}
              >
                <div
                  className={`relative overflow-hidden ${i === 0 ? "aspect-[16/8]" : "aspect-[4/3]"} ${p.image ? "" : "bg-[#e8ebf2]"}`}
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      className="portfolio-img h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#8991a2]">
                      No project media
                    </div>
                  )}
                  <span className="absolute left-4 top-4">
                    <Tag tone="dark">{p.type}</Tag>
                  </span>
                </div>
                <div className="flex items-start justify-between p-4">
                  <div>
                    <h3 className="font-bold">{p.title}</h3>
                    <p className="mt-1 text-sm text-[#687087]">
                      {p.description}
                    </p>
                  </div>
                  {p.concept && <Tag>CONCEPT WORK</Tag>}
                </div>
                {(p.role ||
                  p.challenge ||
                  p.approach ||
                  p.outcomes ||
                  p.impactSummary ||
                  p.skills ||
                  p.tools) && (
                    <div className="grid gap-3 border-t border-[var(--line)] p-4 text-sm sm:grid-cols-2">
                      {p.role && (
                        <p>
                          <strong>Role:</strong> {p.role}
                        </p>
                      )}
                      {p.challenge && (
                        <p>
                          <strong>Challenge:</strong> {p.challenge}
                        </p>
                      )}
                      {p.approach && (
                        <p>
                          <strong>Approach:</strong> {p.approach}
                        </p>
                      )}
                      {p.outcomes && (
                        <p>
                          <strong>Outcomes:</strong> {p.outcomes}
                        </p>
                      )}
                      {p.impactSummary && (
                        <p>
                          <strong>Impact:</strong> {p.impactSummary}
                        </p>
                      )}
                      {p.skills && (
                        <p>
                          <strong>Skills:</strong> {p.skills}
                        </p>
                      )}
                      {p.tools && (
                        <p>
                          <strong>Tools:</strong> {p.tools}
                        </p>
                      )}
                    </div>
                  )}
              </article>
            ))}
          </div>
        </main>
        <aside>
          <div className="surface sticky top-[90px] p-5">
            <div className="flex items-center justify-between">
              <Tag tone="lime">{creator.availability}</Tag>
              <span className="text-xs font-bold text-[#9aa1b2]">
                {creator.location}
              </span>
            </div>
            <p className="mt-5 text-sm leading-7 text-[#4e566a]">
              {creator.bio}
            </p>
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <div className="eyebrow mb-3">Capabilities</div>
              <div className="flex flex-wrap gap-1.5">
                {creator.skills.map(s => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {creator.tools.map(s => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
            </div>
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="eyebrow mb-1">Work mode</div>
                  <div className="font-bold capitalize">{creator.mode}</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Rates</div>
                  <div className="font-bold">{creator.rates}</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Formats</div>
                  <div className="font-bold">{creator.formats.join(" · ")}</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Trust</div>
                  <div className="font-bold">{creator.verification}</div>
                </div>
              </div>
            </div>
            {demoRole === "brand" && (
              <Button
                className="mt-7 w-full"
                onClick={() => setRequestOpen(true)}
              >
                <Send size={15} /> Send collaboration request
              </Button>
            )}
          </div>
        </aside>
      </div>
      {requestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--navy)]/50 p-5">
          <div className="surface w-full max-w-lg p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">New collaboration request</div>
                <h2 className="mt-2 text-2xl font-black">
                  Start with context.
                </h2>
              </div>
              <button onClick={() => setRequestOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#687087]">
              Choose a brief and add a note. This sends a request — it does not
              start a contract or payment.
            </p>
            <select
              value={selectedBriefId}
              onChange={event => setSelectedBriefId(event.target.value)}
              className="mt-6 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm"
            >
              <option value="">Choose a published brief</option>
              {briefs
                .filter(brief => brief.status === "published")
                .map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
            </select>
            <textarea
              rows={4}
              value={requestMessage}
              onChange={event => setRequestMessage(event.target.value)}
              className="mt-3 w-full rounded-xl border border-[var(--line)] p-3 text-sm outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  sending ||
                  !selectedBriefId ||
                  requestMessage.trim().length < 10
                }
                onClick={async () => {
                  if (onCollaborate) {
                    setSending(true);
                    try {
                      await onCollaborate(
                        Number(selectedBriefId),
                        requestMessage
                      );
                    } catch {
                      toast.error("Could not send collaboration request");
                      return;
                    } finally {
                      setSending(false);
                    }
                  } else {
                    toast.success("Request saved in this demo only");
                  }
                  setSent(true);
                  setRequestOpen(false);
                }}
              >
                {sending ? "Sending…" : "Send request"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {sent && (
        <div className="fixed bottom-5 right-5 z-40 rounded-2xl bg-[var(--navy)] px-5 py-4 text-sm font-bold text-white shadow-2xl">
          <Check size={15} className="mr-2 inline text-[var(--lime)]" /> Request
          sent to {creator.name}
        </div>
      )}
    </div>
  );
}

function BriefForm({
  briefs,
  setBriefs,
  existingBrief,
  isLive = false,
  onSave,
}: {
  briefs: Brief[];
  setBriefs?: (x: Brief[]) => void;
  existingBrief?: Brief;
  isLive?: boolean;
  onSave?: (values: Omit<Brief, "id" | "creatorIds">) => Promise<void>;
}) {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    title: "",
    objective: "",
    type: "Brand film",
    style: "",
    audience: "",
    platform: "Instagram + site",
    duration: "30–60 sec",
    ratio: "16:9",
    deliverables: "3",
    budget: "$2k–$5k",
    deadline: "",
    location: "Remote",
    mode: "remote",
    licensing: "Commercial use requested; creator retains credit.",
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!existingBrief) return;
    setForm({
      title: existingBrief.title,
      objective: existingBrief.objective,
      type: existingBrief.type,
      style: existingBrief.style,
      audience: existingBrief.audience || "",
      platform: existingBrief.platform,
      duration: existingBrief.duration || "",
      ratio: existingBrief.ratio || "",
      deliverables: String(existingBrief.deliverables || 1),
      budget: existingBrief.budget,
      deadline: existingBrief.deadline,
      location: existingBrief.location || "Remote",
      mode: existingBrief.mode || "remote",
      licensing: existingBrief.licensing || "",
    });
  }, [existingBrief]);
  const set = (key: string, value: string) =>
    setForm({ ...form, [key]: value });
  const publish = async (status: "draft" | "published" | "closed") => {
    if (
      !form.title ||
      form.title.length < 3 ||
      form.objective.length < 10 ||
      !form.deadline
    ) {
      toast.error("Add a title, objective, and deadline first");
      return;
    }
    const values: Omit<Brief, "id" | "creatorIds"> = {
      title: form.title,
      objective: form.objective,
      type: form.type,
      style: form.style || "Open to interpretation",
      audience: form.audience,
      platform: form.platform,
      duration: form.duration,
      ratio: form.ratio,
      deliverables: Number(form.deliverables),
      budget: form.budget,
      deadline: form.deadline,
      location: form.location,
      mode: form.mode as WorkMode,
      licensing: form.licensing,
      status,
    };
    setSaving(true);
    try {
      if (onSave) {
        await onSave(values);
      } else {
        setBriefs?.(
          existingBrief
            ? briefs.map(brief =>
              brief.id === existingBrief.id
                ? {
                  ...brief,
                  ...values,
                  id: existingBrief.id,
                  creatorIds: existingBrief.creatorIds,
                }
                : brief
            )
            : [...briefs, { id: `b${Date.now()}`, ...values, creatorIds: [] }]
        );
        toast.success(
          status === "published"
            ? "Brief published in this demo only"
            : "Draft saved in this demo only"
        );
      }
      setLocation("/briefs");
    } catch {
      toast.error("Could not save brief. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-10 lg:px-10">
      <button
        className="mb-8 text-sm font-bold text-[#687087]"
        onClick={() => setLocation("/briefs")}
      >
        <ChevronLeft size={15} className="inline" /> Back to briefs
      </button>
      <div className="eyebrow mb-4">Brief desk / new brief</div>
      <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
        Give the work
        <br />
        <i>somewhere to go.</i>
      </h1>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="surface p-6 lg:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Brief title"
              value={form.title}
              onChange={v => set("title", v)}
              placeholder="e.g. A softer internet"
              wide
            />
            <Field
              label="Campaign objective"
              value={form.objective}
              onChange={v => set("objective", v)}
              placeholder="What should this work make possible?"
              textarea
              wide
            />
            <Field
              label="Content type"
              value={form.type}
              onChange={v => set("type", v)}
              placeholder="Brand film, campaign, social…"
            />
            <Field
              label="Visual direction"
              value={form.style}
              onChange={v => set("style", v)}
              placeholder="Warm, strange, tactile…"
            />
            <Field
              label="Target audience"
              value={form.audience}
              onChange={v => set("audience", v)}
              placeholder="Who needs to feel this?"
            />
            <Field
              label="Platform"
              value={form.platform}
              onChange={v => set("platform", v)}
              placeholder="Instagram + site"
            />
            <Field
              label="Duration"
              value={form.duration}
              onChange={v => set("duration", v)}
              placeholder="30–60 sec"
            />
            <Field
              label="Aspect ratio"
              value={form.ratio}
              onChange={v => set("ratio", v)}
              placeholder="16:9"
            />
            <Field
              label="Number of deliverables"
              value={form.deliverables}
              onChange={v => set("deliverables", v)}
              placeholder="3"
            />
            <Field
              label="Budget range"
              value={form.budget}
              onChange={v => set("budget", v)}
              placeholder="$2k–$5k"
            />
            <Field
              label="Deadline"
              value={form.deadline}
              onChange={v => set("deadline", v)}
              placeholder="Nov 18, 2026"
            />
            <Field
              label="Preferred location / radius"
              value={form.location}
              onChange={v => set("location", v)}
              placeholder="Remote or Los Angeles"
            />
            <label className="block">
              <span className="eyebrow mb-2 block text-[#747d90]">
                Work mode
              </span>
              <select
                value={form.mode}
                onChange={event => set("mode", event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[#fafbfe] p-3 text-sm"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-site</option>
              </select>
            </label>
            <Field
              label="Licensing + commercial use"
              value={form.licensing}
              onChange={v => set("licensing", v)}
              textarea
              wide
            />
          </div>
          <div className="mt-7 flex flex-wrap justify-end gap-2">
            {existingBrief ? (
              <Button
                disabled={saving}
                onClick={() => void publish(existingBrief.status)}
              >
                {saving ? "Saving…" : "Save changes"} <ArrowUpRight size={15} />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void publish("draft")}
                >
                  Save draft
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => void publish("published")}
                >
                  {saving ? "Saving…" : "Publish brief"}{" "}
                  <ArrowUpRight size={15} />
                </Button>
              </>
            )}
          </div>
        </section>
        <aside className="surface-dark h-fit p-6">
          <div className="eyebrow text-white/45">What creators see</div>
          <h2 className="serif mt-5 text-3xl tracking-[-.04em]">
            Clarity creates better creative.
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/60">
            A useful brief says what the work needs to do, then leaves room for
            the person you hire to surprise you.
          </p>
          <div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/65">
            <div className="flex gap-3">
              <span className="text-[var(--lime)]">01</span>State the audience
              truth.
            </div>
            <div className="mt-4 flex gap-3">
              <span className="text-[var(--lime)]">02</span>Share the real
              constraints.
            </div>
            <div className="mt-4 flex gap-3">
              <span className="text-[var(--lime)]">03</span>Leave space for
              taste.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="eyebrow mb-2 block text-[#747d90]">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="focus-ring w-full resize-none rounded-xl border border-[var(--line)] bg-[#fafbfe] p-3 text-sm outline-none placeholder:text-[#b0b6c3]"
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fafbfe] p-3 text-sm outline-none placeholder:text-[#b0b6c3]"
        />
      )}
    </label>
  );
}

function Briefs({ briefs }: { briefs: Brief[] }) {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10">
      <div className="flex items-end justify-between gap-5 mobile-stack">
        <div>
          <div className="eyebrow mb-4">Brief desk / live opportunities</div>
          <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
            Good work starts
            <br />
            <i>with a brief.</i>
          </h1>
        </div>
        <Button onClick={() => setLocation("/briefs/new")}>
          <Plus size={16} /> New brief
        </Button>
      </div>
      <div className="mt-10 space-y-3">
        {briefs.map((brief, i) => (
          <article
            key={brief.id}
            className="surface flex items-center justify-between gap-5 p-5 transition hover:shadow-[0_12px_30px_rgba(16,20,35,.06)] mobile-stack"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f7] text-xs font-black text-[#687087] mono">
                0{i + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black">{brief.title}</h3>
                  <Tag tone={brief.status === "published" ? "lime" : "default"}>
                    {brief.status}
                  </Tag>
                </div>
                <p className="mt-1 text-sm text-[#687087]">{brief.objective}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Tag>{brief.type}</Tag>
                  <Tag>{brief.platform}</Tag>
                  <Tag>{brief.budget}</Tag>
                  <Tag>{brief.deadline}</Tag>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setLocation(`/briefs/${brief.id}/edit`)}
            >
              Edit brief <ArrowUpRight size={15} />
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
function BrandDashboard({
  briefs,
  creatorCount,
  savedCount,
  isLive = false,
}: {
  briefs: Brief[];
  creatorCount?: number;
  savedCount?: number;
  isLive?: boolean;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10">
      <div className="eyebrow mb-4">
        Brand workspace / {isLive ? "live account" : "demo account"}
      </div>
      <div className="flex items-end justify-between gap-5 mobile-stack">
        <div>
          <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
            The next
            <br />
            <i>great frame</i> is out there.
          </h1>
          <p className="mt-4 max-w-xl text-[#687087]">
            Search creators by visual language, then give them enough context to
            make the work their own.
          </p>
        </div>
        <Button onClick={() => setLocation("/briefs/new")}>
          <Plus size={16} /> Write a brief
        </Button>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Stat
          label="Creators indexed"
          value={isLive ? String(creatorCount ?? 0).padStart(2, "0") : "148"}
          note={isLive ? "Published profiles" : "Across 17 specialties"}
        />
        <Stat
          label="Shortlisted"
          value={isLive ? String(savedCount ?? 0).padStart(2, "0") : "06"}
          note={isLive ? "Saved to your account" : "Ready for a conversation"}
        />
        <Stat
          label="Live briefs"
          value={String(
            briefs.filter(b => b.status === "published").length
          ).padStart(2, "0")}
          note="Visible to creators"
        />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow">Your latest brief</div>
              <h2 className="mt-2 text-xl font-black">
                {briefs[0]?.title || "No briefs yet"}
              </h2>
            </div>
            <Tag tone="lime">{briefs[0]?.status}</Tag>
          </div>
          {briefs[0] ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="eyebrow">Objective</div>
                <p className="mt-2 text-sm leading-6 text-[#687087]">
                  {briefs[0]?.objective}
                </p>
              </div>
              <div>
                <div className="eyebrow">Direction</div>
                <p className="mt-2 text-sm leading-6 text-[#687087]">
                  {briefs[0]?.style}
                </p>
              </div>
              <div>
                <div className="eyebrow">Budget</div>
                <p className="mt-2 text-sm font-bold">{briefs[0]?.budget}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#687087]">
              Create your first brief to start a collaboration.
            </p>
          )}
          <button
            onClick={() => setLocation("/briefs")}
            className="mt-7 text-sm font-bold"
          >
            View all briefs <ArrowUpRight size={14} className="inline" />
          </button>
        </div>
        <div className="surface-dark p-6">
          <div className="eyebrow text-white/45">
            {isLive ? "Shortlist" : "Signal / this week"}
          </div>
          <div className="mt-6 flex items-end gap-3">
            <div className="text-6xl font-black tracking-[-.07em]">
              {isLive ? String(savedCount ?? 0).padStart(2, "0") : "24"}
            </div>
            <div className="pb-2 text-sm text-white/55">
              {isLive ? "creators saved" : "new creator profiles"}
              <br />
              {isLive ? "for later" : "matching your taste"}
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/55">
            Try a tighter combination of style + tool filters to find the
            unexpected fit.
          </div>
          <Button
            variant="dark"
            className="mt-6"
            onClick={() => setLocation(isLive ? "/saved" : "/discover")}
          >
            {isLive ? "Open shortlist" : "Open discovery"} <Compass size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="surface p-5">
      <div className="eyebrow">{label}</div>
      <div className="mt-3 text-4xl font-black tracking-[-.05em] mono">
        {value}
      </div>
      <div className="mt-2 text-xs text-[#8c94a5]">{note}</div>
    </div>
  );
}
function Requests() {
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-10 lg:px-10">
      <div className="eyebrow mb-4">Collaboration desk</div>
      <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
        Good things,
        <br />
        <i>in motion.</i>
      </h1>
      <div className="surface mt-10 p-8 text-center">
        <HeartHandshake size={26} className="mx-auto text-[#8991a2]" />
        <h2 className="mt-4 font-bold">No demo requests</h2>
        <p className="mt-2 text-sm text-[#687087]">
          Requests appear here only when you are signed in. Demo mode does not
          create or display marketplace activity.
        </p>
      </div>
    </div>
  );
}

function LiveBriefs({
  briefs,
  loading,
  error,
  isBrand,
  onEdit,
  onStatus,
}: {
  briefs: Brief[];
  loading: boolean;
  error: boolean;
  isBrand: boolean;
  onEdit: (brief: Brief) => void;
  onStatus: (id: number, status: "draft" | "published" | "closed") => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10">
      <div className="flex items-end justify-between gap-5 mobile-stack">
        <div>
          <div className="eyebrow mb-4">
            Brief desk / {isBrand ? "your briefs" : "live opportunities"}
          </div>
          <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
            Good work starts
            <br />
            <i>with a brief.</i>
          </h1>
        </div>
        {isBrand && (
          <Button onClick={() => setLocation("/briefs/new")}>
            <Plus size={16} /> New brief
          </Button>
        )}
      </div>
      {loading ? (
        <p className="mt-10 text-sm text-[#687087]">Loading briefs…</p>
      ) : error ? (
        <p role="alert" className="mt-10 text-sm text-red-700">
          Could not load briefs. Refresh to try again.
        </p>
      ) : briefs.length === 0 ? (
        <div className="surface mt-10 p-8 text-center">
          <BriefcaseBusiness size={24} className="mx-auto text-[#8991a2]" />
          <h2 className="mt-3 font-bold">
            {isBrand ? "No briefs yet" : "No live briefs yet"}
          </h2>
          <p className="mt-2 text-sm text-[#687087]">
            {isBrand
              ? "Create a brief to start a collaboration."
              : "Published brand opportunities will appear here."}
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-3">
          {briefs.map((brief, index) => (
            <article
              key={brief.id}
              className="surface flex items-center justify-between gap-5 p-5 mobile-stack"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f7] text-xs font-black text-[#687087] mono">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black">{brief.title}</h3>
                    <Tag
                      tone={brief.status === "published" ? "lime" : "default"}
                    >
                      {brief.status}
                    </Tag>
                  </div>
                  <p className="mt-1 text-sm text-[#687087]">
                    {brief.objective}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Tag>{brief.type}</Tag>
                    <Tag>{brief.platform}</Tag>
                    <Tag>{brief.budget}</Tag>
                    <Tag>{brief.deadline}</Tag>
                  </div>
                </div>
              </div>
              {isBrand ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" onClick={() => onEdit(brief)}>
                    Edit
                  </Button>
                  {brief.status !== "closed" && (
                    <select
                      aria-label={`Update ${brief.title} status`}
                      value={brief.status}
                      onChange={event =>
                        onStatus(
                          Number(brief.id),
                          event.target.value as "draft" | "published" | "closed"
                        )
                      }
                      className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Close</option>
                    </select>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SavedCreators({
  saved,
  loading,
  error,
  onRemove,
}: {
  saved: Array<{ savedId: number; profile: PersistedCreator["profile"] }>;
  loading: boolean;
  error: boolean;
  onRemove: (creatorId: number) => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10">
      <div className="eyebrow mb-4">Brand workspace / shortlist</div>
      <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
        Saved <i>creators.</i>
      </h1>
      {loading ? (
        <p className="mt-10 text-sm text-[#687087]">Loading saved creators…</p>
      ) : error ? (
        <p role="alert" className="mt-10 text-sm text-red-700">
          Could not load your shortlist.
        </p>
      ) : saved.length === 0 ? (
        <div className="surface mt-10 p-8 text-center">
          <Bookmark size={24} className="mx-auto text-[#8991a2]" />
          <h2 className="mt-3 font-bold">Your shortlist is empty</h2>
          <p className="mt-2 text-sm text-[#687087]">
            Save published creators from discovery to keep them here.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map(item => {
            const creator = mapCreator({ profile: item.profile, projects: [] });
            return (
              <article key={item.savedId} className="surface p-5">
                <h2 className="font-bold">{creator.name}</h2>
                <p className="mt-1 text-sm text-[#687087]">
                  {creator.headline}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setLocation(`/creator/${creator.id}`)}
                  >
                    Open profile
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onRemove(Number(creator.id))}
                  >
                    Remove
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DemoSavedCreators({
  creators,
  savedIds,
  onSave,
}: {
  creators: Creator[];
  savedIds: string[];
  onSave: (id: string) => void;
}) {
  const saved = creators.filter(creator => savedIds.includes(creator.id));
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10">
      <div className="eyebrow mb-4">Demo workspace / local shortlist</div>
      <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
        Saved <i>creators.</i>
      </h1>
      {saved.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map(creator => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              saved
              onSave={() => onSave(creator.id)}
            />
          ))}
        </div>
      ) : (
        <div className="surface mt-10 p-8 text-center">
          <Bookmark size={24} className="mx-auto text-[#8991a2]" />
          <h2 className="mt-3 font-bold">Your demo shortlist is empty</h2>
          <p className="mt-2 text-sm text-[#687087]">
            Saved sample creators stay in this browser only.
          </p>
        </div>
      )}
    </div>
  );
}

type LiveRequest = {
  request: {
    id: number;
    status: "sent" | "accepted" | "declined";
    message: string;
  };
  briefTitle: string;
  creatorName?: string | null;
  brandName?: string | null;
};

function LiveRequests({
  requests,
  loading,
  error,
  isCreator,
  onRespond,
}: {
  requests: LiveRequest[];
  loading: boolean;
  error: boolean;
  isCreator: boolean;
  onRespond: (requestId: number, status: "accepted" | "declined") => void;
}) {
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-10 lg:px-10">
      <div className="eyebrow mb-4">Collaboration desk</div>
      <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
        Good things,
        <br />
        <i>in motion.</i>
      </h1>
      {loading ? (
        <p className="mt-10 text-sm text-[#687087]">Loading requests…</p>
      ) : error ? (
        <p role="alert" className="mt-10 text-sm text-red-700">
          Could not load collaboration requests.
        </p>
      ) : requests.length === 0 ? (
        <div className="surface mt-10 p-8 text-center">
          <HeartHandshake size={26} className="mx-auto text-[#8991a2]" />
          <h2 className="mt-4 font-bold">No collaboration requests</h2>
          <p className="mt-2 text-sm text-[#687087]">
            Requests for your account will appear here.
          </p>
        </div>
      ) : (
        <div className="surface mt-10 divide-y divide-[var(--line)]">
          {requests.map(({ request, briefTitle, creatorName, brandName }) => (
            <article key={request.id} className="flex items-start gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0f3db] text-[var(--navy)]">
                <HeartHandshake size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-black">{briefTitle}</h2>
                  <Tag tone={request.status === "sent" ? "lime" : "default"}>
                    {request.status}
                  </Tag>
                </div>
                <p className="mt-1 text-sm text-[#687087]">
                  {isCreator
                    ? `From ${brandName || "a brand"}`
                    : `To ${creatorName || "a creator"}`}
                </p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#4f576b]">
                  {request.message}
                </p>
                {isCreator && request.status === "sent" && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => onRespond(request.id, "accepted")}>
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onRespond(request.id, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const auth = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const utils = trpc.useUtils();
  const savedState = loadState();
  const [demoRole, setDemoRole] = useState<string>(
    savedState.role || "creator"
  );
  const [creators, setCreators] = useState<Creator[]>(
    savedState.creators || seedCreators
  );
  const [demoSavedIds, setDemoSavedIds] = useState<string[]>(
    savedState.savedIds || []
  );
  const [briefs, setBriefs] = useState<Brief[]>(
    savedState.briefs || seedBriefs
  );
  const path = location.split("?")[0];
  const profileId = path.startsWith("/creator/") ? path.split("/")[2] : "";
  const isLive = Boolean(auth.user);
  const activeRole = isLive
    ? auth.user?.accountType === "brand"
      ? "brand"
      : "creator"
    : demoRole;
  const isBrand = activeRole === "brand";
  const isCreator = activeRole === "creator";
  const creatorQuery = trpc.marketplace.creators.useQuery(undefined, {
    enabled: isLive && (path === "/discover" || path === "/brand"),
    retry: false,
  });
  const creatorDetailQuery = trpc.marketplace.creator.useQuery(
    { id: Number(profileId) || 0 },
    { enabled: isLive && /^\d+$/.test(profileId), retry: false }
  );
  const ownProfileQuery = trpc.marketplace.myProfile.useQuery(undefined, {
    enabled: isLive && isCreator && (path === "/creator" || profileId === "me"),
    retry: false,
  });
  const myBriefsQuery = trpc.marketplace.myBriefs.useQuery(undefined, {
    enabled: isLive && isBrand,
    retry: false,
  });
  const publicBriefsQuery = trpc.marketplace.briefs.useQuery(undefined, {
    enabled: isLive && isCreator && path === "/briefs",
    retry: false,
  });
  const savedCreatorsQuery = trpc.marketplace.savedCreators.useQuery(
    undefined,
    {
      enabled: isLive && isBrand,
      retry: false,
    }
  );
  const requestsQuery = trpc.marketplace.requests.useQuery(undefined, {
    enabled: isLive && (isCreator || isBrand),
    retry: false,
  });
  // Only creators respond to requests, so only they get an "awaiting you" count.
  const pendingRequests =
    isLive && isCreator
      ? ((requestsQuery.data || []) as LiveRequest[]).filter(
        r => r.request.status === "sent"
      ).length
      : 0;
  const saveProfileMutation = trpc.marketplace.saveProfile.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.marketplace.myProfile.invalidate(),
        utils.marketplace.creators.invalidate(),
      ]);
    },
  });
  const createBriefMutation = trpc.marketplace.createBrief.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.marketplace.myBriefs.invalidate(),
        utils.marketplace.briefs.invalidate(),
      ]);
    },
  });
  const updateBriefMutation = trpc.marketplace.updateBrief.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.marketplace.myBriefs.invalidate(),
        utils.marketplace.briefs.invalidate(),
      ]);
    },
  });
  const saveCreatorMutation = trpc.marketplace.saveCreator.useMutation({
    onSuccess: () => utils.marketplace.savedCreators.invalidate(),
  });
  const removeSavedMutation = trpc.marketplace.removeSavedCreator.useMutation({
    onSuccess: () => utils.marketplace.savedCreators.invalidate(),
  });
  const collaborateMutation = trpc.marketplace.collaborate.useMutation({
    onSuccess: () => utils.marketplace.requests.invalidate(),
  });
  const respondMutation = trpc.marketplace.updateRequestStatus.useMutation({
    onSuccess: () => utils.marketplace.requests.invalidate(),
  });
  const accountTypeMutation = trpc.auth.setAccountType.useMutation({
    onSuccess: async () => {
      await auth.refresh();
      toast.success("Workspace updated");
    },
    onError: () => toast.error("Could not switch workspace"),
  });
  const save = (id: string) => {
    const next = demoSavedIds.includes(id)
      ? demoSavedIds.filter(x => x !== id)
      : [...demoSavedIds, id];
    setDemoSavedIds(next);
    localStorage.setItem(
      key,
      JSON.stringify({ role: demoRole, creators, briefs, savedIds: next })
    );
    toast.success(
      next.includes(id)
        ? "Creator saved to shortlist"
        : "Removed from shortlist"
    );
  };
  const persistCreators = (next: Creator[]) => {
    setCreators(next);
    localStorage.setItem(
      key,
      JSON.stringify({
        role: demoRole,
        creators: next,
        briefs,
        savedIds: demoSavedIds,
      })
    );
  };
  const persistBriefs = (next: Brief[]) => {
    setBriefs(next);
    localStorage.setItem(
      key,
      JSON.stringify({
        role: demoRole,
        creators,
        savedIds: demoSavedIds,
        briefs: next,
      })
    );
  };
  const persistedCreators =
    creatorQuery.data?.map(profile => mapCreator({ profile, projects: [] })) ||
    [];
  const persistedSaved = savedCreatorsQuery.data || [];
  const activeCreators = isLive ? persistedCreators : creators;
  const activeSavedIds = isLive
    ? persistedSaved.map(item => String(item.profile.id))
    : demoSavedIds;
  const activeBriefs = isLive
    ? (isBrand ? myBriefsQuery.data : publicBriefsQuery.data)?.map(mapBrief) ||
    []
    : briefs;
  const brandBriefs = isLive ? myBriefsQuery.data?.map(mapBrief) || [] : briefs;
  const ownCreator = ownProfileQuery.data
    ? mapCreator(ownProfileQuery.data)
    : undefined;
  const publicCreator = creatorDetailQuery.data
    ? mapCreator(creatorDetailQuery.data)
    : undefined;
  const selectedLiveProfile = profileId === "me" ? ownCreator : publicCreator;
  const activeProfile = isLive
    ? selectedLiveProfile
    : creators.find(creator => creator.id === profileId) || creators[0];
  const briefEditId = path.match(/^\/briefs\/(\d+)\/edit$/)?.[1];
  const briefForEdit = briefEditId
    ? brandBriefs.find(brief => brief.id === briefEditId)
    : undefined;
  const saveLiveProfile = async (profile: Creator, published: boolean) => {
    const saved = await saveProfileMutation.mutateAsync({
      slug: profile.slug,
      name: profile.name,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      workMode: profile.mode,
      skills: profile.skills.join(", "),
      tools: profile.tools.join(", "),
      contentTypes: profile.types.join(", "),
      styles: profile.styles.join(", "),
      experience: profile.experience,
      rates: profile.rates === "Range not shared" ? undefined : profile.rates,
      formats: profile.formats.join(", "),
      workflow: profile.workflow,
      published,
    });
    toast.success(published ? "Profile published" : "Profile draft saved");
    return saved ? mapCreator(saved as PersistedCreator) : undefined;
  };
  const saveLiveBrief = async (
    values: Omit<Brief, "id" | "creatorIds">,
    id?: number
  ) => {
    const payload = {
      title: values.title,
      objective: values.objective,
      contentType: values.type,
      style: values.style,
      audience: values.audience || "General audience",
      platform: values.platform,
      duration: values.duration || "Not specified",
      aspectRatio: values.ratio || "16:9",
      deliverables: values.deliverables || 1,
      budget: values.budget,
      deadline: values.deadline,
      location: values.location || "Remote",
      workMode: values.mode || "remote",
      licensing: values.licensing || "Licensing to be discussed",
      status: values.status,
    };
    if (id) {
      await updateBriefMutation.mutateAsync({ id, ...payload });
      toast.success("Brief updated");
    } else {
      await createBriefMutation.mutateAsync({
        ...payload,
        status: payload.status === "closed" ? "draft" : payload.status,
      });
      toast.success(
        values.status === "published"
          ? "Brief published"
          : "Brief saved as draft"
      );
    }
  };
  const toggleCreatorSave = (id: string) => {
    if (!isLive) {
      save(id);
      return;
    }
    const creatorId = Number(id);
    if (activeSavedIds.includes(id)) {
      removeSavedMutation.mutate(
        { creatorId },
        {
          onSuccess: () => toast.success("Creator removed from shortlist"),
          onError: () => toast.error("Could not remove creator"),
        }
      );
    } else {
      saveCreatorMutation.mutate(
        { creatorId },
        {
          onSuccess: () => toast.success("Creator saved to shortlist"),
          onError: () => toast.error("Could not save creator"),
        }
      );
    }
  };
  const updateBriefStatus = (
    id: number,
    status: "draft" | "published" | "closed"
  ) => {
    updateBriefMutation.mutate(
      { id, status },
      {
        onSuccess: () => toast.success("Brief status updated"),
        onError: () => toast.error("Could not update brief status"),
      }
    );
  };
  let content: React.ReactNode;
  if (path === "/discover" && isLive)
    content = creatorQuery.isLoading ? (
      <p className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087]">
        Loading creators…
      </p>
    ) : creatorQuery.error ? (
      <p
        role="alert"
        className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-red-700"
      >
        Could not load creators. Refresh to try again.
      </p>
    ) : (
      <Discover
        creators={activeCreators}
        savedIds={activeSavedIds}
        toggleSave={toggleCreatorSave}
        isDemoData={false}
        allowSave={isBrand}
      />
    );
  else if (path === "/discover")
    content = (
      <Discover creators={creators} savedIds={demoSavedIds} toggleSave={save} />
    );
  else if (path === "/creator")
    content =
      isLive && !isCreator ? (
        <p
          role="alert"
          className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-red-700"
        >
          Switch to a creator account to manage a profile.
        </p>
      ) : isLive ? (
        ownProfileQuery.isLoading ? (
          <p className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087]">
            Loading your profile…
          </p>
        ) : ownProfileQuery.error ? (
          <p
            role="alert"
            className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-red-700"
          >
            Could not load your profile. Refresh to try again.
          </p>
        ) : (
          <CreatorWorkspace
            creators={[]}
            setCreators={() => undefined}
            existingProfile={ownCreator}
            isLive
            onSave={saveLiveProfile}
          />
        )
      ) : (
        <CreatorWorkspace creators={creators} setCreators={persistCreators} />
      );
  else if (path === "/creator/portfolio")
    content =
      isLive && isCreator ? (
        <Suspense
          fallback={
            <p
              role="status"
              className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087]"
            >
              Opening Portfolio Studio…
            </p>
          }
        >
          <PortfolioStudio />
        </Suspense>
      ) : (
        <div className="mx-auto max-w-[900px] px-5 py-12 lg:px-10">
          <div className="surface p-8">
            <div className="eyebrow">Authenticated creator workspace</div>
            <h1 className="serif mt-3 text-4xl">Portfolio Studio</h1>
            <p className="mt-4 text-sm leading-6 text-[#687087]">
              Portfolio projects are private, persistent account data. Sign in
              as a creator to manage them; demo role switching does not create a
              creator identity.
            </p>
            {!isLive && (
              <Button
                className="mt-5"
                onClick={() => setAuthDialogOpen(true)}
              >
                <LogIn size={15} /> Log in to continue
              </Button>
            )}
          </div>
        </div>
      );
  else if (path.startsWith("/creator/")) {
    if (isLive && profileId === "me" && !isCreator) {
      content = (
        <p
          role="alert"
          className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-red-700"
        >
          Switch to a creator account to preview your profile.
        </p>
      );
    } else if (isLive && profileId === "me") {
      content = ownProfileQuery.isLoading ? (
        <p className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087]">
          Loading your profile…
        </p>
      ) : ownCreator ? (
        <Profile
          creator={ownCreator}
          saved={false}
          toggleSave={() => undefined}
          demoRole={activeRole}
          briefs={brandBriefs}
          canSave={false}
        />
      ) : (
        <p className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087]">
          Create a profile before previewing it.
        </p>
      );
    } else if (isLive) {
      content = creatorDetailQuery.isLoading ? (
        <p className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087]">
          Loading profile…
        </p>
      ) : creatorDetailQuery.error || !publicCreator ? (
        <p className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087]">
          This profile is unavailable or unpublished.
        </p>
      ) : (
        <Profile
          creator={publicCreator}
          saved={activeSavedIds.includes(publicCreator.id)}
          toggleSave={() => toggleCreatorSave(publicCreator.id)}
          demoRole={activeRole}
          briefs={brandBriefs.filter(brief => brief.status === "published")}
          canSave={isBrand}
          onCollaborate={async (briefId, message) => {
            await collaborateMutation.mutateAsync({
              briefId,
              creatorId: Number(publicCreator.id),
              message,
            });
            toast.success("Collaboration request sent");
          }}
        />
      );
    } else {
      content = (
        <Profile
          creator={activeProfile!}
          saved={demoSavedIds.includes(activeProfile!.id)}
          toggleSave={() => save(activeProfile!.id)}
          demoRole={demoRole}
          briefs={briefs}
        />
      );
    }
  } else if (path === "/brand" && isLive && !isBrand)
    content = (
      <p
        role="alert"
        className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-red-700"
      >
        Switch to a brand account to open the brand workspace.
      </p>
    );
  else if (path === "/brand")
    content = (
      <BrandDashboard
        briefs={isLive ? brandBriefs : briefs}
        creatorCount={creatorQuery.data?.length}
        savedCount={persistedSaved.length}
        isLive={isLive}
      />
    );
  else if (path === "/saved" && isLive && !isBrand)
    content = (
      <p
        role="alert"
        className="mx-auto max-w-[1200px] px-5 py-10 text-sm text-red-700"
      >
        Switch to a brand account to view saved creators.
      </p>
    );
  else if (path === "/saved" && isLive && isBrand)
    content = (
      <SavedCreators
        saved={persistedSaved.map(item => ({
          savedId: item.savedId,
          profile: item.profile,
        }))}
        loading={savedCreatorsQuery.isLoading}
        error={Boolean(savedCreatorsQuery.error)}
        onRemove={creatorId => toggleCreatorSave(String(creatorId))}
      />
    );
  else if (path === "/saved")
    content = (
      <DemoSavedCreators
        creators={creators}
        savedIds={demoSavedIds}
        onSave={save}
      />
    );
  else if (path === "/briefs/new" || briefEditId) {
    if (isLive && !isBrand) {
      content = (
        <p
          role="alert"
          className="mx-auto max-w-[1120px] px-5 py-10 text-sm text-red-700"
        >
          Brand account required to manage briefs.
        </p>
      );
    } else if (isLive && briefEditId && myBriefsQuery.isLoading) {
      content = (
        <p className="mx-auto max-w-[1120px] px-5 py-10 text-sm text-[#687087]">
          Loading brief…
        </p>
      );
    } else if (isLive && briefEditId && !briefForEdit) {
      content = (
        <p
          role="alert"
          className="mx-auto max-w-[1120px] px-5 py-10 text-sm text-[#687087]"
        >
          Brief not found or you do not own it.
        </p>
      );
    } else {
      content = (
        <BriefForm
          briefs={briefs}
          setBriefs={persistBriefs}
          existingBrief={briefForEdit}
          isLive={isLive}
          onSave={values =>
            saveLiveBrief(
              values,
              briefForEdit ? Number(briefForEdit.id) : undefined
            )
          }
        />
      );
    }
  } else if (path === "/briefs" && isLive) {
    const query = isBrand ? myBriefsQuery : publicBriefsQuery;
    content = (
      <LiveBriefs
        briefs={activeBriefs}
        loading={query.isLoading}
        error={Boolean(query.error)}
        isBrand={isBrand}
        onEdit={brief => setLocation(`/briefs/${brief.id}/edit`)}
        onStatus={updateBriefStatus}
      />
    );
  } else if (path === "/briefs") content = <Briefs briefs={briefs} />;
  else if (path === "/requests" && isLive && (isCreator || isBrand))
    content = (
      <LiveRequests
        requests={(requestsQuery.data || []) as LiveRequest[]}
        loading={requestsQuery.isLoading}
        error={Boolean(requestsQuery.error)}
        isCreator={isCreator}
        onRespond={(requestId, status) =>
          respondMutation.mutate(
            { requestId, status },
            {
              onSuccess: () => toast.success(`Request ${status}`),
              onError: () => toast.error("Could not update request"),
            }
          )
        }
      />
    );
  else if (path === "/requests" && isLive)
    content = (
      <p
        role="alert"
        className="mx-auto max-w-[1000px] px-5 py-10 text-sm text-red-700"
      >
        Choose a creator or brand workspace to view requests.
      </p>
    );
  else if (path === "/requests") content = <Requests />;
  else
    content = (
      <Hero
        setDemoRole={role => {
          setDemoRole(role);
          localStorage.setItem(
            key,
            JSON.stringify({ role, creators, briefs, savedIds: demoSavedIds })
          );
        }}
        onRoleSelect={role => {
          if (isLive) accountTypeMutation.mutate({ accountType: role });
        }}
      />
    );
  if (path === "/") {
    useRouteChangeEffects(path);
    return (
      <div className="landing-root bg-[#F8F7F2] min-h-screen">
        <SkipLink />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <LandingPage
            onLogin={() => setAuthDialogOpen(true)}
            onSelectRole={role => {
              setDemoRole(role);
              localStorage.setItem(
                key,
                JSON.stringify({ role, creators, briefs, savedIds: demoSavedIds })
              );
              if (isLive) accountTypeMutation.mutate({ accountType: role });
            }}
          />
        </main>
        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      </div>
    );
  }

  const navRole = isBrand ? "brand" : "creator";
  const chrome = showsWorkspaceChrome(path);
  useRouteChangeEffects(path);
  return (
    <div className="shell">
      <SkipLink />
      <Topbar
        demoRole={activeRole}
        onLogin={() => setAuthDialogOpen(true)}
        pendingRequests={pendingRequests}
        setDemoRole={role => {
          setDemoRole(role);
          localStorage.setItem(
            key,
            JSON.stringify({ role, creators, briefs, savedIds: demoSavedIds })
          );
        }}
      />
      <div className="flex">
        {chrome && <SideRail role={navRole} pendingRequests={pendingRequests} />}
        <main
          id="main-content"
          tabIndex={-1}
          className={`min-w-0 flex-1 outline-none ${chrome ? "pb-24 md:pb-0" : ""}`}
        >
          {chrome && <Breadcrumbs path={path} role={navRole} />}
          {auth.user && (
            <div className="mx-auto max-w-[1440px] px-5 pt-4 text-xs text-[#8991a2] lg:px-10">
              Signed in as {auth.user.name || auth.user.email || "GoCollabo user"}.{" "}
              <span className="font-bold text-[var(--indigo)]">Live account</span>
            </div>
          )}
          {auth.loading ? (
            <p
              role="status"
              className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087] lg:px-10"
            >
              Checking account…
            </p>
          ) : (
            content
          )}
        </main>
      </div>
      {chrome && <MobileTabBar role={navRole} pendingRequests={pendingRequests} />}
      <footer className="border-t border-[var(--line)] px-5 py-8 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 text-xs text-[#8991a2] mobile-stack">
          <span>
            © 2026 GoCollabo. Sample data is clearly marked; profiles are
            self-reported.
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--lime)]" /> Built for
            the next frame
          </span>
        </div>
      </footer>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
