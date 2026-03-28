import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env";

type AnyRecord = Record<string, any>;

function getClient() {
  const env = getServerEnv();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase is not configured");
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function ensureSingle<T>(value: T | null, errorMessage: string): T {
  if (!value) {
    throw new Error(errorMessage);
  }
  return value;
}

function isMissingFullAccessColumnError(error: any) {
  const message = String(error?.message || error?.details || error || "").toLowerCase();
  return message.includes("has_full_building_access") && (message.includes("column") || message.includes("schema cache"));
}

function normalizeBooleanFlags(row: AnyRecord | null) {
  if (!row) return row;
  const clone = { ...row };
  if ("profile_completed" in clone) clone.profile_completed = Boolean(clone.profile_completed);
  if ("email_verified" in clone) clone.email_verified = Boolean(clone.email_verified);
  if ("is_read" in clone) clone.is_read = Boolean(clone.is_read);
  if ("is_new_for_admin" in clone) clone.is_new_for_admin = Boolean(clone.is_new_for_admin);
  if ("has_full_building_access" in clone) clone.has_full_building_access = Boolean(clone.has_full_building_access);
  return clone;
}

function normalizeRows(rows: AnyRecord[] | null) {
  return (rows || []).map((row) => normalizeBooleanFlags(row));
}

function flattenOrderRow(row: AnyRecord) {
  const building = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
  const signage = Array.isArray(row.signage) ? row.signage[0] : row.signage;

  return {
    ...row,
    building_name: building?.name || null,
    building_address: building?.address || null,
    width: signage?.width || null,
    height: signage?.height || null,
    signage_category: signage?.category || null,
  };
}

function normalizeBuildingPart(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeBceNumber(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^\dA-Za-z]/g, "")
    .toLowerCase();
}

export function buildBuildingCanonicalKey(input: {
  name?: unknown;
  zip?: unknown;
  number?: unknown;
  street?: unknown;
}) {
  const name = normalizeBuildingPart(input.name);
  const zip = normalizeBuildingPart(input.zip);
  const number = normalizeBuildingPart(input.number);
  const street = normalizeBuildingPart(input.street);
  return `${name}|${zip}|${number}|${street}`;
}

function isMissingRelationError(error: any, relationName: string) {
  const message = String(error?.message || error?.details || error || "").toLowerCase();
  return (
    message.includes(relationName.toLowerCase()) &&
    (message.includes("relation") || message.includes("does not exist") || message.includes("schema cache"))
  );
}

function isMissingColumnError(error: any, columnName: string) {
  const message = String(error?.message || error?.details || error || "").toLowerCase();
  return (
    message.includes(columnName.toLowerCase()) &&
    (message.includes("column") || message.includes("does not exist") || message.includes("schema cache"))
  );
}

function createDomainError(code: string, message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}

async function getAccessibleUserIds(userId: number) {
  const client = getClient();
  const ids = new Set<number>([userId]);

  const { data: currentUser, error: currentUserError } = await client
    .from("users")
    .select("id,parent_id")
    .eq("id", userId)
    .maybeSingle();

  if (currentUserError) throw currentUserError;

  const parentId = currentUser?.parent_id || null;
  if (parentId) ids.add(Number(parentId));

  const { data: children, error: childrenError } = await client
    .from("users")
    .select("id")
    .eq("parent_id", userId);

  if (childrenError) throw childrenError;
  for (const child of children || []) ids.add(Number(child.id));

  if (parentId) {
    const { data: siblings, error: siblingsError } = await client
      .from("users")
      .select("id")
      .eq("parent_id", parentId);

    if (siblingsError) throw siblingsError;
    for (const sibling of siblings || []) ids.add(Number(sibling.id));
  }

  return Array.from(ids);
}

async function getAccessibleBuildingIds(userId: number) {
  const client = getClient();
  const { data: currentUser, error: currentUserError } = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (currentUserError) throw currentUserError;
  if (!currentUser) return [];

  // Placeur : si has_full_building_access, hérite de tous les buildings de l'organisation parente
  if (currentUser.role === "placeur") {
    if (currentUser.has_full_building_access && currentUser.parent_id) {
      const orgUserIds = await getAccessibleUserIds(currentUser.parent_id);
      const { data, error } = await client.from("user_buildings").select("building_id").in("user_id", orgUserIds);
      if (error) throw error;
      return Array.from(new Set((data || []).map((row) => Number(row.building_id))));
    }
    const { data, error } = await client.from("user_buildings").select("building_id").eq("user_id", userId);
    if (error) throw error;
    return Array.from(new Set((data || []).map((row) => Number(row.building_id))));
  }

  let buildingScopeUserIds: number[] = [userId];

  if (!currentUser.parent_id) {
    buildingScopeUserIds = await getAccessibleUserIds(userId);
  } else if (currentUser.has_full_building_access) {
    const { data: orgUsers, error: orgUsersError } = await client
      .from("users")
      .select("id")
      .or(`id.eq.${currentUser.parent_id},parent_id.eq.${currentUser.parent_id}`);

    if (orgUsersError) throw orgUsersError;
    buildingScopeUserIds = Array.from(new Set((orgUsers || []).map((row) => Number(row.id))));
  }

  const { data, error } = await client
    .from("user_buildings")
    .select("building_id")
    .in("user_id", buildingScopeUserIds);

  if (error) throw error;
  const buildingIds = new Set<number>((data || []).map((row) => Number(row.building_id)));

  // Fallback 1: active syndic assignment (new workflow table).
  const organizationUserId = Number(currentUser.parent_id || currentUser.id);
  const { data: activeAssignments, error: assignmentsError } = await client
    .from("building_syndic_assignments")
    .select("building_id")
    .eq("syndic_user_id", organizationUserId)
    .is("unassigned_at", null);

  if (assignmentsError) {
    if (!isMissingRelationError(assignmentsError, "building_syndic_assignments")) throw assignmentsError;
  } else {
    for (const row of activeAssignments || []) buildingIds.add(Number(row.building_id));
  }

  // Fallback 2: legacy ownership by creator when user_buildings is incomplete.
  if (buildingScopeUserIds.length > 0) {
    const { data: createdBuildings, error: createdBuildingsError } = await client
      .from("buildings")
      .select("id")
      .in("created_by_user_id", buildingScopeUserIds);

    if (createdBuildingsError) throw createdBuildingsError;
    for (const row of createdBuildings || []) buildingIds.add(Number(row.id));
  }

  return Array.from(buildingIds);
}

export function isSupabasePrimaryEnabled() {
  const env = getServerEnv();
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export async function getUserByEmail(email: string) {
  const { data, error } = await getClient().from("users").select("*").eq("email", email).maybeSingle();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function getUserById(id: number | string) {
  const { data, error } = await getClient().from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function getUserByVerificationToken(token: string) {
  const { data, error } = await getClient().from("users").select("*").eq("verification_token", token).maybeSingle();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function getUserByResetToken(token: string, nowIso: string) {
  const { data, error } = await getClient()
    .from("users")
    .select("*")
    .eq("reset_token", token)
    .gt("reset_token_expires", nowIso)
    .maybeSingle();

  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function createUser(payload: AnyRecord) {
  const { data, error } = await getClient().from("users").insert(payload).select("*").single();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function updateUser(id: number | string, payload: AnyRecord) {
  const { data, error } = await getClient().from("users").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function deleteUser(id: number | string) {
  const { error } = await getClient().from("users").delete().eq("id", id);
  if (error) throw error;
}

export async function emailExists(email: string) {
  const user = await getUserByEmail(email);
  return Boolean(user);
}

export async function listSyndicUsers() {
  const { data, error } = await getClient()
    .from("users")
    .select("id,email,name,role,company_name,phone,address,street,number,box,zip,city,vat_number,profile_completed,first_name,last_name,bce_number,ipi_number,is_ipi_certified")
    .eq("role", "syndic")
    .is("parent_id", null);

  if (error) throw error;
  return normalizeRows(data);
}

export async function listTeamMembers(parentId: number | string) {
  const client = getClient();
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("parent_id", parentId);
  if (error) throw error;

  const members = normalizeRows(data);
  if (members.length === 0) return members;

  const organizationBuildingIds = new Set((await listBuildings("syndic", Number(parentId))).map((building) => Number(building.id)));

  const { data: assignments, error: assignmentsError } = await client
    .from("user_buildings")
    .select("*")
    .in("user_id", members.map((member) => member.id));

  if (assignmentsError) throw assignmentsError;

  return members.map((member) => ({
    ...member,
    has_full_building_access: Boolean(member.has_full_building_access) || (
      organizationBuildingIds.size > 0 &&
      Array.from(organizationBuildingIds).every((buildingId) =>
        (assignments || []).some((assignment) => Number(assignment.user_id) === Number(member.id) && Number(assignment.building_id) === buildingId)
      )
    ),
    buildingIds: (assignments || [])
      .filter((assignment) => Number(assignment.user_id) === Number(member.id))
      .map((assignment) => Number(assignment.building_id)),
  }));
}

export async function listBuildings(role: string, userId?: number) {
  const client = getClient();

  if (role === "admin") {
    const { data, error } = await client.from("buildings").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return normalizeRows(data);
  }

  const buildingIds = userId ? await getAccessibleBuildingIds(userId) : [];
  if (buildingIds.length === 0) return [];

  const { data, error } = await client
    .from("buildings")
    .select("*")
    .in("id", buildingIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return normalizeRows(data);
}

export async function createBuilding(payload: AnyRecord) {
  const { data, error } = await getClient().from("buildings").insert(payload).select("*").single();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function updateBuilding(id: number | string, payload: AnyRecord) {
  const { data, error } = await getClient().from("buildings").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function getBuilding(id: number | string) {
  const { data, error } = await getClient().from("buildings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function getBuildingWithSignage(id: number | string) {
  const building = ensureSingle(await getBuilding(id), "Building not found");
  const signage = await listSignageForBuilding(id);
  return { ...building, signage };
}

export async function findBuildingByIdentity(identity: {
  bceNumber?: string | null;
  canonicalKey?: string | null;
  name?: string | null;
  street?: string | null;
  number?: string | null;
  zip?: string | null;
}) {
  const client = getClient();
  const normalizedBce = normalizeBceNumber(identity.bceNumber || "");
  if (normalizedBce) {
    const { data, error } = await client
      .from("buildings")
      .select("*")
      .not("bce_number", "is", null)
      .limit(2000);

    if (error) throw error;
    const byBce = (data || []).find((row: any) => normalizeBceNumber(row.bce_number) === normalizedBce);
    if (byBce) return normalizeBooleanFlags(byBce);
  }

  const normalizedCanonical = String(identity.canonicalKey || "").trim().toLowerCase();
  if (normalizedCanonical) {
    const { data, error } = await client
      .from("buildings")
      .select("*")
      .eq("canonical_key", normalizedCanonical)
      .maybeSingle();

    if (!error && data) return normalizeBooleanFlags(data);
    if (error && !isMissingRelationError(error, "buildings")) throw error;
  }

  const normalizedName = String(identity.name || "").trim();
  const normalizedStreet = String(identity.street || "").trim();
  const normalizedNumber = String(identity.number || "").trim();
  const normalizedZip = String(identity.zip || "").trim();
  if (!normalizedName || !normalizedStreet || !normalizedNumber || !normalizedZip) {
    return null;
  }

  const { data: fallbackData, error: fallbackError } = await client
    .from("buildings")
    .select("*")
    .ilike("name", normalizedName)
    .ilike("street", normalizedStreet)
    .eq("number", normalizedNumber)
    .eq("zip", normalizedZip)
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  if (!fallbackData) return null;
  return normalizeBooleanFlags(fallbackData);
}

export async function deleteBuilding(id: number | string) {
  const { error } = await getClient().from("buildings").delete().eq("id", id);
  if (error) throw error;
}

export async function assignBuildingToUser(userId: number | string, buildingId: number | string) {
  const { data, error } = await getClient()
    .from("user_buildings")
    .upsert({ user_id: userId, building_id: buildingId }, { onConflict: "user_id,building_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeBuildingFromUser(userId: number | string, buildingId: number | string) {
  const { error } = await getClient()
    .from("user_buildings")
    .delete()
    .eq("user_id", userId)
    .eq("building_id", buildingId);
  if (error) throw error;
  return { success: true };
}

export async function removeBuildingFromOrganizationUsers(
  organizationUserId: number | string,
  buildingId: number | string,
) {
  const scopedUserIds = await getAccessibleUserIds(Number(organizationUserId));
  if (scopedUserIds.length === 0) return { success: true, removed: 0 };

  const { data, error } = await getClient()
    .from("user_buildings")
    .delete()
    .in("user_id", scopedUserIds)
    .eq("building_id", buildingId)
    .select("user_id");

  if (error) throw error;
  return { success: true, removed: (data || []).length };
}

export async function getActiveBuildingSyndicAssignment(buildingId: number | string) {
  const client = getClient();
  const { data, error } = await client
    .from("building_syndic_assignments")
    .select("*")
    .eq("building_id", buildingId)
    .is("unassigned_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error, "building_syndic_assignments")) return null;
    throw error;
  }
  return data || null;
}

export async function listBuildingSyndicAssignments(buildingId: number | string) {
  const client = getClient();
  const { data, error } = await client
    .from("building_syndic_assignments")
    .select("*")
    .eq("building_id", buildingId)
    .order("assigned_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error, "building_syndic_assignments")) return [];
    throw error;
  }
  return data || [];
}

export async function assignActiveBuildingSyndic(
  buildingId: number | string,
  syndicUserId: number | string,
  assignedByUserId?: number | string | null,
  options: { force?: boolean; reason?: string } = {},
) {
  const client = getClient();
  const active = await getActiveBuildingSyndicAssignment(buildingId);
  const normalizedSyndicUserId = Number(syndicUserId);
  const nowIso = new Date().toISOString();

  if (active && Number(active.syndic_user_id) === normalizedSyndicUserId) {
    return active;
  }

  if (active && !options.force) {
    throw createDomainError(
      "BUILDING_ALREADY_ASSIGNED",
      "Un syndic est deja actif sur cette ACP. Une demande de transfert est requise.",
    );
  }

  if (active && options.force) {
    const { error: closeError } = await client
      .from("building_syndic_assignments")
      .update({
        unassigned_at: nowIso,
        unassigned_reason: String(options.reason || "forced_transfer"),
      })
      .eq("id", active.id);

    if (closeError) throw closeError;
  }

  const payload: AnyRecord = {
    building_id: Number(buildingId),
    syndic_user_id: normalizedSyndicUserId,
    assigned_by_user_id: assignedByUserId != null ? Number(assignedByUserId) : null,
    assigned_at: nowIso,
  };

  const { data, error } = await client
    .from("building_syndic_assignments")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    const message = String(error?.message || error?.details || error || "").toLowerCase();
    if (isMissingRelationError(error, "building_syndic_assignments")) {
      await updateBuilding(buildingId, { created_by_user_id: normalizedSyndicUserId });
      await assignBuildingToUser(normalizedSyndicUserId, Number(buildingId));
      return {
        id: null,
        building_id: Number(buildingId),
        syndic_user_id: normalizedSyndicUserId,
        assigned_by_user_id: assignedByUserId != null ? Number(assignedByUserId) : null,
        assigned_at: nowIso,
        unassigned_at: null,
      };
    }
    if (message.includes("uq_one_active_syndic_per_building") || message.includes("duplicate key")) {
      throw createDomainError(
        "BUILDING_ALREADY_ASSIGNED",
        "Un syndic est deja actif sur cette ACP. Une demande de transfert est requise.",
      );
    }
    throw error;
  }

  await updateBuilding(buildingId, { created_by_user_id: normalizedSyndicUserId });
  return data;
}

export async function unassignActiveBuildingSyndic(
  buildingId: number | string,
  syndicUserId: number | string,
  options: { reason?: string; force?: boolean } = {},
) {
  const active = await getActiveBuildingSyndicAssignment(buildingId);
  if (!active) return null;

  const requestedByUserId = Number(syndicUserId);
  const activeSyndicUserId = Number(active.syndic_user_id);
  if (!options.force && requestedByUserId !== activeSyndicUserId) {
    throw createDomainError("NOT_ACTIVE_SYNDIC", "Seul le syndic actif peut se desaffilier de cette ACP.");
  }

  const { data, error } = await getClient()
    .from("building_syndic_assignments")
    .update({
      unassigned_at: new Date().toISOString(),
      unassigned_reason: String(options.reason || "manual_unassign"),
    })
    .eq("id", active.id)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error, "building_syndic_assignments")) return null;
    throw error;
  }
  return data;
}

export async function createBuildingTransferRequest(payload: {
  buildingId: number | string;
  fromSyndicUserId?: number | string | null;
  toSyndicUserId: number | string;
  requestedByUserId: number | string;
  reason?: string | null;
  evidence?: string | null;
  expiresAt?: string | null;
}) {
  const client = getClient();
  const insertPayload: AnyRecord = {
    building_id: Number(payload.buildingId),
    from_syndic_user_id: payload.fromSyndicUserId != null ? Number(payload.fromSyndicUserId) : null,
    to_syndic_user_id: Number(payload.toSyndicUserId),
    requested_by_user_id: Number(payload.requestedByUserId),
    status: "pending",
    reason: payload.reason || null,
    evidence: payload.evidence || null,
    expires_at: payload.expiresAt || null,
  };

  const { data, error } = await client
    .from("building_transfer_requests")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error, "building_transfer_requests")) {
      throw createDomainError(
        "MIGRATION_REQUIRED",
        "La table des demandes de transfert est absente. Executez la migration workflow hardening.",
      );
    }
    const message = String(error?.message || error?.details || error || "").toLowerCase();
    if (message.includes("uq_one_pending_transfer_per_building") || message.includes("duplicate key")) {
      const { data: existingPending, error: pendingError } = await client
        .from("building_transfer_requests")
        .select("*")
        .eq("building_id", Number(payload.buildingId))
        .eq("status", "pending")
        .maybeSingle();
      if (pendingError) throw pendingError;
      if (existingPending) return existingPending;
    }
    throw error;
  }

  return data;
}

export async function getBuildingTransferRequest(id: number | string) {
  const { data, error } = await getClient()
    .from("building_transfer_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error, "building_transfer_requests")) return null;
    throw error;
  }
  return data || null;
}

export async function listBuildingTransferRequests(role: string, userId?: number) {
  const client = getClient();
  let query = client
    .from("building_transfer_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (role !== "admin") {
    if (!userId) return [];
    const scopedUserIds = await getAccessibleUserIds(Number(userId));
    if (scopedUserIds.length === 0) return [];
    const idsCsv = scopedUserIds.join(",");
    query = query.or(
      `to_syndic_user_id.in.(${idsCsv}),from_syndic_user_id.in.(${idsCsv}),requested_by_user_id.in.(${idsCsv})`,
    );
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error, "building_transfer_requests")) return [];
    throw error;
  }
  return data || [];
}

export async function updateBuildingTransferRequest(id: number | string, payload: AnyRecord) {
  const { data, error } = await getClient()
    .from("building_transfer_requests")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error, "building_transfer_requests")) {
      throw createDomainError(
        "MIGRATION_REQUIRED",
        "La table des demandes de transfert est absente. Executez la migration workflow hardening.",
      );
    }
    throw error;
  }
  return data;
}

export async function listUserBuildings(userId: number | string) {
  const { data, error } = await getClient().from("user_buildings").select("*").eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

export async function replaceUserBuildings(userId: number | string, buildingIds: Array<number | string>) {
  const client = getClient();
  const { error: deleteError } = await client.from("user_buildings").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const normalizedIds = Array.from(new Set((buildingIds || []).map((id) => Number(id)).filter(Boolean)));
  if (normalizedIds.length === 0) return [];

  const { data, error } = await client
    .from("user_buildings")
    .insert(normalizedIds.map((buildingId) => ({ user_id: userId, building_id: buildingId })))
    .select("*");

  if (error) throw error;
  return data || [];
}

export { isMissingFullAccessColumnError };

export async function getUserBuildingByBuildingId(buildingId: number | string) {
  const client = getClient();

  const activeAssignment = await getActiveBuildingSyndicAssignment(buildingId);
  if (activeAssignment?.syndic_user_id) {
    return {
      user_id: Number(activeAssignment.syndic_user_id),
      building_id: Number(buildingId),
    };
  }

  const { data: building, error: buildingError } = await client
    .from("buildings")
    .select("created_by_user_id")
    .eq("id", buildingId)
    .maybeSingle();

  if (buildingError) throw buildingError;
  if (building?.created_by_user_id) {
    return { user_id: Number(building.created_by_user_id), building_id: Number(buildingId) };
  }

  const { data, error } = await client
    .from("user_buildings")
    .select("user_id, building_id, users!inner(parent_id)")
    .eq("building_id", buildingId);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const primaryAssignment =
    data.find((row: any) => row.users?.parent_id == null) ||
    data[0];

  return {
    user_id: Number(primaryAssignment.user_id),
    building_id: Number(primaryAssignment.building_id),
  };
}

export async function listSignageForBuilding(buildingId: number | string) {
  const { data, error } = await getClient().from("signage").select("*").eq("building_id", buildingId).order("id");
  if (error) throw error;
  return normalizeRows(data);
}

export async function getSignageById(id: number | string) {
  const { data, error } = await getClient().from("signage").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createSignage(payload: AnyRecord) {
  const { data, error } = await getClient().from("signage").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateSignage(id: number | string, payload: AnyRecord) {
  const { data, error } = await getClient().from("signage").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteSignage(id: number | string) {
  const client = getClient();
  const { data: affectedOrders, error: selectError } = await client.from("orders").select("id").eq("signage_id", id);
  if (selectError) throw selectError;

  const { error: orderError } = await client.from("orders").update({ signage_id: null }).eq("signage_id", id);
  if (orderError) throw orderError;

  const { error } = await client.from("signage").delete().eq("id", id);
  if (error) throw error;

  return (affectedOrders || []).map((row) => Number(row.id));
}

export async function setSignageAfterPhoto(id: number | string, image: string) {
  return updateSignage(id, { after_image_data: image });
}

export async function createOrder(payload: AnyRecord) {
  const { data, error } = await getClient().from("orders").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function listOwnersForBuilding(buildingId: number | string) {
  const { data, error } = await getClient()
    .from("building_owners")
    .select("reference, is_primary, owners!inner(id,name,email)")
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => {
    const owner = Array.isArray(row.owners) ? row.owners[0] : row.owners;
    return {
      owner_id: Number(owner?.id),
      name: owner?.name || "",
      email: owner?.email || "",
      reference: row.reference || "",
      is_primary: Boolean(row.is_primary),
    };
  });
}

export async function upsertOwnerForOrganization(
  organizationUserId: number | string,
  name: string,
  email?: string | null,
) {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim();
  if (!normalizedName) {
    throw new Error("Owner name is required");
  }

  let query = getClient()
    .from("owners")
    .select("*")
    .eq("organization_user_id", organizationUserId)
    .eq("name", normalizedName);

  if (normalizedEmail) {
    query = query.eq("email", normalizedEmail);
  }

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (normalizedEmail && existing.email !== normalizedEmail) {
      const { data, error } = await getClient()
        .from("owners")
        .update({ email: normalizedEmail })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }
    return existing;
  }

  const { data, error } = await getClient()
    .from("owners")
    .insert({
      organization_user_id: organizationUserId,
      name: normalizedName,
      email: normalizedEmail || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function linkOwnerToBuilding(
  buildingId: number | string,
  ownerId: number | string,
  reference: string,
) {
  const normalizedReference = String(reference || "").trim();
  if (!normalizedReference) {
    throw new Error("Owner reference is required");
  }

  const client = getClient();
  const { data: existing, error: existingError } = await client
    .from("building_owners")
    .select("*")
    .eq("building_id", buildingId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await client
      .from("building_owners")
      .update({ reference: normalizedReference })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await client
    .from("building_owners")
    .insert({
      building_id: buildingId,
      owner_id: ownerId,
      reference: normalizedReference,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function unlinkOwnerFromBuilding(buildingId: number | string, ownerId: number | string) {
  const { error } = await getClient()
    .from("building_owners")
    .delete()
    .eq("building_id", buildingId)
    .eq("owner_id", ownerId);
  if (error) throw error;
  return { success: true };
}

export async function listOrders(role: string, userId?: number) {
  const client = getClient();
  let query = client
    .from("orders")
    .select("*, buildings(name,address), signage(width,height,category)")
    .order("created_at", { ascending: false });

  if (role !== "admin") {
    const buildingIds = userId ? await getAccessibleBuildingIds(userId) : [];
    if (buildingIds.length === 0) return [];
    query = query.in("building_id", buildingIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(flattenOrderRow);
}

export async function getOrder(id: number | string) {
  const { data, error } = await getClient()
    .from("orders")
    .select("*, buildings(name,address), signage(width,height,category)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? flattenOrderRow(data) : null;
}

export async function updateOrder(id: number | string, payload: AnyRecord) {
  const { data, error } = await getClient().from("orders").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateOrderIfStatusIn(
  id: number | string,
  payload: AnyRecord,
  allowedStatuses: string[],
) {
  const { data, error } = await getClient()
    .from("orders")
    .update(payload)
    .eq("id", id)
    .in("status", allowedStatuses)
    .select("*");

  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

export async function listOrdersForExport() {
  const { data, error } = await getClient()
    .from("orders")
    .select("id, requester_name, requester_email, lot_number, name_to_replace, owner_reference, details, status, created_at, buildings(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    building: Array.isArray(row.buildings) ? row.buildings[0]?.name : row.buildings?.name,
    requester_name: row.requester_name,
    requester_email: row.requester_email,
    lot_number: row.lot_number,
    name_to_replace: row.name_to_replace,
    owner_reference: row.owner_reference,
    details: row.details,
    status: row.status,
    created_at: row.created_at,
  }));
}

type CreateOrderLinkOptions = {
  expiresAt?: string | null;
  createdByUserId?: number | string | null;
  maxUses?: number | null;
  channel?: string | null;
};

const HALL_QR_OPEN_STATUSES = ["requested", "in_production", "ready_to_install"];

function isOrderLinkUsable(link: AnyRecord | null) {
  if (!link) return false;
  const status = String(link.status || "active").toLowerCase();
  if (status !== "active") return false;
  if (link.revoked_at) return false;

  if (link.expires_at) {
    const expiresAtMs = new Date(String(link.expires_at)).getTime();
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) return false;
  }

  const maxUses = Number(link.max_uses || 0);
  const usedCount = Number(link.used_count || 0);
  if (maxUses > 0 && usedCount >= maxUses) return false;

  return true;
}

export async function createOrderLink(
  token: string,
  buildingId: number | string,
  options: CreateOrderLinkOptions = {},
) {
  const payload: AnyRecord = {
    token,
    building_id: buildingId,
  };

  if (options.expiresAt !== undefined) payload.expires_at = options.expiresAt;
  if (options.createdByUserId != null) payload.created_by_user_id = Number(options.createdByUserId);
  if (options.maxUses != null) payload.max_uses = Math.max(0, Number(options.maxUses));
  if (options.channel != null) payload.channel = String(options.channel || "").trim() || null;

  const { data, error } = await getClient()
    .from("order_links")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getOrderLink(token: string) {
  const { data, error } = await getClient()
    .from("order_links")
    .select("*, buildings(name,address)")
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (!isOrderLinkUsable(data)) return null;

  const building = Array.isArray(data.buildings) ? data.buildings[0] : data.buildings;
  return {
    ...data,
    building_name: building?.name || null,
    building_address: building?.address || null,
  };
}

export async function consumeOrderLink(token: string, expectedBuildingId?: number | string) {
  const client = getClient();
  const { data, error } = await client
    .from("order_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (!isOrderLinkUsable(data)) return null;

  if (
    expectedBuildingId != null &&
    Number.isFinite(Number(expectedBuildingId)) &&
    Number(data.building_id) !== Number(expectedBuildingId)
  ) {
    return null;
  }

  const nextPayload: AnyRecord = {};
  if ("used_count" in data) nextPayload.used_count = Number(data.used_count || 0) + 1;
  if ("last_used_at" in data) nextPayload.last_used_at = new Date().toISOString();

  if (Object.keys(nextPayload).length > 0) {
    const { error: updateError } = await client
      .from("order_links")
      .update(nextPayload)
      .eq("token", token);

    if (updateError) throw updateError;
  }

  return data;
}

export async function getHallQrLinkForBuilding(buildingId: number | string) {
  const client = getClient();
  let { data, error } = await client
    .from("order_links")
    .select("*")
    .eq("building_id", Number(buildingId))
    .eq("channel", "qr_hall")
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "created_at")) {
    const fallback = await client
      .from("order_links")
      .select("*")
      .eq("building_id", Number(buildingId))
      .eq("channel", "qr_hall");

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  const links = data || [];

  // Keep deterministic behavior for legacy schemas without created_at.
  links.sort((a: AnyRecord, b: AnyRecord) => {
    const score = (row: AnyRecord) => {
      const createdAtMs = Number(new Date(String(row?.created_at || 0)));
      if (Number.isFinite(createdAtMs) && createdAtMs > 0) return createdAtMs;
      const lastUsedAtMs = Number(new Date(String(row?.last_used_at || 0)));
      if (Number.isFinite(lastUsedAtMs) && lastUsedAtMs > 0) return lastUsedAtMs;
      const expiresAtMs = Number(new Date(String(row?.expires_at || 0)));
      if (Number.isFinite(expiresAtMs) && expiresAtMs > 0) return expiresAtMs;
      return 0;
    };
    return score(b) - score(a);
  });

  for (const link of links) {
    if (isOrderLinkUsable(link)) return link;
  }
  return null;
}

export async function createHallQrOrder(payload: {
  buildingId: number | string;
  orderLinkToken?: string | null;
  requestedByUserId: number | string;
  requestedByRole: "syndic" | "admin";
  reason: string;
  isReplacement?: boolean;
  notes?: string | null;
}) {
  const insertPayload: AnyRecord = {
    building_id: Number(payload.buildingId),
    order_link_token: payload.orderLinkToken || null,
    requested_by_user_id: Number(payload.requestedByUserId),
    requested_by_role: String(payload.requestedByRole || "syndic"),
    reason: String(payload.reason || "initial_install"),
    is_replacement: Boolean(payload.isReplacement),
    notes: payload.notes || null,
    status: "requested",
    requested_at: new Date().toISOString(),
  };

  const { data, error } = await getClient()
    .from("hall_qr_orders")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listHallQrOrders(role: string, userId?: number) {
  const client = getClient();
  let query = client
    .from("hall_qr_orders")
    .select("*")
    .order("requested_at", { ascending: false });

  if (role !== "admin") {
    const buildingIds = userId ? await getAccessibleBuildingIds(userId) : [];
    if (buildingIds.length === 0) return [];
    query = query.in("building_id", buildingIds);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error, "hall_qr_orders")) return [];
    throw error;
  }
  return data || [];
}

export async function listHallQrOrdersForBuilding(buildingId: number | string) {
  const { data, error } = await getClient()
    .from("hall_qr_orders")
    .select("*")
    .eq("building_id", Number(buildingId))
    .order("requested_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error, "hall_qr_orders")) return [];
    throw error;
  }
  return data || [];
}

export async function getOpenHallQrOrderForBuilding(buildingId: number | string) {
  const { data, error } = await getClient()
    .from("hall_qr_orders")
    .select("*")
    .eq("building_id", Number(buildingId))
    .in("status", HALL_QR_OPEN_STATUSES)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error, "hall_qr_orders")) return null;
    throw error;
  }
  return data || null;
}

export async function getHallQrOrder(id: number | string) {
  const { data, error } = await getClient()
    .from("hall_qr_orders")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error, "hall_qr_orders")) return null;
    throw error;
  }
  return data || null;
}

export async function updateHallQrOrder(id: number | string, payload: AnyRecord) {
  const { data, error } = await getClient()
    .from("hall_qr_orders")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", Number(id))
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createNotification(payload: AnyRecord) {
  const { data, error } = await getClient().from("notifications").insert(payload).select("*").single();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function listNotifications(role: string, userId?: number) {
  const client = getClient();

  if (role === "admin") {
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return normalizeRows(data);
  }

  const accessibleUserIds = userId ? await getAccessibleUserIds(userId) : [];
  if (accessibleUserIds.length === 0) return [];

  const { data, error } = await client
    .from("notifications")
    .select("*")
    .in("user_id", accessibleUserIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return normalizeRows(data);
}

export async function markNotificationRead(id: number | string) {
  const { data, error } = await getClient().from("notifications").update({ is_read: 1 }).eq("id", id).select("*").single();
  if (error) throw error;
  return normalizeBooleanFlags(data);
}

export async function markAllNotificationsRead(role: string, userId?: number) {
  const client = getClient();

  if (role === "admin") {
    const { error } = await client.from("notifications").update({ is_read: 1 }).is("user_id", null);
    if (error) throw error;
    return;
  }

  const accessibleUserIds = userId ? await getAccessibleUserIds(userId) : [];
  if (accessibleUserIds.length === 0) return;

  const { error } = await client.from("notifications").update({ is_read: 1 }).in("user_id", accessibleUserIds);
  if (error) throw error;
}

export async function deleteNotification(id: number | string) {
  const { error } = await getClient().from("notifications").delete().eq("id", id);
  if (error) throw error;
}

// ── Bug Reports ──

export async function createBugReport(payload: AnyRecord) {
  const { data, error } = await getClient().from("bug_reports").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function listBugReports() {
  const { data, error } = await getClient()
    .from("bug_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateBugReport(id: number | string, payload: AnyRecord) {
  const { data, error } = await getClient()
    .from("bug_reports")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBugReport(id: number | string) {
  const { error } = await getClient().from("bug_reports").delete().eq("id", id);
  if (error) throw error;
}

// ── Stats ──

export async function getStats() {
  const client = getClient();

  const [ordersRes, buildingsRes, usersRes, bugReportsRes] = await Promise.all([
    client.from("orders").select("id, status, building_id, created_at, placeur_id, requester_quality"),
    client.from("buildings").select("id, status, created_at, survey_date, archived_at"),
    client.from("users").select("id, role, deleted_at, parent_id, name"),
    client.from("bug_reports").select("id, status, severity, created_at"),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (buildingsRes.error) throw buildingsRes.error;
  if (usersRes.error) throw usersRes.error;
  // bug_reports table might not exist yet
  const bugReports = bugReportsRes.error ? [] : bugReportsRes.data || [];

  return {
    orders: ordersRes.data || [],
    buildings: buildingsRes.data || [],
    users: usersRes.data || [],
    bugReports,
  };
}
