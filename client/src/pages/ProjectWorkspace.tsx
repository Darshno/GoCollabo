import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Clapperboard,
  FileText,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DemoTaskStatus = "todo" | "in_progress" | "done";
type DemoTaskPriority = "high" | "medium" | "low";
type DemoTaskSource = "brief" | "manual" | "ai_copilot";
type DemoDeliverableStatus = "pending_review" | "changes_requested" | "approved";

type DemoTask = {
  id: string;
  title: string;
  description: string;
  status: DemoTaskStatus;
  priority: DemoTaskPriority;
  deadline?: string;
  source: DemoTaskSource;
};

type DemoDeliverable = {
  id: string;
  version: number;
  title: string;
  notes: string;
  assetUrl?: string;
  submittedAt: string;
  status: DemoDeliverableStatus;
  feedback?: string;
  reviewedAt?: string;
};

type DemoProject = {
  id: number;
  title: string;
  status: "active" | "in_review" | "completed";
  brandName: string;
  brandId: string;
  creatorName: string;
  creatorUserId: string;
  brief: {
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
    workMode: string;
    licensing: string;
  };
  tasks: DemoTask[];
  deliverables: DemoDeliverable[];
};

// Color tokens matching GoCollabo design system
// #0B0D12 (Obsidian), #F8F7F2 (Alabaster), #C8F568 (Lime), #8A8D98 (Muted Slate)

export function ProjectWorkspace({
  projectId,
  isLive,
  currentUserId,
  userAccountType,
}: {
  projectId: number;
  isLive: boolean;
  currentUserId?: string;
  userAccountType?: "creator" | "brand";
}) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Queries and mutations
  const projectQuery = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: isLive, retry: false }
  );
  const capabilitiesQuery = trpc.projects.capabilities.useQuery(undefined, {
    enabled: isLive,
    retry: false,
  });

  const updateTaskMutation = trpc.projects.updateTask.useMutation({
    onSuccess: () => utils.projects.get.invalidate({ id: projectId }),
  });
  const addTasksMutation = trpc.projects.addTasks.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      toast.success("Tasks added to project checklist");
    },
  });
  const copilotMutation = trpc.projects.copilotFeedback.useMutation();
  const submitDeliverableMutation = trpc.projects.submitDeliverable.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      toast.success("Deliverable submitted for review");
    },
  });
  const reviewDeliverableMutation = trpc.projects.reviewDeliverable.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      toast.success("Review submitted");
    },
  });

  // Local state for interactive tools
  const [activeTab, setActiveTab] = useState<"tasks" | "deliverables" | "brief">("tasks");
  const [taskFilter, setTaskFilter] = useState<"all" | "todo" | "done">("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");

  // AI Copilot state
  const [feedbackInput, setFeedbackInput] = useState("");
  const [copilotError, setCopilotError] = useState("");
  const [copilotDraft, setCopilotDraft] = useState<{
    summary: string;
    creativeDirection: string;
    suggestedTasks: Array<{ title: string; description: string; priority: "high" | "medium" | "low"; selected?: boolean }>;
  } | null>(null);

  // Deliverable submission state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [deliverableTitle, setDeliverableTitle] = useState("");
  const [deliverableNotes, setDeliverableNotes] = useState("");
  const [deliverableUrl, setDeliverableUrl] = useState("");

  // Review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");

  // Demo fallback state if offline or demo mode
  const [demoProject, setDemoProject] = useState<DemoProject>({
    id: projectId,
    title: "Brand Launch Film & Social Assets",
    status: "active",
    brandName: "Aether Skincare",
    brandId: "brand-demo",
    creatorName: "Mara Chen",
    creatorUserId: "creator-demo",
    brief: {
      title: "Brand Launch Film & Social Assets",
      objective: "Introduce high-performance sustainable skincare to conscious consumers.",
      contentType: "Brand film + Social Cutdowns",
      style: "Tactile, organic, cinematic lighting",
      audience: "Conscious consumers, Gen Z & Millennials",
      platform: "Instagram, TikTok, Web",
      duration: "30–60 sec",
      aspectRatio: "16:9 + 9:16",
      deliverables: 3,
      budget: "₹4,50,000",
      deadline: "Nov 25, 2026",
      location: "Remote",
      workMode: "remote",
      licensing: "Full commercial digital rights with creator credit",
    },
    tasks: [
      {
        id: "t1",
        title: "Creative brief alignment & visual direction pass",
        description: "Align on lighting moodboard, color palette, and packaging focus.",
        status: "done",
        priority: "high",
        source: "brief",
      },
      {
        id: "t2",
        title: "Draft cut production (16:9 hero & 9:16 vertical)",
        description: "Generate and edit initial cuts using tactile textures.",
        status: "in_progress",
        priority: "high",
        deadline: "Nov 20, 2026",
        source: "brief",
      },
      {
        id: "t3",
        title: "Client review pass & AI Copilot revisions",
        description: "Gather feedback and formulate targeted revision tasks.",
        status: "todo",
        priority: "medium",
        source: "brief",
      },
    ],
    deliverables: [
      {
        id: "d1",
        version: 1,
        title: "Initial Hero Cut - Draft v1",
        notes: "First cut exploring organic lighting transitions and product textures.",
        assetUrl: "https://example.com/assets/cut-v1.mp4",
        submittedAt: "2026-10-10T14:00:00.000Z",
        status: "changes_requested",
        feedback: "The lighting is gorgeous. Can we quicken the pacing between 0:10-0:20 and swap the background audio for an ambient synth track?",
      },
    ],
  });

  const project = isLive && projectQuery.data ? projectQuery.data : demoProject;

  const isBrandParticipant = isLive
    ? currentUserId === project.brandId
    : userAccountType === "brand";
  const isCreatorParticipant = isLive
    ? currentUserId === (project as any).creatorUserId
    : userAccountType === "creator";

  // Task actions
  const toggleTaskStatus = (taskId: string, currentStatus: "todo" | "in_progress" | "done") => {
    const nextStatus = currentStatus === "done" ? "todo" : currentStatus === "todo" ? "in_progress" : "done";
    if (isLive) {
      updateTaskMutation.mutate({
        projectId,
        taskId,
        status: nextStatus,
      });
    } else {
      setDemoProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => (t.id === taskId ? { ...t, status: nextStatus } : t)),
      }));
    }
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const task = {
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      priority: newTaskPriority,
      source: "manual" as const,
    };
    if (isLive) {
      addTasksMutation.mutate({
        projectId,
        tasks: [task],
      });
    } else {
      setDemoProject(prev => ({
        ...prev,
        tasks: [
          ...prev.tasks,
          {
            id: `t-${Date.now()}`,
            title: task.title,
            description: task.description || "",
            status: "todo" as const,
            priority: task.priority,
            source: "manual" as const,
          },
        ],
      }));
      toast.success("Task added");
    }
    setNewTaskTitle("");
    setNewTaskDesc("");
    setShowAddTask(false);
  };

  // AI Copilot Actions
  const handleAnalyzeFeedback = async () => {
    if (feedbackInput.trim().length < 5) {
      toast.error("Enter at least 5 characters of feedback to analyze");
      return;
    }
    setCopilotError("");
    setCopilotDraft(null);

    try {
      if (isLive) {
        const result = await copilotMutation.mutateAsync({
          projectId,
          feedback: feedbackInput.trim(),
        });
        setCopilotDraft({
          summary: result.summary,
          creativeDirection: result.creativeDirection,
          suggestedTasks: result.suggestedTasks.map(t => ({ ...t, selected: true })),
        });
      } else {
        // Fallback for demo preview
        setCopilotDraft({
          summary: "Client requests faster mid-video pacing and replacement of background audio with an ambient synth track.",
          creativeDirection: "Trim 1-2 filler frames during the texture demonstration at 0:12 to pick up tempo; audition warm synth pads with soft attack.",
          suggestedTasks: [
            {
              title: "Quicken mid-segment pacing (0:10–0:20)",
              description: "Tighten product texture cuts to enhance dynamic rhythm.",
              priority: "high",
              selected: true,
            },
            {
              title: "Replace soundtrack with ambient synth track",
              description: "Source warm, atmospheric synth audio and mix levels under dialogue.",
              priority: "high",
              selected: true,
            },
          ],
        });
      }
      toast.success("Copilot generated revision tasks. Review before adding.");
    } catch (err: any) {
      const msg = err?.message || "Failed to analyze feedback with AI Copilot.";
      setCopilotError(msg);
      toast.error(msg);
    }
  };

  const handleApplyCopilotTasks = () => {
    if (!copilotDraft) return;
    const selected = copilotDraft.suggestedTasks.filter(t => t.selected);
    if (selected.length === 0) {
      toast.error("Select at least one task to add");
      return;
    }

    if (isLive) {
      addTasksMutation.mutate({
        projectId,
        tasks: selected.map(t => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          source: "ai_copilot" as const,
        })),
      });
    } else {
      setDemoProject(prev => ({
        ...prev,
        tasks: [
          ...prev.tasks,
          ...selected.map(t => ({
            id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: "todo" as const,
            source: "ai_copilot" as const,
          })),
        ],
      }));
      toast.success(`${selected.length} revision tasks added to checklist`);
    }

    setCopilotDraft(null);
    setFeedbackInput("");
  };

  // Deliverable Actions
  const handleSubmitDeliverable = () => {
    if (!deliverableTitle.trim()) {
      toast.error("Provide a deliverable title");
      return;
    }
    if (isLive) {
      submitDeliverableMutation.mutate({
        projectId,
        title: deliverableTitle.trim(),
        notes: deliverableNotes.trim(),
        assetUrl: deliverableUrl.trim() || undefined,
      });
    } else {
      setDemoProject(prev => ({
        ...prev,
        status: "in_review" as const,
        deliverables: [
          ...prev.deliverables,
          {
            id: `d-${Date.now()}`,
            version: prev.deliverables.length + 1,
            title: deliverableTitle.trim(),
            notes: deliverableNotes.trim(),
            assetUrl: deliverableUrl.trim() || undefined,
            submittedAt: new Date().toISOString(),
            status: "pending_review" as const,
          },
        ],
      }));
      toast.success("Deliverable submitted");
    }
    setShowSubmitModal(false);
    setDeliverableTitle("");
    setDeliverableNotes("");
    setDeliverableUrl("");
  };

  const handleReviewDeliverable = (deliverableId: string, status: "approved" | "changes_requested") => {
    if (status === "changes_requested" && !reviewFeedback.trim()) {
      toast.error("Please provide revision feedback when requesting changes");
      return;
    }
    if (isLive) {
      reviewDeliverableMutation.mutate({
        projectId,
        deliverableId,
        status,
        feedback: reviewFeedback.trim() || undefined,
      });
    } else {
      setDemoProject(prev => ({
        ...prev,
        status: status === "approved" ? "completed" : "active",
        deliverables: prev.deliverables.map(d =>
          d.id === deliverableId
            ? { ...d, status, feedback: reviewFeedback.trim() || undefined, reviewedAt: new Date().toISOString() }
            : d
        ),
      }));
      toast.success(status === "approved" ? "Deliverable approved!" : "Revision feedback sent");
    }
    setReviewingId(null);
    setReviewFeedback("");
  };

  if (isLive && projectQuery.isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 py-16 text-center">
        <p className="text-sm text-[#8A8D98]">Loading project workspace…</p>
      </div>
    );
  }

  if (isLive && projectQuery.error) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 py-16 text-center">
        <div className="surface mx-auto max-w-md p-8">
          <p role="alert" className="text-sm font-bold text-red-700">
            {projectQuery.error.message || "Could not load project workspace."}
          </p>
          <Button className="mt-5" onClick={() => setLocation("/requests")}>
            Back to requests
          </Button>
        </div>
      </div>
    );
  }

  const completedTasksCount = project.tasks.filter(t => t.status === "done").length;
  const progressPercent = project.tasks.length > 0 ? Math.round((completedTasksCount / project.tasks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10">
      {/* Top breadcrumb navigation */}
      <button
        onClick={() => setLocation("/projects")}
        className="mb-6 flex items-center gap-1.5 text-xs font-bold text-[#8A8D98] hover:text-[#0B0D12]"
      >
        <ChevronLeft size={14} /> Back to projects
      </button>

      {/* Project Header Banner */}
      <div className="surface p-6 lg:p-8 rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B0D12] text-[var(--lime)] text-[10px] font-black">
                ✦
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#8A8D98]">
                Shared Workspace
              </span>
              <span className="rounded-full bg-[#f0f2f7] px-2.5 py-0.5 text-xs font-semibold text-[#0B0D12]">
                {project.status === "active" ? "In Production" : project.status === "in_review" ? "Awaiting Review" : "Completed"}
              </span>
            </div>
            <h1 className="serif text-3xl font-black lg:text-5xl text-[#0B0D12]">
              {project.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#8A8D98]">
              <span>Brand: <strong className="text-[#0B0D12]">{project.brandName}</strong></span>
              <span>•</span>
              <span>Creator: <strong className="text-[#0B0D12]">{project.creatorName}</strong></span>
              <span>•</span>
              <span>Deadline: <strong className="text-[#0B0D12]">{project.brief.deadline}</strong></span>
            </div>
          </div>

          {/* Quick Stats & Progress */}
          <div className="flex items-center gap-6 border-l border-[var(--line)] pl-6 mobile-stack">
            <div>
              <div className="text-xs font-semibold text-[#8A8D98]">Production Progress</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#0B0D12]">{progressPercent}%</span>
                <span className="text-xs text-[#8A8D98]">({completedTasksCount}/{project.tasks.length} tasks)</span>
              </div>
              <div className="mt-2 h-1.5 w-32 rounded-full bg-[#e8ebf2] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--lime)] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-8 flex gap-2 border-b border-[var(--line)] pb-3">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "tasks" ? "bg-[#0B0D12] text-white" : "text-[#8A8D98] hover:text-[#0B0D12]"
            }`}
          >
            Tasks & Milestones ({project.tasks.length})
          </button>
          <button
            onClick={() => setActiveTab("deliverables")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "deliverables" ? "bg-[#0B0D12] text-white" : "text-[#8A8D98] hover:text-[#0B0D12]"
            }`}
          >
            Deliverables & Versions ({project.deliverables.length})
          </button>
          <button
            onClick={() => setActiveTab("brief")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "brief" ? "bg-[#0B0D12] text-white" : "text-[#8A8D98] hover:text-[#0B0D12]"
            }`}
          >
            Brief Specifications
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left Column: Tasks / Deliverables / Brief */}
        <div className="space-y-6">
          {activeTab === "tasks" && (
            <div className="surface p-6 rounded-3xl">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#0B0D12]">Production Checklist</h2>
                  <p className="text-xs text-[#8A8D98]">Milestones and action items agreed upon by both partners</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-[#f0f2f7] p-0.5 text-xs">
                    {(["all", "todo", "done"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setTaskFilter(f)}
                        className={`rounded-md px-2.5 py-1 font-semibold uppercase text-[10px] ${
                          taskFilter === f ? "bg-white text-[#0B0D12] shadow-sm" : "text-[#8A8D98]"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddTask(!showAddTask)}
                    className="text-xs font-bold"
                  >
                    <Plus size={14} /> Add task
                  </Button>
                </div>
              </div>

              {/* Add manual task inline form */}
              {showAddTask && (
                <div className="mb-6 rounded-2xl border border-[var(--line)] bg-[#fafbfe] p-4 space-y-3">
                  <div className="font-bold text-xs text-[#0B0D12]">New Checklist Item</div>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Task title (e.g. Color grade second camera angle)"
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    placeholder="Optional details or instructions..."
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#8A8D98]">
                      <span>Priority:</span>
                      <select
                        value={newTaskPriority}
                        onChange={e => setNewTaskPriority(e.target.value as any)}
                        className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowAddTask(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleCreateTask}>
                        Save task
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="divide-y divide-[var(--line)]">
                {project.tasks
                  .filter(t => (taskFilter === "all" ? true : taskFilter === "done" ? t.status === "done" : t.status !== "done"))
                  .map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 py-3.5 group hover:bg-[#fbfbfa] rounded-xl px-2 transition-colors"
                    >
                      <button
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className="mt-0.5 text-[#8A8D98] hover:text-[#0B0D12] transition-colors"
                        title={task.status === "done" ? "Mark incomplete" : "Mark complete"}
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 size={18} className="text-green-600" />
                        ) : task.status === "in_progress" ? (
                          <Clock size={18} className="text-amber-500" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              task.status === "done" ? "line-through text-[#8A8D98]" : "text-[#0B0D12]"
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.source === "ai_copilot" && (
                            <span className="rounded-md bg-[#f4faec] px-1.5 py-0.5 text-[10px] font-bold text-[#2b5911] border border-[#c8f568]/50 flex items-center gap-1">
                              ✦ Copilot
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              task.priority === "high"
                                ? "bg-red-50 text-red-700"
                                : task.priority === "medium"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="mt-1 text-xs text-[#8A8D98] leading-relaxed">{task.description}</p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[11px] font-medium text-[#8A8D98]">
                          {task.status === "done" ? "Done" : task.status === "in_progress" ? "In Progress" : "To do"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === "deliverables" && (
            <div className="surface p-6 rounded-3xl space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0B0D12]">Deliverables & Review History</h2>
                  <p className="text-xs text-[#8A8D98]">Submit drafts, review versions, and log revision feedback</p>
                </div>
                {/* Creator submit action */}
                <Button onClick={() => setShowSubmitModal(true)} size="sm" className="text-xs font-bold">
                  <Plus size={14} /> Submit new version
                </Button>
              </div>

              {/* Submit deliverable modal / inline form */}
              {showSubmitModal && (
                <div className="rounded-2xl border border-[var(--line)] bg-[#fafbfe] p-5 space-y-4">
                  <div className="font-bold text-sm text-[#0B0D12]">Submit Deliverable Draft</div>
                  <input
                    type="text"
                    value={deliverableTitle}
                    onChange={e => setDeliverableTitle(e.target.value)}
                    placeholder="e.g. Hero Cut - Draft v2"
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-xs focus:outline-none"
                  />
                  <textarea
                    value={deliverableNotes}
                    onChange={e => setDeliverableNotes(e.target.value)}
                    placeholder="Notes for the brand reviewer (changes made, areas to inspect)..."
                    rows={3}
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-xs focus:outline-none"
                  />
                  <input
                    type="url"
                    value={deliverableUrl}
                    onChange={e => setDeliverableUrl(e.target.value)}
                    placeholder="Asset or video preview URL (optional)"
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-xs focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowSubmitModal(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSubmitDeliverable}>
                      Submit for review
                    </Button>
                  </div>
                </div>
              )}

              {/* Deliverables List */}
              {project.deliverables.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-[#8A8D98]">
                  <FileText size={24} className="mx-auto mb-2 text-[#8A8D98]" />
                  <p className="text-xs font-semibold">No deliverables submitted yet.</p>
                  <p className="text-[11px] mt-1">Creator can submit initial draft cuts when ready for review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {project.deliverables.map(deliv => (
                    <div key={deliv.id} className="rounded-2xl border border-[var(--line)] p-5 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#0B0D12]">{deliv.title}</span>
                            <span className="rounded-full bg-[#f0f2f7] px-2 py-0.5 text-[10px] font-bold">
                              Version {deliv.version}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                deliv.status === "approved"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : deliv.status === "changes_requested"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {deliv.status === "approved" ? "Approved" : deliv.status === "changes_requested" ? "Changes Requested" : "Awaiting Review"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#8A8D98]">{deliv.notes}</p>
                        </div>
                        {deliv.assetUrl && (
                          <a
                            href={deliv.assetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[#0B0D12] hover:underline flex items-center gap-1"
                          >
                            View asset <ArrowUpRight size={12} />
                          </a>
                        )}
                      </div>

                      {/* Display feedback if changes requested */}
                      {deliv.feedback && (
                        <div className="rounded-xl bg-[#fafbfe] p-3 border border-[var(--line)] text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#0B0D12] flex items-center gap-1.5">
                              <MessageSquare size={13} /> Brand Feedback:
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[11px] h-6 px-2 text-[#0B0D12] font-bold"
                              onClick={() => {
                                setFeedbackInput(deliv.feedback || "");
                                setActiveTab("tasks");
                              }}
                            >
                              <Sparkles size={11} className="mr-1 text-[var(--lime)]" /> Send to Copilot
                            </Button>
                          </div>
                          <p className="text-[#4f576b] italic">"{deliv.feedback}"</p>
                        </div>
                      )}

                      {/* Brand review buttons */}
                      {deliv.status === "pending_review" && (
                        <div className="border-t border-[var(--line)] pt-3 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs text-[#8A8D98]">Brand review action:</span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReviewingId(deliv.id);
                                setReviewFeedback("");
                              }}
                              className="text-xs"
                            >
                              Request changes
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReviewDeliverable(deliv.id, "approved")}
                              className="text-xs font-bold"
                            >
                              <Check size={13} className="mr-1" /> Approve version
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Review feedback input form */}
                      {reviewingId === deliv.id && (
                        <div className="rounded-xl bg-amber-50/50 border border-amber-200 p-3 space-y-2">
                          <div className="text-xs font-bold text-amber-900">Specify revision feedback:</div>
                          <textarea
                            value={reviewFeedback}
                            onChange={e => setReviewFeedback(e.target.value)}
                            placeholder="Detail required adjustments (timing, sound, color grading, assets)..."
                            rows={2}
                            className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setReviewingId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleReviewDeliverable(deliv.id, "changes_requested")}>
                              Submit feedback
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "brief" && (
            <div className="surface p-6 rounded-3xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0B0D12]">Campaign Brief Reference</h2>
                <p className="text-xs text-[#8A8D98]">Original specifications and legal permissions agreed upon</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-[#fafbfe] p-4">
                  <div className="text-xs font-bold text-[#8A8D98] uppercase">Objective</div>
                  <p className="mt-1 text-sm text-[#0B0D12]">{project.brief.objective}</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[#fafbfe] p-4">
                  <div className="text-xs font-bold text-[#8A8D98] uppercase">Visual Direction</div>
                  <p className="mt-1 text-sm text-[#0B0D12]">{project.brief.style}</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[#fafbfe] p-4">
                  <div className="text-xs font-bold text-[#8A8D98] uppercase">Deliverables & Format</div>
                  <p className="mt-1 text-sm text-[#0B0D12]">
                    {project.brief.deliverables} assets • {project.brief.aspectRatio} • {project.brief.duration}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[#fafbfe] p-4">
                  <div className="text-xs font-bold text-[#8A8D98] uppercase">Licensing & Commercial Use</div>
                  <p className="mt-1 text-sm text-[#0B0D12]">{project.brief.licensing}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Creative Copilot */}
        <div className="space-y-6">
          <div className="surface p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B0D12] text-[var(--lime)] text-xs font-black">
                ✦
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#0B0D12]">AI Creative Copilot</h3>
                <span className="text-[10px] text-[#8A8D98]">Powered by Gemini 1.5 Flash</span>
              </div>
            </div>

            <p className="text-xs text-[#8A8D98] leading-relaxed">
              Paste feedback notes from a review pass. The copilot analyzes the creative intent and formulates actionable checklist items.
            </p>

            <textarea
              value={feedbackInput}
              onChange={e => setFeedbackInput(e.target.value)}
              placeholder="e.g. 'The pacing in the middle feels sluggish, and let's replace the audio with a softer ambient track.'"
              rows={4}
              className="w-full rounded-xl border border-[var(--line)] bg-[#fafbfe] p-3 text-xs text-[#0B0D12] placeholder:text-[#8A8D98] focus:border-[#0B0D12] focus:outline-none"
              disabled={copilotMutation.isPending}
            />

            <Button
              onClick={handleAnalyzeFeedback}
              disabled={copilotMutation.isPending || feedbackInput.trim().length < 5}
              className="w-full text-xs font-bold"
            >
              <Sparkles size={13} className="mr-1 text-[var(--lime)]" />
              {copilotMutation.isPending ? "Analyzing feedback…" : "Analyze feedback with Copilot"}
            </Button>

            {/* Error banner */}
            {copilotError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <div className="font-bold mb-0.5">Notice</div>
                {copilotError}
              </div>
            )}

            {/* Interactive Proposed Revision Tasks Card */}
            {copilotDraft && (
              <div className="rounded-2xl border border-[var(--lime)]/50 bg-[#fbfdf8] p-4 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2b5911] uppercase tracking-wide">
                    Copilot Suggestions
                  </span>
                  <span className="text-[10px] text-[#2b5911] bg-[#e6f7d6] px-2 py-0.5 rounded-full font-bold">
                    Review Required
                  </span>
                </div>

                <div className="text-xs text-[#0B0D12] bg-white p-2.5 rounded-xl border border-[var(--line)] space-y-1.5">
                  <div className="font-bold text-[11px] text-[#8A8D98] uppercase">Summary</div>
                  <p>{copilotDraft.summary}</p>
                  <div className="font-bold text-[11px] text-[#8A8D98] uppercase pt-1">Creative Direction</div>
                  <p className="text-[#4f576b] italic">{copilotDraft.creativeDirection}</p>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-[#0B0D12]">Proposed Checklist Tasks:</div>
                  {copilotDraft.suggestedTasks.map((t, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-2.5 p-2 rounded-xl border border-[var(--line)] bg-white text-xs cursor-pointer hover:bg-[#fafbfe]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(t.selected)}
                        onChange={() => {
                          const updated = [...copilotDraft.suggestedTasks];
                          updated[idx].selected = !updated[idx].selected;
                          setCopilotDraft({ ...copilotDraft, suggestedTasks: updated });
                        }}
                        className="mt-0.5 rounded"
                      />
                      <div>
                        <div className="font-semibold text-[#0B0D12]">{t.title}</div>
                        {t.description && <div className="text-[11px] text-[#8A8D98] mt-0.5">{t.description}</div>}
                      </div>
                    </label>
                  ))}
                </div>

                <Button onClick={handleApplyCopilotTasks} className="w-full text-xs font-bold">
                  Add selected tasks to checklist
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsList({ isLive, currentUserId }: { isLive: boolean; currentUserId?: string }) {
  const [, setLocation] = useLocation();
  const listQuery = trpc.projects.list.useQuery(undefined, {
    enabled: isLive,
    retry: false,
  });

  const demoList = [
    {
      id: 1,
      title: "Brand Launch Film & Social Assets",
      brandName: "Aether Skincare",
      creatorName: "Mara Chen",
      status: "active" as const,
      brief: {
        contentType: "Brand film",
        deadline: "Nov 25, 2026",
      },
      tasksCount: 3,
    },
  ];

  const projects = isLive && listQuery.data ? listQuery.data : demoList;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-10">
      <div className="eyebrow mb-4">Production desk / active projects</div>
      <h1 className="serif text-5xl tracking-[-.05em] lg:text-7xl">
        Creative <i>projects.</i>
      </h1>

      {isLive && listQuery.isLoading ? (
        <p className="mt-10 text-sm text-[#8A8D98]">Loading your projects…</p>
      ) : projects.length === 0 ? (
        <div className="surface mt-10 p-8 text-center rounded-3xl">
          <Clapperboard size={26} className="mx-auto text-[#8A8D98]" />
          <h2 className="mt-4 font-bold">No active projects yet</h2>
          <p className="mt-2 text-sm text-[#8A8D98]">
            When a collaboration request is accepted, a shared project workspace is linked here.
          </p>
          <Button className="mt-5" onClick={() => setLocation("/requests")}>
            View collaboration requests
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(proj => (
            <article key={proj.id} className="surface p-6 rounded-3xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8D98]">
                    {proj.brief.contentType}
                  </span>
                  <span className="rounded-full bg-[#f0f2f7] px-2 py-0.5 text-[10px] font-bold">
                    {proj.status === "active" ? "Active" : proj.status === "in_review" ? "In Review" : "Completed"}
                  </span>
                </div>
                <h3 className="mt-2 font-black text-lg text-[#0B0D12]">{proj.title}</h3>
                <p className="mt-2 text-xs text-[#8A8D98]">
                  Partner: <strong className="text-[#0B0D12]">{proj.brandName}</strong> & <strong className="text-[#0B0D12]">{proj.creatorName}</strong>
                </p>
                <p className="mt-1 text-xs text-[#8A8D98]">
                  Deadline: <strong className="text-[#0B0D12]">{proj.brief.deadline}</strong>
                </p>
              </div>

              <Button onClick={() => setLocation(`/projects/${proj.id}`)} className="w-full text-xs font-bold">
                Open Workspace <ArrowUpRight size={14} className="ml-1" />
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
