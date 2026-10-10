import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ProjectForm = {
  id?: number;
  title: string;
  description: string;
  contentType: string;
  role: string;
  tools: string;
  skills: string;
  challenge: string;
  approach: string;
  outcomes: string;
  impactSummary: string;
  imageUrl: string | null;
  mediaKey: string | null;
  mediaName: string | null;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null;
  mediaSize: number | null;
  isConcept: number;
  published: boolean;
};

type AssistDraft = {
  title: string;
  description: string;
  challenge: string;
  approach: string;
  outcomes: string;
  impactSummary: string;
  skills: string[];
  isDraft: true;
};

const emptyProject = (): ProjectForm => ({
  title: "",
  description: "",
  contentType: "",
  role: "",
  tools: "",
  skills: "",
  challenge: "",
  approach: "",
  outcomes: "",
  impactSummary: "",
  imageUrl: null,
  mediaKey: null,
  mediaName: null,
  mediaType: null,
  mediaSize: null,
  isConcept: 0,
  published: false,
});

const managedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read selected file"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read selected file"));
        return;
      }
      const separator = reader.result.indexOf(",");
      if (separator < 0) {
        reject(new Error("Could not encode selected file"));
        return;
      }
      resolve(reader.result.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });
}

function StudioButton({
  children,
  onClick,
  disabled,
  secondary = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  secondary?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${secondary ? "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[#b6bdd0]" : "bg-[var(--navy)] text-white hover:bg-[#1d2948]"}`}
    >
      {children}
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block text-[#747d90]">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          rows={rows}
          required={required}
          placeholder={placeholder}
          className="focus-ring w-full resize-y rounded-xl border border-[var(--line)] bg-[#fafbfe] p-3 text-sm outline-none placeholder:text-[#a2a8b7]"
        />
      ) : (
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[#fafbfe] p-3 text-sm outline-none placeholder:text-[#a2a8b7]"
        />
      )}
    </label>
  );
}

export default function PortfolioStudio() {
  const utils = trpc.useUtils();
  const capabilities = trpc.portfolio.capabilities.useQuery(undefined, {
    retry: false,
  });
  const projects = trpc.portfolio.projects.useQuery(undefined, {
    retry: false,
  });
  const createProject = trpc.portfolio.createProject.useMutation();
  const updateProject = trpc.portfolio.updateProject.useMutation();
  const deleteProject = trpc.portfolio.deleteProject.useMutation();
  const reorderProjects = trpc.portfolio.reorderProjects.useMutation();
  const uploadMedia = trpc.portfolio.uploadMedia.useMutation();
  const assist = trpc.portfolio.assist.useMutation();
  const [form, setForm] = useState<ProjectForm>(emptyProject);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [assistError, setAssistError] = useState("");
  const [assistDraft, setAssistDraft] = useState<AssistDraft | null>(null);
  const [aiReviewRequired, setAiReviewRequired] = useState(false);
  const [aiReviewed, setAiReviewed] = useState(false);

  const refreshProjects = async () => {
    await Promise.all([
      utils.portfolio.projects.invalidate(),
      utils.marketplace.myProfile.invalidate(),
      utils.marketplace.creators.invalidate(),
    ]);
  };

  const startNew = () => {
    setForm(emptyProject());
    setAssistDraft(null);
    setAssistError("");
    setAiReviewRequired(false);
    setAiReviewed(false);
    setUploadError("");
    setFormOpen(true);
  };

  const editProject = (project: NonNullable<typeof projects.data>[number]) => {
    setForm({
      id: project.id,
      title: project.title,
      description: project.description,
      contentType: project.contentType,
      role: project.role || "",
      tools: project.tools || "",
      skills: project.skills || "",
      challenge: project.challenge || "",
      approach: project.approach || "",
      outcomes: project.outcomes || "",
      impactSummary: project.impactSummary || "",
      imageUrl: project.imageUrl,
      mediaKey: project.mediaKey,
      mediaName: project.mediaName,
      mediaType: project.mediaType as ProjectForm["mediaType"],
      mediaSize: project.mediaSize,
      isConcept: project.isConcept,
      published: project.published === 1,
    });
    setAssistDraft(null);
    setAssistError("");
    setAiReviewRequired(false);
    setAiReviewed(false);
    setUploadError("");
    setFormOpen(true);
  };

  const save = async (publish: boolean) => {
    if (aiReviewRequired && !aiReviewed) {
      toast.error("Review the AI draft and confirm before saving");
      return;
    }
    if (
      form.title.trim().length < 2 ||
      !form.description.trim() ||
      !form.contentType.trim()
    ) {
      toast.error("Add a project title, category, and description first");
      return;
    }
    const projectData = {
      title: form.title.trim(),
      description: form.description.trim(),
      contentType: form.contentType.trim(),
      role: form.role.trim(),
      tools: form.tools.trim(),
      skills: form.skills.trim(),
      challenge: form.challenge.trim(),
      approach: form.approach.trim(),
      outcomes: form.outcomes.trim(),
      impactSummary: form.impactSummary.trim(),
      imageUrl: form.imageUrl,
      mediaKey: form.mediaKey,
      mediaName: form.mediaName,
      mediaType: form.mediaType,
      mediaSize: form.mediaSize,
      isConcept: form.isConcept,
    };
    setSaving(true);
    try {
      if (form.id) {
        await updateProject.mutateAsync({
          id: form.id,
          ...projectData,
          published: publish ? 1 : form.published ? 1 : 0,
        });
      } else {
        const created = await createProject.mutateAsync(projectData);
        setForm(current => ({ ...current, id: created.id }));
        if (publish) {
          await updateProject.mutateAsync({ id: created.id, published: 1 });
        }
      }
      await refreshProjects();
      setFormOpen(false);
      setForm(emptyProject());
      setAssistDraft(null);
      setAiReviewRequired(false);
      setAiReviewed(false);
      toast.success(
        publish ? "Project published" : "Project saved as a private draft"
      );
    } catch {
      toast.error(
        "Could not save the project. Your changes are still in this form."
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (
    project: NonNullable<typeof projects.data>[number]
  ) => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        published: project.published ? 0 : 1,
      });
      await refreshProjects();
      toast.success(
        project.published ? "Project moved to drafts" : "Project published"
      );
    } catch {
      toast.error("Could not update project visibility");
    }
  };

  const unpublishCurrentProject = async () => {
    if (!form.id) return;
    try {
      await updateProject.mutateAsync({ id: form.id, published: 0 });
      setForm(current => ({ ...current, published: false }));
      await refreshProjects();
      toast.success("Project moved to drafts");
    } catch {
      toast.error("Could not unpublish the project");
    }
  };

  const removeProject = async (
    project: NonNullable<typeof projects.data>[number]
  ) => {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`))
      return;
    try {
      await deleteProject.mutateAsync({ id: project.id });
      await refreshProjects();
      if (form.id === project.id) {
        setForm(emptyProject());
        setFormOpen(false);
      }
      toast.success("Project deleted");
    } catch {
      toast.error("Could not delete the project");
    }
  };

  const moveProject = async (index: number, offset: -1 | 1) => {
    const current = projects.data || [];
    const destination = index + offset;
    if (destination < 0 || destination >= current.length) return;
    const ids = current.map(project => project.id);
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    try {
      await reorderProjects.mutateAsync({ ids });
      await utils.portfolio.projects.invalidate();
    } catch {
      toast.error("Could not reorder projects");
    }
  };

  const uploadFile = async (file: File) => {
    const maxBytes = capabilities.data?.maxUploadBytes ?? 8 * 1024 * 1024;
    if (!managedImageTypes.includes(file.type)) {
      setUploadError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > maxBytes) {
      setUploadError("This image is larger than the 8 MB upload limit.");
      return;
    }
    setUploadError("");
    try {
      const dataBase64 = await fileToBase64(file);
      const stored = await uploadMedia.mutateAsync({
        fileName: file.name,
        mimeType: file.type as ProjectForm["mediaType"] & string,
        size: file.size,
        dataBase64,
      });
      setForm(current => ({
        ...current,
        imageUrl: stored.url,
        mediaKey: stored.key,
        mediaName: stored.fileName,
        mediaType: stored.mimeType,
        mediaSize: stored.size,
      }));
      toast.success("Image uploaded. Save the project to attach it.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Upload failed. Check storage setup and retry."
      );
    }
  };

  const generateDraft = async () => {
    setAssistError("");
    try {
      const draft = await assist.mutateAsync({
        title: form.title,
        category: form.contentType,
        role: form.role,
        tools: form.tools,
        skills: form.skills,
        challenge: form.challenge,
        approach: form.approach,
        outcomes: form.outcomes,
        sourceNotes: [
          form.description,
          form.challenge,
          form.approach,
          form.outcomes,
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      setAssistDraft(draft);
    } catch (error) {
      setAssistError(
        error instanceof Error
          ? error.message
          : "AI assistance failed. Retry or continue editing manually."
      );
    }
  };

  const applyDraft = () => {
    if (!assistDraft) return;
    setForm(current => ({
      ...current,
      title: assistDraft.title,
      description: assistDraft.description,
      challenge: assistDraft.challenge,
      approach: assistDraft.approach,
      outcomes: assistDraft.outcomes,
      impactSummary: assistDraft.impactSummary,
      skills: assistDraft.skills.join(", "),
    }));
    setAssistDraft(null);
    setAiReviewRequired(true);
    setAiReviewed(false);
    toast.info("Draft applied. Review and edit each field before saving.");
  };

  if (capabilities.isLoading || projects.isLoading) {
    return (
      <p
        role="status"
        className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#687087]"
      >
        Loading Portfolio Studio…
      </p>
    );
  }
  if (capabilities.error) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-red-700"
      >
        Could not check Portfolio Studio services. Refresh to retry.
      </p>
    );
  }
  if (projects.error) {
    const noProfile = projects.error.data?.code === "PRECONDITION_FAILED";
    return (
      <section className="mx-auto max-w-[1000px] px-5 py-12 lg:px-10">
        <div className="surface p-8">
          <h1 className="serif text-4xl">Portfolio Studio</h1>
          <p role="alert" className="mt-4 text-sm leading-6 text-[#687087]">
            {noProfile
              ? "Create and save your creator profile before adding portfolio projects."
              : "Could not load your projects. Refresh to retry."}
          </p>
        </div>
      </section>
    );
  }

  const projectList = projects.data || [];
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="eyebrow mb-3">
            Creator workspace / portfolio studio
          </div>
          <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
            Make the work <i>legible.</i>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#687087]">
            Shape real project details into a case study. Drafts stay private
            until you publish them.
          </p>
        </div>
        <StudioButton onClick={startNew}>
          <Plus size={16} /> New project
        </StudioButton>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="surface flex items-start gap-3 p-4">
          <Sparkles
            size={17}
            className="mt-0.5 shrink-0 text-[var(--indigo)]"
          />
          <div>
            <div className="text-sm font-bold">AI portfolio assist</div>
            <p className="mt-1 text-xs leading-5 text-[#687087]">
              {capabilities.data?.aiConfigured
                ? "Configured. Suggestions remain drafts for your review."
                : "Unavailable until MANUS_API_URL and MANUS_API_KEY are configured on the server. You can still edit projects manually."}
            </p>
          </div>
        </div>
        <div className="surface flex items-start gap-3 p-4">
          <Upload size={17} className="mt-0.5 shrink-0 text-[var(--indigo)]" />
          <div>
            <div className="text-sm font-bold">Managed media storage</div>
            <p className="mt-1 text-xs leading-5 text-[#687087]">
              {capabilities.data?.uploadsConfigured
                ? "Configured. Images upload through managed storage and attach when you save a project."
                : "Unavailable until MANUS_API_URL and MANUS_API_KEY are configured on the server. Project text can be saved without media."}
            </p>
          </div>
        </div>
      </div>

      {projectList.length === 0 ? (
        <div className="surface mt-8 flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
          <ImagePlus size={30} className="text-[#8991a2]" />
          <h2 className="mt-4 text-lg font-bold">No portfolio projects yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#687087]">
            Start with the work you actually did. Add context and outcomes you
            can stand behind, then publish when it is ready.
          </p>
          <StudioButton onClick={startNew}>
            <Plus size={15} /> Create a project
          </StudioButton>
        </div>
      ) : (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Your projects{" "}
              <span className="ml-1 font-normal text-[#8991a2]">
                {projectList.length}
              </span>
            </h2>
            <span className="text-xs text-[#8991a2]">
              Public profiles show published projects only
            </span>
          </div>
          <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {projectList.map((project, index) => (
              <article
                key={project.id}
                className="flex flex-wrap items-center gap-4 py-4"
              >
                <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f0f2f7]">
                  {project.imageUrl ? (
                    <img
                      src={project.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus size={19} className="text-[#8991a2]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{project.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${project.published ? "bg-[var(--lime)] text-[var(--navy)]" : "bg-[#f0f2f7] text-[#687087]"}`}
                    >
                      {project.published ? "Published" : "Private draft"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[#687087]">
                    {project.description}
                  </p>
                  <div className="mt-2 text-xs text-[#8991a2]">
                    {project.contentType}
                    {project.mediaName
                      ? ` · ${project.mediaName}`
                      : " · No media"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    title="Move up"
                    aria-label={`Move ${project.title} up`}
                    disabled={index === 0 || reorderProjects.isPending}
                    onClick={() => void moveProject(index, -1)}
                    className="rounded-full p-2 text-[#687087] hover:bg-[#f0f2f7] disabled:opacity-30"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    title="Move down"
                    aria-label={`Move ${project.title} down`}
                    disabled={
                      index === projectList.length - 1 ||
                      reorderProjects.isPending
                    }
                    onClick={() => void moveProject(index, 1)}
                    className="rounded-full p-2 text-[#687087] hover:bg-[#f0f2f7] disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    title="Edit project"
                    aria-label={`Edit ${project.title}`}
                    onClick={() => editProject(project)}
                    className="rounded-full p-2 text-[#687087] hover:bg-[#f0f2f7]"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    title={
                      project.published
                        ? "Unpublish project"
                        : "Publish project"
                    }
                    onClick={() => void togglePublished(project)}
                    className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:bg-[#f7f8fb]"
                  >
                    {project.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    title="Delete project"
                    aria-label={`Delete ${project.title}`}
                    onClick={() => void removeProject(project)}
                    className="rounded-full p-2 text-[#9a5360] hover:bg-[#fbf0f1]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[94vh] w-[calc(100%-1.5rem)] max-w-[1180px] gap-0 overflow-y-auto rounded-2xl bg-white p-0"
        >
          <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-7">
            <div>
              <div className="eyebrow">
                Portfolio project / {form.id ? "edit" : "new"}
              </div>
              <DialogTitle className="mt-1 text-xl font-black">
                {form.id ? "Refine the case study" : "Add a project"}
              </DialogTitle>
            </div>
            <button
              aria-label="Close project editor"
              onClick={() => setFormOpen(false)}
              className="rounded-full p-2 text-[#687087] hover:bg-[#f0f2f7]"
            >
              <X size={19} />
            </button>
          </header>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
            <form
              className="max-h-[calc(100vh-120px)] space-y-5 overflow-y-auto p-5 sm:p-7"
              onSubmit={event => {
                event.preventDefault();
                void save(form.published);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Project title"
                  value={form.title}
                  onChange={value =>
                    setForm(current => ({ ...current, title: value }))
                  }
                  required
                  placeholder="What was the project called?"
                />
                <TextField
                  label="Category"
                  value={form.contentType}
                  onChange={value =>
                    setForm(current => ({ ...current, contentType: value }))
                  }
                  required
                  placeholder="Campaign, film, identity…"
                />
                <TextField
                  label="Your role"
                  value={form.role}
                  onChange={value =>
                    setForm(current => ({ ...current, role: value }))
                  }
                  placeholder="What did you own?"
                />
                <TextField
                  label="Tools"
                  value={form.tools}
                  onChange={value =>
                    setForm(current => ({ ...current, tools: value }))
                  }
                  placeholder="Separate with commas"
                />
                <div className="sm:col-span-2">
                  <TextField
                    label="Skills demonstrated"
                    value={form.skills}
                    onChange={value =>
                      setForm(current => ({ ...current, skills: value }))
                    }
                    placeholder="Separate with commas"
                  />
                </div>
              </div>
              <TextField
                label="Project description"
                value={form.description}
                onChange={value =>
                  setForm(current => ({ ...current, description: value }))
                }
                multiline
                rows={4}
                required
                placeholder="What did you make, for whom, and what was the context? Use only details you can verify."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Challenge"
                  value={form.challenge}
                  onChange={value =>
                    setForm(current => ({ ...current, challenge: value }))
                  }
                  multiline
                  placeholder="What needed to be solved?"
                />
                <TextField
                  label="Approach"
                  value={form.approach}
                  onChange={value =>
                    setForm(current => ({ ...current, approach: value }))
                  }
                  multiline
                  placeholder="How did you approach the work?"
                />
                <TextField
                  label="Outcomes"
                  value={form.outcomes}
                  onChange={value =>
                    setForm(current => ({ ...current, outcomes: value }))
                  }
                  multiline
                  placeholder="What happened? Leave blank if not known."
                />
                <TextField
                  label="Impact summary"
                  value={form.impactSummary}
                  onChange={value =>
                    setForm(current => ({ ...current, impactSummary: value }))
                  }
                  multiline
                  placeholder="A concise, factual impact statement."
                />
              </div>

              <div className="rounded-xl border border-[var(--line)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">Project media</div>
                    <p className="mt-1 text-xs text-[#687087]">
                      JPEG, PNG, WebP, or GIF. Maximum 8 MB.
                    </p>
                  </div>
                  <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold ${capabilities.data?.uploadsConfigured ? "hover:bg-[#f7f8fb]" : "cursor-not-allowed opacity-50"}`}
                  >
                    <Upload size={15} />{" "}
                    {uploadMedia.isPending ? "Uploading…" : "Choose image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={
                        !capabilities.data?.uploadsConfigured ||
                        uploadMedia.isPending
                      }
                      onChange={event => {
                        const file = event.currentTarget.files?.[0];
                        if (file) void uploadFile(file);
                        event.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
                {!capabilities.data?.uploadsConfigured && (
                  <p className="mt-3 text-xs leading-5 text-[#8a6570]">
                    Managed storage is not configured. You can still save
                    project text without media.
                  </p>
                )}
                {uploadError && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {uploadError}
                  </p>
                )}
                {form.imageUrl && (
                  <div className="mt-4 flex items-center gap-3">
                    <img
                      src={form.imageUrl}
                      alt="Selected project media preview"
                      className="h-16 w-24 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {form.mediaName || "Project image"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm(current => ({
                          ...current,
                          imageUrl: null,
                          mediaKey: null,
                          mediaName: null,
                          mediaType: null,
                          mediaSize: null,
                        }))
                      }
                      className="rounded-full p-2 text-[#687087] hover:bg-[#f0f2f7]"
                      aria-label="Remove project image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {form.mediaKey && (
                  <p className="mt-2 text-xs text-[#687087]">
                    Uploaded to managed storage. Save the project to attach its
                    metadata.
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-[#f7f8fb] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Sparkles size={15} /> AI writing assistant
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#687087]">
                      Uses the project information above. Suggestions are
                      drafts; review before applying and saving.
                    </p>
                  </div>
                  <StudioButton
                    secondary
                    disabled={
                      !capabilities.data?.aiConfigured ||
                      assist.isPending ||
                      [
                        form.description,
                        form.challenge,
                        form.approach,
                        form.outcomes,
                      ]
                        .join(" ")
                        .trim().length < 10
                    }
                    onClick={() => void generateDraft()}
                  >
                    <Sparkles size={15} />{" "}
                    {assist.isPending ? "Drafting…" : "Generate draft"}
                  </StudioButton>
                </div>
                {!capabilities.data?.aiConfigured && (
                  <p className="mt-3 text-xs text-[#8a6570]">
                    AI is not configured. Continue with the manual editor above.
                  </p>
                )}
                {assistError && (
                  <div
                    role="alert"
                    className="mt-3 rounded-lg bg-white p-3 text-sm text-red-700"
                  >
                    <p>{assistError}</p>
                    <button
                      type="button"
                      onClick={() => void generateDraft()}
                      disabled={
                        assist.isPending || !capabilities.data?.aiConfigured
                      }
                      className="mt-2 font-bold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {assistDraft && (
                  <div className="mt-4 space-y-3 rounded-lg border border-[var(--line)] bg-white p-4">
                    <div className="text-xs font-bold uppercase text-[#687087]">
                      AI-generated draft · review before use
                    </div>
                    <p className="font-bold">{assistDraft.title}</p>
                    <p className="text-sm leading-6 text-[#687087]">
                      {assistDraft.description}
                    </p>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <p>
                        <strong>Challenge:</strong> {assistDraft.challenge}
                      </p>
                      <p>
                        <strong>Approach:</strong> {assistDraft.approach}
                      </p>
                      <p>
                        <strong>Outcomes:</strong> {assistDraft.outcomes}
                      </p>
                      <p>
                        <strong>Impact:</strong> {assistDraft.impactSummary}
                      </p>
                      <p className="sm:col-span-2">
                        <strong>Skills:</strong> {assistDraft.skills.join(", ")}
                      </p>
                    </div>
                    <StudioButton onClick={applyDraft}>
                      Apply draft to editable fields
                    </StudioButton>
                  </div>
                )}
              </div>

              {aiReviewRequired && (
                <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-4 text-sm leading-6">
                  <input
                    type="checkbox"
                    checked={aiReviewed}
                    onChange={event => setAiReviewed(event.target.checked)}
                    className="mt-1 accent-[var(--navy)]"
                  />
                  <span>
                    I reviewed the applied AI text and corrected any unsupported
                    details before saving.
                  </span>
                </label>
              )}

              <label className="flex items-center gap-2 text-sm text-[#687087]">
                <input
                  type="checkbox"
                  checked={form.isConcept === 1}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      isConcept: event.target.checked ? 1 : 0,
                    }))
                  }
                  className="accent-[var(--navy)]"
                />{" "}
                Mark as concept work
              </label>
              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-4">
                <StudioButton secondary onClick={() => setFormOpen(false)}>
                  Cancel
                </StudioButton>
                {form.id && (
                  <StudioButton
                    secondary
                    onClick={() => void save(false)}
                    disabled={saving || (aiReviewRequired && !aiReviewed)}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </StudioButton>
                )}
                {!form.id && (
                  <StudioButton
                    secondary
                    onClick={() => void save(false)}
                    disabled={saving || (aiReviewRequired && !aiReviewed)}
                  >
                    {saving ? "Saving…" : "Save private draft"}
                  </StudioButton>
                )}
                {form.published ? (
                  <StudioButton
                    secondary
                    onClick={() => void unpublishCurrentProject()}
                    disabled={saving || (aiReviewRequired && !aiReviewed)}
                  >
                    Unpublish
                  </StudioButton>
                ) : (
                  <StudioButton
                    onClick={() => void save(true)}
                    disabled={saving || (aiReviewRequired && !aiReviewed)}
                  >
                    {saving ? "Saving…" : "Publish project"}
                  </StudioButton>
                )}
              </div>
            </form>

            <aside className="border-t border-[var(--line)] bg-[#f7f8fb] p-5 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:border-l lg:border-t-0">
              <div className="eyebrow">
                Preview / {form.published ? "public" : "private draft"}
              </div>
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt=""
                  className="mt-4 aspect-[4/3] w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mt-4 flex aspect-[4/3] items-center justify-center rounded-xl bg-[#e9ecf2] text-[#8991a2]">
                  <ImagePlus size={26} />
                </div>
              )}
              <div className="mt-4">
                <div className="text-xs font-semibold text-[#8991a2]">
                  {form.contentType || "Project category"}
                </div>
                <h3 className="mt-1 text-xl font-black">
                  {form.title || "Project title"}
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#687087]">
                  {form.description ||
                    "Your project description will appear here."}
                </p>
              </div>
              {form.role && (
                <p className="mt-4 text-sm">
                  <strong>Role:</strong> {form.role}
                </p>
              )}
              {form.challenge && (
                <p className="mt-4 text-sm leading-6">
                  <strong>Challenge</strong>
                  <br />
                  {form.challenge}
                </p>
              )}
              {form.approach && (
                <p className="mt-4 text-sm leading-6">
                  <strong>Approach</strong>
                  <br />
                  {form.approach}
                </p>
              )}
              {form.outcomes && (
                <p className="mt-4 text-sm leading-6">
                  <strong>Outcomes</strong>
                  <br />
                  {form.outcomes}
                </p>
              )}
              {form.impactSummary && (
                <p className="mt-4 text-sm leading-6">
                  <strong>Impact</strong>
                  <br />
                  {form.impactSummary}
                </p>
              )}
              {form.skills && (
                <p className="mt-4 text-xs leading-5 text-[#687087]">
                  <strong>Skills:</strong> {form.skills}
                </p>
              )}
              {form.tools && (
                <p className="mt-2 text-xs leading-5 text-[#687087]">
                  <strong>Tools:</strong> {form.tools}
                </p>
              )}
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
