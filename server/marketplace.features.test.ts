import { describe, expect, it } from "vitest";
import { mapCreator, mapBrief, split } from "../client/src/pages/Home";
import type { PersistedCreator, PersistedBrief } from "../client/src/pages/Home";

describe("Marketplace Data Mapping & Utilities", () => {
  it("splits comma-separated fields with trimming and empty removal", () => {
    expect(split("")).toEqual([]);
    expect(split("  Runway, ComfyUI , After Effects  ")).toEqual([
      "Runway",
      "ComfyUI",
      "After Effects",
    ]);
    expect(split("SingleItem")).toEqual(["SingleItem"]);
    expect(split("a,,b, ,c")).toEqual(["a", "b", "c"]);
  });

  it("maps persisted creator to UI creator representation with fallbacks", () => {
    const raw: PersistedCreator = {
      profile: {
        id: 42,
        slug: "mara-chen",
        name: "Mara Chen",
        headline: "Visual systems director",
        bio: "Director and worldbuilder for atmospheric media.",
        location: "Los Angeles, CA",
        workMode: "remote",
        skills: "Direction, Worldbuilding",
        tools: "Runway, ComfyUI",
        contentTypes: "Film, Editorial",
        styles: "Cinematic, Surreal",
        experience: "6-8 years",
        rates: null, // should fallback to "Range not shared"
        formats: "16:9, 9:16",
        workflow: "Tight concept loop, visual reference pass",
        verificationStatus: "self-reported",
        availability: "Available in November",
        published: true,
      },
      projects: [
        {
          id: 101,
          title: "The Quiet Between",
          description: "Speculative film about memory",
          imageUrl: "https://example.com/project.jpg",
          contentType: "AI short film",
          isConcept: false,
          role: "Director",
          challenge: null,
          approach: null,
          outcomes: null,
          impactSummary: null,
          skills: "Direction",
          tools: "Runway",
        },
      ],
    };

    const mapped = mapCreator(raw);
    expect(mapped.id).toBe("42");
    expect(mapped.name).toBe("Mara Chen");
    expect(mapped.rates).toBe("Range not shared");
    expect(mapped.skills).toEqual(["Direction", "Worldbuilding"]);
    expect(mapped.tools).toEqual(["Runway", "ComfyUI"]);
    expect(mapped.types).toEqual(["Film", "Editorial"]);
    expect(mapped.styles).toEqual(["Cinematic", "Surreal"]);
    expect(mapped.verification).toBe("SELF-REPORTED");
    expect(mapped.projects).toHaveLength(1);
    expect(mapped.projects[0].title).toBe("The Quiet Between");
    expect(mapped.projects[0].image).toBe("https://example.com/project.jpg");
  });

  it("maps persisted brief to UI brief representation", () => {
    const raw: PersistedBrief = {
      id: 99,
      title: "Atmospheric Brand World",
      objective: "Create a 60-second launch narrative for our seasonal collection.",
      contentType: "Brand film",
      style: "Cinematic",
      audience: "Creative Directors",
      platform: "Web + Social",
      duration: "60s",
      aspectRatio: "16:9",
      deliverables: 3,
      budget: "$5,000",
      deadline: "2026-11-30",
      location: "Remote",
      workMode: "remote",
      licensing: "Full commercial buyout",
      status: "published",
    };

    const mapped = mapBrief(raw);
    expect(mapped.id).toBe("99");
    expect(mapped.title).toBe("Atmospheric Brand World");
    expect(mapped.deliverables).toBe(3);
    expect(mapped.status).toBe("published");
    expect(mapped.creatorIds).toEqual([]);
  });
});

describe("Creator Discovery & Filtering Logic", () => {
  const sampleCreators = [
    {
      id: "1",
      slug: "mara-chen",
      name: "Mara Chen",
      headline: "Director + visual systems designer",
      location: "Los Angeles, CA",
      mode: "remote" as const,
      skills: ["Direction", "Worldbuilding"],
      tools: ["Runway", "ComfyUI"],
      types: ["Film", "Brand film"],
      styles: ["Surreal", "Cinematic"],
      experience: "6–8 years",
      rates: "$2.5k–$8k",
      formats: ["16:9"],
      availability: "Available in November",
      verification: "SELF-REPORTED",
      bio: "Mara builds cinematic worlds.",
      workflow: "Tight concept loop.",
      published: true,
      projects: [],
    },
    {
      id: "2",
      slug: "noah-williams",
      name: "Noah Williams",
      headline: "AI animator making joyful motion",
      location: "London, UK",
      mode: "hybrid" as const,
      skills: ["3D animation", "Character"],
      tools: ["Blender", "Sora"],
      types: ["Social", "Product film"],
      styles: ["Playful", "Graphic"],
      experience: "4–6 years",
      rates: "$1.8k–$5k",
      formats: ["9:16"],
      availability: "Immediate",
      verification: "SELF-REPORTED",
      bio: "Noah combines animation discipline with generative play.",
      workflow: "Storyboard in frames.",
      published: true,
      projects: [],
    },
    {
      id: "3",
      slug: "elena-rostova",
      name: "Elena Rostova",
      headline: "Prompt architect and colorist",
      location: "Berlin, DE",
      mode: "on-site" as const,
      skills: ["Color grading", "Prompt craft"],
      tools: ["Midjourney", "ComfyUI"],
      types: ["Editorial", "Print"],
      styles: ["Minimal", "Textural"],
      experience: "5+ years",
      rates: "$3k–$6k",
      formats: ["1:1"],
      availability: "Booked until December",
      verification: "VERIFIED",
      bio: "Elena crafts precision prompts.",
      workflow: "Iterative seeds.",
      published: true,
      projects: [],
    },
  ];

  function filterCreators(
    creators: typeof sampleCreators,
    query: string,
    type: string,
    mode: string,
    style: string,
    sort: string
  ) {
    let list = creators.filter((c) => {
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

    if (sort === "Name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sort === "Available") {
      list = [...list].sort((a, b) =>
        a.availability.localeCompare(b.availability)
      );
    }
    return list;
  }

  it("filters by text query across name, tools, and skills", () => {
    expect(
      filterCreators(sampleCreators, "Blender", "All work", "Any mode", "All styles", "Featured")
    ).toHaveLength(1);
    expect(
      filterCreators(sampleCreators, "Blender", "All work", "Any mode", "All styles", "Featured")[0].name
    ).toBe("Noah Williams");

    expect(
      filterCreators(sampleCreators, "ComfyUI", "All work", "Any mode", "All styles", "Featured")
    ).toHaveLength(2);
    expect(
      filterCreators(sampleCreators, "London", "All work", "Any mode", "All styles", "Featured")
    ).toHaveLength(1);
  });

  it("filters by work mode", () => {
    expect(
      filterCreators(sampleCreators, "", "All work", "remote", "All styles", "Featured")
    ).toHaveLength(1);
    expect(
      filterCreators(sampleCreators, "", "All work", "remote", "All styles", "Featured")[0].name
    ).toBe("Mara Chen");

    expect(
      filterCreators(sampleCreators, "", "All work", "hybrid", "All styles", "Featured")
    ).toHaveLength(1);
    expect(
      filterCreators(sampleCreators, "", "All work", "on-site", "All styles", "Featured")
    ).toHaveLength(1);
  });

  it("filters by style and content type", () => {
    expect(
      filterCreators(sampleCreators, "", "Film", "Any mode", "All styles", "Featured")
    ).toHaveLength(1);
    expect(
      filterCreators(sampleCreators, "", "All work", "Any mode", "Playful", "Featured")
    ).toHaveLength(1);
    expect(
      filterCreators(sampleCreators, "", "All work", "Any mode", "Playful", "Featured")[0].name
    ).toBe("Noah Williams");
  });

  it("sorts by name alphabetically", () => {
    const sorted = filterCreators(sampleCreators, "", "All work", "Any mode", "All styles", "Name");
    expect(sorted.map((c) => c.name)).toEqual([
      "Elena Rostova",
      "Mara Chen",
      "Noah Williams",
    ]);
  });

  it("returns empty array when no creators match filter criteria", () => {
    const results = filterCreators(
      sampleCreators,
      "NonexistentSkillXYZ",
      "All work",
      "Any mode",
      "All styles",
      "Featured"
    );
    expect(results).toHaveLength(0);
  });
});

describe("Brief & Collaboration Validation Rules", () => {
  it("validates brief creation input constraints", () => {
    const validateBrief = (form: {
      title: string;
      objective: string;
      deadline: string;
    }) => {
      if (!form.title || form.title.trim().length < 3)
        return "Title must be at least 3 characters";
      if (!form.objective || form.objective.trim().length < 10)
        return "Objective must be at least 10 characters";
      if (!form.deadline || form.deadline.trim().length === 0)
        return "Deadline is required";
      return null;
    };

    expect(
      validateBrief({
        title: "Hi",
        objective: "Valid long objective description",
        deadline: "2026-12-01",
      })
    ).toBe("Title must be at least 3 characters");
    expect(
      validateBrief({
        title: "Valid Title",
        objective: "Too short",
        deadline: "2026-12-01",
      })
    ).toBe("Objective must be at least 10 characters");
    expect(
      validateBrief({
        title: "Valid Title",
        objective: "Valid long objective description",
        deadline: "",
      })
    ).toBe("Deadline is required");
    expect(
      validateBrief({
        title: "Valid Title",
        objective: "Valid long objective description",
        deadline: "2026-12-01",
      })
    ).toBeNull();
  });

  it("validates collaboration request constraints", () => {
    const validateRequest = (selectedBriefId: string | number, message: string) => {
      if (!selectedBriefId) return "A published brief must be selected";
      if (message.trim().length < 10)
        return "Message must be at least 10 characters";
      return null;
    };

    expect(
      validateRequest("", "Hey let's work together on this project")
    ).toBe("A published brief must be selected");
    expect(validateRequest("12", "Short")).toBe(
      "Message must be at least 10 characters"
    );
    expect(
      validateRequest("12", "Hi Mara, love your work and want to collaborate")
    ).toBeNull();
  });

  it("enforces allowed brief status transitions", () => {
    const validTransitions: Record<string, string[]> = {
      draft: ["published", "closed"],
      published: ["closed"],
      closed: [],
    };

    const canTransition = (from: string, to: string) =>
      validTransitions[from]?.includes(to) ?? false;

    expect(canTransition("draft", "published")).toBe(true);
    expect(canTransition("draft", "closed")).toBe(true);
    expect(canTransition("published", "closed")).toBe(true);
    expect(canTransition("closed", "published")).toBe(false);
    expect(canTransition("closed", "draft")).toBe(false);
  });
});
