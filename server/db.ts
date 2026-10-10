import type {
  AccountType,
  BriefRow,
  BriefStatus,
  CollaborationRequestRow,
  CollaborationStatus,
  CreatorProfileRow,
  PortfolioProjectRow,
  ProfileRow,
  SavedCreatorRow,
} from "../shared/database.types";
import { createSupabaseClient, type RequestSupabase } from "./supabase";

export type AppUser = {
  id: string;
  email: string | null;
  name: string | null;
  accountType: AccountType;
  role: "user";
};

export type CreatorProfileRecord = {
  id: number;
  userId: string;
  slug: string;
  name: string;
  headline: string;
  bio: string;
  location: string;
  workMode: CreatorProfileRow["work_mode"];
  skills: string;
  tools: string;
  contentTypes: string;
  styles: string;
  experience: string;
  rates: string | null;
  formats: string;
  workflow: string;
  verificationStatus: CreatorProfileRow["verification_status"];
  availability: CreatorProfileRow["availability"];
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioProjectRecord = {
  id: number;
  creatorId: number;
  title: string;
  description: string;
  contentType: string;
  tools: string;
  skills: string;
  role: string;
  challenge: string;
  approach: string;
  outcomes: string;
  impactSummary: string;
  mediaPath: string | null;
  mediaName: string | null;
  mediaType: string | null;
  mediaSize: number | null;
  imageUrl: string | null;
  isConcept: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BriefRecord = {
  id: number;
  brandId: string;
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
  workMode: "remote" | "hybrid" | "on-site";
  licensing: string;
  status: BriefStatus;
  createdAt: string;
  updatedAt: string;
};

export type CollaborationRecord = {
  request: {
    id: number;
    briefId: number;
    brandId: string;
    creatorId: number;
    message: string;
    status: CollaborationStatus;
    createdAt: string;
    updatedAt: string;
  };
  briefTitle: string;
  creatorName?: string | null;
  brandName?: string | null;
};

export type CreatorProfileInput = Omit<
  CreatorProfileRecord,
  "id" | "userId" | "createdAt" | "updatedAt" | "verificationStatus" | "availability" | "rates"
> & { rates?: string | null };

export type PortfolioProjectInput = Omit<
  PortfolioProjectRecord,
  "id" | "creatorId" | "createdAt" | "updatedAt" | "imageUrl" | "sortOrder" | "published"
>;

export type PortfolioProjectUpdate = Partial<PortfolioProjectInput> & {
  published?: boolean;
  sortOrder?: number;
};

export type BriefInput = Omit<BriefRecord, "id" | "brandId" | "createdAt" | "updatedAt">;
export type BriefUpdate = Partial<BriefInput>;

function resultOrThrow<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Supabase returned no data");
  return data;
}

function mapCreatorProfile(row: CreatorProfileRow): CreatorProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    name: row.name,
    headline: row.headline,
    bio: row.bio,
    location: row.location,
    workMode: row.work_mode,
    skills: row.skills,
    tools: row.tools,
    contentTypes: row.content_types,
    styles: row.styles,
    experience: row.experience,
    rates: row.rates,
    formats: row.formats,
    workflow: row.workflow,
    verificationStatus: row.verification_status,
    availability: row.availability,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: PortfolioProjectRow, imageUrl: string | null = null): PortfolioProjectRecord {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description,
    contentType: row.content_type,
    tools: row.tools,
    skills: row.skills,
    role: row.role,
    challenge: row.challenge,
    approach: row.approach,
    outcomes: row.outcomes,
    impactSummary: row.impact_summary,
    mediaPath: row.media_path,
    mediaName: row.media_name,
    mediaType: row.media_type,
    mediaSize: row.media_size,
    imageUrl,
    isConcept: row.is_concept,
    published: row.published,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBrief(row: BriefRow): BriefRecord {
  return {
    id: row.id,
    brandId: row.brand_id,
    title: row.title,
    objective: row.objective,
    contentType: row.content_type,
    style: row.style,
    audience: row.audience,
    platform: row.platform,
    duration: row.duration,
    aspectRatio: row.aspect_ratio,
    deliverables: row.deliverables,
    budget: row.budget,
    deadline: row.deadline,
    location: row.location,
    workMode: row.work_mode,
    licensing: row.licensing,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function signProjectMedia(client: RequestSupabase, rows: PortfolioProjectRow[]) {
  return Promise.all(
    rows.map(async row => {
      let imageUrl: string | null = null;
      if (row.media_path) {
        const { data, error } = await client.storage
          .from("portfolio-media")
          .createSignedUrl(row.media_path, 3600);
        if (!error) imageUrl = data.signedUrl;
      }
      return mapProject(row, imageUrl);
    })
  );
}

export async function getAccountProfile(client: RequestSupabase, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function updateAccountType(
  client: RequestSupabase,
  userId: string,
  accountType: AccountType
) {
  const { data, error } = await client
    .from("profiles")
    .update({ account_type: accountType })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function listCreators(client?: RequestSupabase) {
  const supabase = client || createSupabaseClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("published", true)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => mapCreatorProfile(row as CreatorProfileRow));
}

export async function getCreatorById(client: RequestSupabase, id: number) {
  const { data: profileData, error: profileError } = await client
    .from("creator_profiles")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profileData) return undefined;
  const { data: projectData, error: projectError } = await client
    .from("portfolio_projects")
    .select("*")
    .eq("creator_id", id)
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (projectError) throw new Error(projectError.message);
  return {
    profile: mapCreatorProfile(profileData as CreatorProfileRow),
    projects: await signProjectMedia(client, (projectData || []) as PortfolioProjectRow[]),
  };
}

export async function getCreatorProfileForUser(client: RequestSupabase, userId: string) {
  const { data: profileData, error: profileError } = await client
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profileData) return undefined;
  const { data: projectData, error: projectError } = await client
    .from("portfolio_projects")
    .select("*")
    .eq("creator_id", profileData.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (projectError) throw new Error(projectError.message);
  return {
    profile: mapCreatorProfile(profileData as CreatorProfileRow),
    projects: await signProjectMedia(client, (projectData || []) as PortfolioProjectRow[]),
  };
}

export async function getCreatorProfileIdForUser(client: RequestSupabase, userId: string) {
  const { data, error } = await client
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id;
}

export async function saveCreatorProfile(
  client: RequestSupabase,
  userId: string,
  input: CreatorProfileInput
) {
  const { data, error } = await client
    .from("creator_profiles")
    .upsert(
      {
        user_id: userId,
        slug: input.slug,
        name: input.name,
        headline: input.headline,
        bio: input.bio,
        location: input.location,
        work_mode: input.workMode,
        skills: input.skills,
        tools: input.tools,
        content_types: input.contentTypes,
        styles: input.styles,
        experience: input.experience,
        rates: input.rates,
        formats: input.formats,
        workflow: input.workflow,
        published: input.published,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return getCreatorProfileForUser(client, userId).then(profile => {
    if (!profile) throw new Error("Creator profile was not available after saving");
    return profile;
  });
}

export async function listBriefsForBrand(client: RequestSupabase, brandId: string) {
  const { data, error } = await client
    .from("briefs")
    .select("*")
    .eq("brand_id", brandId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => mapBrief(row as BriefRow));
}

export async function listPublishedBriefs(client?: RequestSupabase) {
  const supabase = client || createSupabaseClient();
  const { data, error } = await supabase
    .from("briefs")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => mapBrief(row as BriefRow));
}

export async function createBrief(client: RequestSupabase, brandId: string, input: BriefInput) {
  const { data, error } = await client
    .from("briefs")
    .insert({
      brand_id: brandId,
      title: input.title,
      objective: input.objective,
      content_type: input.contentType,
      style: input.style,
      audience: input.audience,
      platform: input.platform,
      duration: input.duration,
      aspect_ratio: input.aspectRatio,
      deliverables: input.deliverables,
      budget: input.budget,
      deadline: input.deadline,
      location: input.location,
      work_mode: input.workMode,
      licensing: input.licensing,
      status: input.status,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapBrief(data as BriefRow);
}

export function isValidBriefStatusTransition(current: BriefStatus, next: BriefStatus) {
  // Lifecycle: draft → published → closed. No reversal once published.
  return current === next ||
    (current === "draft" && next === "published") ||
    (current === "published" && next === "closed");
}

const briefFieldMap: Record<keyof BriefUpdate, string> = {
  title: "title",
  objective: "objective",
  contentType: "content_type",
  style: "style",
  audience: "audience",
  platform: "platform",
  duration: "duration",
  aspectRatio: "aspect_ratio",
  deliverables: "deliverables",
  budget: "budget",
  deadline: "deadline",
  location: "location",
  workMode: "work_mode",
  licensing: "licensing",
  status: "status",
};

export async function updateBriefForBrand(
  client: RequestSupabase,
  brandId: string,
  briefId: number,
  input: BriefUpdate
) {
  const { data: currentData, error: currentError } = await client
    .from("briefs")
    .select("*")
    .eq("id", briefId)
    .eq("brand_id", brandId)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!currentData) return { kind: "not-found" as const };
  const current = currentData as BriefRow;
  if (input.status && !isValidBriefStatusTransition(current.status, input.status))
    return { kind: "invalid-transition" as const };
  const changes: Partial<BriefRow> = {};
  for (const [key, value] of Object.entries(input)) {
    const field = briefFieldMap[key as keyof BriefUpdate] as keyof BriefRow;
    (changes as Record<string, unknown>)[field] = value;
  }
  const { data, error } = await client
    .from("briefs")
    .update(changes)
    .eq("id", briefId)
    .eq("brand_id", brandId)
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23514") return { kind: "invalid-transition" as const };
    throw new Error(error.message);
  }
  return data
    ? { kind: "updated" as const, brief: mapBrief(data as BriefRow) }
    : { kind: "not-found" as const };
}

export async function saveCreator(client: RequestSupabase, brandId: string, creatorId: number) {
  const { data: creator, error: creatorError } = await client
    .from("creator_profiles")
    .select("id")
    .eq("id", creatorId)
    .eq("published", true)
    .maybeSingle();
  if (creatorError) throw new Error(creatorError.message);
  if (!creator) return undefined;
  const { data, error } = await client
    .from("saved_creators")
    .insert({ brand_id: brandId, creator_id: creatorId })
    .select("*")
    .single();
  if (error?.code === "23505") {
    const { data: existing, error: existingError } = await client
      .from("saved_creators")
      .select("*")
      .eq("brand_id", brandId)
      .eq("creator_id", creatorId)
      .single();
    if (existingError) throw new Error(existingError.message);
    return existing as SavedCreatorRow;
  }
  if (error) throw new Error(error.message);
  return data as SavedCreatorRow;
}

export async function listSavedCreators(client: RequestSupabase, brandId: string) {
  const { data, error } = await client
    .from("saved_creators")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const saved = (data || []) as SavedCreatorRow[];
  if (saved.length === 0) return [];
  const creatorIds = saved.map(row => row.creator_id);
  const { data: profiles, error: profilesError } = await client
    .from("creator_profiles")
    .select("*")
    .in("id", creatorIds)
    .eq("published", true);
  if (profilesError) throw new Error(profilesError.message);
  const profileById = new Map((profiles || []).map(row => [row.id, mapCreatorProfile(row as CreatorProfileRow)]));
  return saved.flatMap(row => {
    const profile = profileById.get(row.creator_id);
    return profile ? [{ savedId: row.id, profile }] : [];
  });
}

export async function removeSavedCreator(client: RequestSupabase, brandId: string, creatorId: number) {
  const { error } = await client
    .from("saved_creators")
    .delete()
    .eq("brand_id", brandId)
    .eq("creator_id", creatorId);
  if (error) throw new Error(error.message);
  return { success: true } as const;
}

export async function listCollaborationsForUser(
  client: RequestSupabase,
  userId: string,
  accountType: AccountType
): Promise<CollaborationRecord[]> {
  let query = client.from("collaboration_requests").select("*").order("created_at", { ascending: false });
  if (accountType === "brand") {
    query = query.eq("brand_id", userId);
  } else {
    const creatorId = await getCreatorProfileIdForUser(client, userId);
    if (!creatorId) return [];
    query = query.eq("creator_id", creatorId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const requests = (data || []) as CollaborationRequestRow[];
  if (requests.length === 0) return [];
  const briefIds = [...new Set(requests.map(row => row.brief_id))];
  const creatorIds = [...new Set(requests.map(row => row.creator_id))];
  const brandIds = [...new Set(requests.map(row => row.brand_id))];
  const [briefsResult, creatorsResult, brandsResult] = await Promise.all([
    client.from("briefs").select("id,title").in("id", briefIds),
    client.from("creator_profiles").select("id,name").in("id", creatorIds),
    client.from("profiles").select("id,display_name").in("id", brandIds),
  ]);
  if (briefsResult.error) throw new Error(briefsResult.error.message);
  if (creatorsResult.error) throw new Error(creatorsResult.error.message);
  if (brandsResult.error) throw new Error(brandsResult.error.message);
  const briefNames = new Map((briefsResult.data || []).map(row => [row.id, row.title]));
  const creatorNames = new Map((creatorsResult.data || []).map(row => [row.id, row.name]));
  const brandNames = new Map((brandsResult.data || []).map(row => [row.id, row.display_name]));
  return requests.map(row => ({
    request: {
      id: row.id,
      briefId: row.brief_id,
      brandId: row.brand_id,
      creatorId: row.creator_id,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    briefTitle: briefNames.get(row.brief_id) || "Brief unavailable",
    creatorName: creatorNames.get(row.creator_id),
    brandName: brandNames.get(row.brand_id),
  }));
}

export async function updateCollaborationStatus(
  client: RequestSupabase,
  userId: string,
  requestId: number,
  status: "accepted" | "declined"
) {
  const creatorId = await getCreatorProfileIdForUser(client, userId);
  if (!creatorId) return { kind: "not-found" as const };
  const { data: current, error: currentError } = await client
    .from("collaboration_requests")
    .select("id,status")
    .eq("id", requestId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!current) return { kind: "not-found" as const };
  if (current.status !== "sent") return { kind: "invalid-transition" as const };
  const { data, error } = await client
    .from("collaboration_requests")
    .update({ status })
    .eq("id", requestId)
    .eq("creator_id", creatorId)
    .eq("status", "sent")
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23514") return { kind: "invalid-transition" as const };
    throw new Error(error.message);
  }
  return data ? { kind: "updated" as const } : { kind: "invalid-transition" as const };
}

export async function canCreateCollaboration(
  client: RequestSupabase,
  briefId: number,
  brandId: string,
  creatorId: number
) {
  const [{ data: brief, error: briefError }, { data: creator, error: creatorError }] = await Promise.all([
    client.from("briefs").select("id").eq("id", briefId).eq("brand_id", brandId).eq("status", "published").maybeSingle(),
    client.from("creator_profiles").select("id").eq("id", creatorId).eq("published", true).maybeSingle(),
  ]);
  if (briefError) throw new Error(briefError.message);
  if (creatorError) throw new Error(creatorError.message);
  return Boolean(brief && creator);
}

export async function createCollaboration(
  client: RequestSupabase,
  input: Pick<CollaborationRequestRow, "brief_id" | "brand_id" | "creator_id" | "message">
) {
  const { data, error } = await client
    .from("collaboration_requests")
    .insert({ ...input, status: "sent" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CollaborationRequestRow;
}

export async function createPortfolioProject(
  client: RequestSupabase,
  creatorId: number,
  input: Omit<PortfolioProjectRow, "id" | "creator_id" | "created_at" | "updated_at" | "sort_order" | "published">
) {
  const { data: last, error: lastError } = await client
    .from("portfolio_projects")
    .select("sort_order")
    .eq("creator_id", creatorId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw new Error(lastError.message);
  const { data, error } = await client
    .from("portfolio_projects")
    .insert({ ...input, creator_id: creatorId, published: false, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapProject(data as PortfolioProjectRow);
}

export async function listPortfolioProjects(client: RequestSupabase, creatorId: number) {
  const { data, error } = await client
    .from("portfolio_projects")
    .select("*")
    .eq("creator_id", creatorId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return signProjectMedia(client, (data || []) as PortfolioProjectRow[]);
}

const projectFieldMap: Record<string, string> = {
  contentType: "content_type",
  impactSummary: "impact_summary",
  mediaPath: "media_path",
  mediaName: "media_name",
  mediaType: "media_type",
  mediaSize: "media_size",
  isConcept: "is_concept",
  sortOrder: "sort_order",
};

export async function updatePortfolioProject(
  client: RequestSupabase,
  creatorId: number,
  projectId: number,
  input: Record<string, unknown>
) {
  const { data, error } = await client
    .from("portfolio_projects")
    .update(Object.fromEntries(Object.entries(input).map(([key, value]) => [projectFieldMap[key] || key, value])) as Partial<PortfolioProjectRow>)
    .eq("id", projectId)
    .eq("creator_id", creatorId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProject(data as PortfolioProjectRow) : undefined;
}

export async function deletePortfolioProject(client: RequestSupabase, creatorId: number, projectId: number) {
  const { data, error } = await client
    .from("portfolio_projects")
    .delete()
    .eq("id", projectId)
    .eq("creator_id", creatorId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function reorderPortfolioProjects(client: RequestSupabase, _creatorId: number, projectIds: number[]) {
  const { data, error } = await client.rpc("reorder_portfolio_projects", { project_ids: projectIds });
  if (error) throw new Error(error.message);
  return data;
}
