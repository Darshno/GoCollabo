import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Compass,
  Filter,
  Grid2X2,
  HeartHandshake,
  Image as ImageIcon,
  LayoutDashboard,
  LogIn,
  Menu,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

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
  projects: {
    title: string;
    type: string;
    image: string;
    description: string;
    concept?: boolean;
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
  status: "draft" | "published";
  creatorIds: string[];
};

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
function Logo() {
  const [, setLocation] = useLocation();
  return (
    <button
      className="flex items-center gap-2 text-left"
      onClick={() => setLocation("/")}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--navy)] text-[var(--lime)]">
        <Clapperboard size={16} />
      </span>
      <span className="text-[15px] font-black tracking-[-.04em]">
        frame<span className="font-normal text-[#687087]">foundry</span>
      </span>
    </button>
  );
}

function Topbar({
  demoRole,
  setDemoRole,
}: {
  demoRole: string;
  setDemoRole: (x: string) => void;
}) {
  const [, setLocation] = useLocation();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="nav-shell sticky top-0 z-30">
      <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
        <Logo />
        <nav className="desktop-only flex items-center gap-7 text-sm font-semibold text-[#687087]">
          <button
            onClick={() => setLocation("/discover")}
            className="hover:text-[var(--ink)]"
          >
            Discover
          </button>
          <button
            onClick={() => setLocation("/briefs")}
            className="hover:text-[var(--ink)]"
          >
            Briefs
          </button>
          <button
            onClick={() => setLocation("/creator")}
            className="hover:text-[var(--ink)]"
          >
            Creator workspace
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <div className="desktop-only flex items-center gap-1 rounded-full border border-[var(--line)] bg-white p-1 text-[11px]">
            <span className="px-2 text-[#9299aa]">Demo as</span>
            {["creator", "brand"].map(role => (
              <button
                key={role}
                onClick={() => setDemoRole(role)}
                className={`rounded-full px-2.5 py-1.5 font-bold capitalize ${demoRole === role ? "bg-[var(--navy)] text-white" : "text-[#697186]"}`}
              >
                {role}
              </button>
            ))}
          </div>
          {auth.user ? (
            <Button variant="ghost" onClick={() => auth.logout()}>
              Log out
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                try {
                  startLogin();
                } catch {
                  toast.error("Manus login is not configured in this preview");
                }
              }}
            >
              <LogIn size={15} /> Log in
            </Button>
          )}
          <button
            className="hidden rounded-full border border-[var(--line)] p-2.5 md:hidden"
            onClick={() => setOpen(!open)}
          >
            <Menu size={18} />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-[var(--line)] px-5 py-4 md:hidden">
          <div className="grid gap-2 text-sm font-semibold">
            <button
              className="py-2 text-left"
              onClick={() => {
                setLocation("/discover");
                setOpen(false);
              }}
            >
              Discover
            </button>
            <button
              className="py-2 text-left"
              onClick={() => {
                setLocation("/briefs");
                setOpen(false);
              }}
            >
              Briefs
            </button>
            <button
              className="py-2 text-left"
              onClick={() => {
                setLocation("/creator");
                setOpen(false);
              }}
            >
              Creator workspace
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function SideRail({ active, demoRole }: { active: string; demoRole: string }) {
  const [, setLocation] = useLocation();
  const items =
    demoRole === "creator"
      ? [
          {
            id: "creator",
            label: "Workspace",
            icon: LayoutDashboard,
            path: "/creator",
          },
          {
            id: "discover",
            label: "Find briefs",
            icon: Compass,
            path: "/briefs",
          },
          {
            id: "requests",
            label: "Requests",
            icon: HeartHandshake,
            path: "/requests",
          },
        ]
      : [
          {
            id: "brand",
            label: "Overview",
            icon: LayoutDashboard,
            path: "/brand",
          },
          {
            id: "discover",
            label: "Find creators",
            icon: Compass,
            path: "/discover",
          },
          {
            id: "briefs",
            label: "My briefs",
            icon: BriefcaseBusiness,
            path: "/briefs",
          },
          {
            id: "requests",
            label: "Requests",
            icon: HeartHandshake,
            path: "/requests",
          },
        ];
  return (
    <aside className="desktop-only w-[220px] shrink-0 border-r border-[var(--line)] bg-[#f5f6fa] px-4 py-6">
      <div className="eyebrow mb-4 px-3">Workspace</div>
      <div className="space-y-1">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setLocation(item.path)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active === item.id ? "bg-white text-[var(--navy)] shadow-[0_4px_15px_rgba(16,20,35,.05)]" : "text-[#7d8598] hover:bg-white/70 hover:text-[var(--ink)]"}`}
            >
              <Icon size={16} />
              {item.label}
              {item.id === "requests" && (
                <span className="ml-auto h-2 w-2 rounded-full bg-[var(--lime)]" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-12 rounded-2xl bg-[var(--navy)] p-4 text-white">
        <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--lime)] text-[var(--navy)]">
          <Zap size={16} />
        </div>
        <div className="text-sm font-bold">Your workspace is live.</div>
        <p className="mt-1 text-xs leading-5 text-white/55">
          Build a profile that gives the right people a reason to reach out.
        </p>
        <button
          onClick={() =>
            setLocation(demoRole === "creator" ? "/creator" : "/briefs/new")
          }
          className="mt-4 text-xs font-bold text-[var(--lime)]"
        >
          {demoRole === "creator" ? "Continue profile →" : "Publish a brief →"}
        </button>
      </div>
    </aside>
  );
}

function CreatorCard({
  creator,
  saved,
  onSave,
}: {
  creator: Creator;
  saved: boolean;
  onSave: () => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <article className="surface portfolio-card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,20,35,.08)]">
      <button
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#e8ebf2] text-left"
        onClick={() => setLocation(`/creator/${creator.id}`)}
      >
        <img
          src={creator.projects[0].image}
          alt=""
          className="portfolio-img h-full w-full object-cover"
        />
        <span className="absolute left-3 top-3">
          <Tag tone="dark">{creator.projects[0].type}</Tag>
        </span>
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
}: {
  creators: Creator[];
  savedIds: string[];
  toggleSave: (id: string) => void;
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
      <div className="mt-10 surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-[#f5f6fa] px-3 py-2.5">
            <Search size={16} className="text-[#98a0b1]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search names, tools, skills…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#a2a8b7]"
            />
          </div>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="rounded-xl border-0 bg-[#f5f6fa] px-3 py-2.5 text-sm font-semibold outline-none"
          >
            {allTypes.map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            value={style}
            onChange={e => setStyle(e.target.value)}
            className="rounded-xl border-0 bg-[#f5f6fa] px-3 py-2.5 text-sm font-semibold outline-none"
          >
            {allStyles.map(v => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            className="rounded-xl border-0 bg-[#f5f6fa] px-3 py-2.5 text-sm font-semibold outline-none"
          >
            <option>Any mode</option>
            <option>remote</option>
            <option>hybrid</option>
            <option>on-site</option>
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="rounded-xl border-0 bg-[#f5f6fa] px-3 py-2.5 text-sm font-semibold outline-none"
          >
            <option>Featured</option>
            <option>Name</option>
            <option>Available</option>
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setType("All work");
              setStyle("All styles");
              setMode("Any mode");
            }}
          >
            <Filter size={15} /> Clear
          </Button>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <div className="eyebrow">{filtered.length} profiles / sample data</div>
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

function Hero({ setDemoRole }: { setDemoRole: (x: string) => void }) {
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
            FrameFoundry helps AI creators build the portfolio they actually
            want to be hired for — and gives brands a sharper way to find them.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button
              variant="light"
              onClick={() => {
                setDemoRole("creator");
                setLocation("/creator");
              }}
            >
              Build your profile <ArrowUpRight size={15} />
            </Button>
            <Button
              variant="dark"
              onClick={() => {
                setDemoRole("brand");
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
}: {
  creators: Creator[];
  setCreators: (x: Creator[]) => void;
}) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
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
  const generate = () => {
    const profile: Creator = {
      id: "me",
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
      projects: [
        {
          title: "First project preview",
          type: split(answers.types || "Concept work")[0],
          image: seedCreators[1].projects[0].image,
          description:
            "A concept project. Add your own image, video, or asset when you publish.",
        },
      ],
    };
    setCreators([...creators.filter(c => c.id !== "me"), profile]);
    setPublished(true);
    toast.success("Profile draft generated from your answers");
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
        <Tag tone="lime">Demo mode</Tag>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="surface min-h-[520px] p-6 lg:p-10">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              Question {String(step + 1).padStart(2, "0")} /{" "}
              {String(questions.length).padStart(2, "0")}
            </span>
            <span className="text-xs font-semibold text-[#a2a8b7]">
              Saved locally as draft
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
              <div className="eyebrow text-white/45">Live profile preview</div>
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
                {published
                  ? "Your editable draft is ready. Nothing here is published until you choose to publish it."
                  : "Answer the questions to turn your process into a professional profile."}
              </div>
            </div>
            {published && (
              <Button
                variant="light"
                className="mt-6 w-full"
                onClick={() => {
                  setLocation("/creator/me");
                  toast.success("Preview opened");
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
}: {
  creator: Creator;
  saved: boolean;
  toggleSave: () => void;
  demoRole: string;
  briefs: Brief[];
}) {
  const [, setLocation] = useLocation();
  const [requestOpen, setRequestOpen] = useState(false);
  const [sent, setSent] = useState(false);
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
            <Button variant={saved ? "primary" : "ghost"} onClick={toggleSave}>
              <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save creator"}
            </Button>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {creator.projects.map((p, i) => (
              <article
                key={p.title}
                className={`portfolio-card surface overflow-hidden ${i === 0 ? "md:col-span-2" : ""}`}
              >
                <div
                  className={`relative overflow-hidden ${i === 0 ? "aspect-[16/8]" : "aspect-[4/3]"}`}
                >
                  <img
                    src={p.image}
                    alt=""
                    className="portfolio-img h-full w-full object-cover"
                  />
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
            <select className="mt-6 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm">
              <option>{briefs[0]?.title || "Create a brief first"}</option>
              {briefs.slice(1).map(b => (
                <option key={b.id}>{b.title}</option>
              ))}
            </select>
            <textarea
              rows={4}
              defaultValue={`Hi ${creator.name}, your work feels right for this brief because…`}
              className="mt-3 w-full rounded-xl border border-[var(--line)] p-3 text-sm outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSent(true);
                  setRequestOpen(false);
                  toast.success("Request sent in demo mode");
                }}
              >
                Send request
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
}: {
  briefs: Brief[];
  setBriefs: (x: Brief[]) => void;
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
  const set = (key: string, value: string) =>
    setForm({ ...form, [key]: value });
  const publish = (status: "draft" | "published") => {
    if (!form.title || !form.objective) {
      toast.error("Add a title and objective first");
      return;
    }
    setBriefs([
      ...briefs,
      {
        id: `b${Date.now()}`,
        title: form.title,
        objective: form.objective,
        type: form.type,
        style: form.style || "Open to interpretation",
        platform: form.platform,
        budget: form.budget,
        deadline: form.deadline || "Date to be confirmed",
        status,
        creatorIds: [],
      },
    ]);
    toast.success(
      status === "published" ? "Brief published in demo mode" : "Draft saved"
    );
    setLocation("/briefs");
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
            <Field
              label="Licensing + commercial use"
              value={form.licensing}
              onChange={v => set("licensing", v)}
              textarea
              wide
            />
          </div>
          <div className="mt-7 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => publish("draft")}>
              Save draft
            </Button>
            <Button onClick={() => publish("published")}>
              Publish brief <ArrowUpRight size={15} />
            </Button>
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
              onClick={() =>
                toast.info(
                  "Brief detail editing is ready for the next iteration"
                )
              }
            >
              Open brief <ArrowUpRight size={15} />
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
function BrandDashboard({ briefs }: { briefs: Brief[] }) {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10">
      <div className="eyebrow mb-4">Brand workspace / demo account</div>
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
          value="148"
          note="Across 17 specialties"
        />
        <Stat label="Shortlisted" value="06" note="Ready for a conversation" />
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
              <h2 className="mt-2 text-xl font-black">{briefs[0]?.title}</h2>
            </div>
            <Tag tone="lime">{briefs[0]?.status}</Tag>
          </div>
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
          <button
            onClick={() => setLocation("/briefs")}
            className="mt-7 text-sm font-bold"
          >
            View all briefs <ArrowUpRight size={14} className="inline" />
          </button>
        </div>
        <div className="surface-dark p-6">
          <div className="eyebrow text-white/45">Signal / this week</div>
          <div className="mt-6 flex items-end gap-3">
            <div className="text-6xl font-black tracking-[-.07em]">24</div>
            <div className="pb-2 text-sm text-white/55">
              new creator profiles
              <br />
              matching your taste
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/55">
            Try a tighter combination of style + tool filters to find the
            unexpected fit.
          </div>
          <Button
            variant="dark"
            className="mt-6"
            onClick={() => setLocation("/discover")}
          >
            Open discovery <Compass size={15} />
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
      <div className="surface mt-10 divide-y divide-[var(--line)]">
        <div className="flex items-start gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0f3db] text-[var(--navy)]">
            <HeartHandshake size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black">A brand saved your profile</h3>
                <p className="mt-1 text-sm text-[#687087]">
                  A softer internet / FrameFoundry sample brand
                </p>
              </div>
              <Tag tone="lime">New</Tag>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#4f576b]">
              “Your work around atmosphere and human texture feels aligned with
              our launch film.”
            </p>
            <Button variant="ghost" className="mt-4">
              View brief <ArrowUpRight size={14} />
            </Button>
          </div>
        </div>
        <div className="p-5 text-sm text-[#8991a2]">
          Requests are intentionally lightweight in MVP 1. Full messaging and
          project management are planned for a later release.
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [location] = useLocation();
  const auth = useAuth();
  const savedState = loadState();
  const [demoRole, setDemoRole] = useState<string>(
    savedState.role || "creator"
  );
  const [creators, setCreators] = useState<Creator[]>(
    savedState.creators || seedCreators
  );
  const [savedIds, setSavedIds] = useState<string[]>(savedState.savedIds || []);
  const [briefs, setBriefs] = useState<Brief[]>(
    savedState.briefs || seedBriefs
  );
  const save = (id: string) => {
    const next = savedIds.includes(id)
      ? savedIds.filter(x => x !== id)
      : [...savedIds, id];
    setSavedIds(next);
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
      JSON.stringify({ role: demoRole, creators: next, briefs, savedIds })
    );
  };
  const persistBriefs = (next: Brief[]) => {
    setBriefs(next);
    localStorage.setItem(
      key,
      JSON.stringify({ role: demoRole, creators, savedIds, briefs: next })
    );
  };
  const path = location.split("?")[0];
  const profileId = path.startsWith("/creator/") ? path.split("/")[2] : "";
  const profile = creators.find(c => c.id === profileId) || creators[0];
  let content: React.ReactNode;
  if (path === "/discover")
    content = (
      <Discover creators={creators} savedIds={savedIds} toggleSave={save} />
    );
  else if (path === "/creator")
    content = (
      <CreatorWorkspace creators={creators} setCreators={persistCreators} />
    );
  else if (path.startsWith("/creator/"))
    content = (
      <Profile
        creator={profile}
        saved={savedIds.includes(profile.id)}
        toggleSave={() => save(profile.id)}
        demoRole={demoRole}
        briefs={briefs}
      />
    );
  else if (path === "/brand") content = <BrandDashboard briefs={briefs} />;
  else if (path === "/briefs/new")
    content = <BriefForm briefs={briefs} setBriefs={persistBriefs} />;
  else if (path === "/briefs") content = <Briefs briefs={briefs} />;
  else if (path === "/requests") content = <Requests />;
  else
    content = (
      <Hero
        setDemoRole={role => {
          setDemoRole(role);
          localStorage.setItem(
            key,
            JSON.stringify({ role, creators, briefs, savedIds })
          );
        }}
      />
    );
  const active = path.startsWith("/discover")
    ? "discover"
    : path.startsWith("/briefs")
      ? "briefs"
      : path.startsWith("/requests")
        ? "requests"
        : demoRole === "brand"
          ? "brand"
          : "creator";
  return (
    <div className="shell">
      <Topbar
        demoRole={demoRole}
        setDemoRole={role => {
          setDemoRole(role);
          localStorage.setItem(
            key,
            JSON.stringify({ role, creators, briefs, savedIds })
          );
        }}
      />
      <div className="flex">
        <SideRail active={active} demoRole={demoRole} />
        <main className="min-w-0 flex-1">
          {auth.user && (
            <div className="mx-auto max-w-[1440px] px-5 pt-4 text-xs text-[#8991a2] lg:px-10">
              Signed in as {auth.user.name || auth.user.email || "Manus user"}.{" "}
              <span className="font-bold text-[var(--indigo)]">
                Live account
              </span>
            </div>
          )}
          {content}
        </main>
      </div>
      <footer className="border-t border-[var(--line)] px-5 py-8 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 text-xs text-[#8991a2] mobile-stack">
          <span>
            © 2026 FrameFoundry. Sample data is clearly marked; profiles are
            self-reported.
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--lime)]" /> Built for
            the next frame
          </span>
        </div>
      </footer>
    </div>
  );
}
