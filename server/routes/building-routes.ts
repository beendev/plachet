import type { Express, Request } from "express";
import { randomBytes } from "crypto";
import { pickDeps, type ServerRouteDeps } from "./route-deps";
import { getServerEnv } from "../env";

export function registerSupabaseBuildingRoutes(app: Express, deps: ServerRouteDeps) {
  const {
    assignSupabaseBuildingToUser,
    assignActiveBuildingSyndic,
    buildBuildingCanonicalKey,
    createBuildingTransferRequest,
    createHallQrOrder,
    createSupabaseBuilding,
    createSupabaseNotification,
    createSupabaseOrderLink,
    createSupabaseSignage,
    deleteSupabaseBuilding,
    deleteSupabaseSignage,
    getSignageById,
    findBuildingByIdentity,
    getActiveBuildingSyndicAssignment,
    getBuildingTransferRequest,
    getHallQrLinkForBuilding,
    getHallQrOrder,
    getSupabaseBuilding,
    getSupabaseBuildingWithSignage,
    getSupabaseUserBuildingByBuildingId,
    getSupabaseUserById,
    listBuildingSyndicAssignments,
    listBuildingTransferRequests,
    listHallQrOrders,
    listHallQrOrdersForBuilding,
    listBuildings: listSupabaseBuildings,
    normalizeSignagePayload,
    removeBuildingFromOrganizationUsers,
    removeBuildingFromUser,
    setSupabaseSignageAfterPhoto,
    unassignActiveBuildingSyndic,
    updateBuilding: updateSupabaseBuilding,
    updateBuildingTransferRequest,
    updateHallQrOrder,
    updateSignage: updateSupabaseSignage,
  } = pickDeps(deps);

  const getActingContext = (req: Request) => {
    const auth = (req as any).authUser;
    const role = String(auth?.role || req.body?.role || req.query?.role || "").trim();
    const userId = Number(auth?.userId || req.body?.userId || req.query?.userId);
    return {
      role,
      userId,
      isAdmin: role === "admin",
      isSyndic: role === "syndic",
    };
  };

  const toOrgOwnerId = (user: any) => Number(user?.parent_id || user?.id || 0);

  const hasBuildingAccess = async (role: string, userId: number, buildingId: number) => {
    if (role === "admin") return true;
    if (!Number.isFinite(userId)) return false;
    const buildings = await listSupabaseBuildings(role, userId);
    return buildings.some((building: any) => Number(building.id) === Number(buildingId));
  };

  const makeAddress = (street: unknown, number: unknown, box: unknown, zip: unknown, city: unknown) => {
    const s = String(street || "").trim();
    const n = String(number || "").trim();
    const b = String(box || "").trim();
    const z = String(zip || "").trim();
    const c = String(city || "").trim();
    return `${s} ${n}${b ? ` bte ${b}` : ""}, ${z} ${c}`.trim();
  };

  const isCodeError = (error: any, code: string) => String((error as any)?.code || "").trim() === code;

  const isTruthyFlag = (value: unknown) => {
    const raw = String(value || "").trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(raw);
  };

  const HALL_QR_OPEN_STATUSES = new Set(["requested", "in_production", "ready_to_install"]);
  const HALL_QR_TERMINAL_STATUSES = new Set(["installed", "cancelled"]);
  const HALL_QR_ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
    requested: new Set(["in_production", "cancelled"]),
    in_production: new Set(["ready_to_install", "cancelled"]),
    ready_to_install: new Set(["installed", "cancelled"]),
    installed: new Set(),
    cancelled: new Set(),
  };

  const normalizeHallQrReason = (value: unknown) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (["replacement_broken", "replacement_update", "replacement_damaged"].includes(normalized)) {
      return normalized;
    }
    return "initial_install";
  };

  const resolveAppBaseUrl = (req: Request) => {
    const env = getServerEnv();
    if (env.appUrl) return env.appUrl.replace(/\/$/, "");
    const origin = String(req.headers.origin || "").trim();
    if (origin) return origin.replace(/\/$/, "");
    const host = String(req.get("host") || "").trim();
    return host ? `${req.protocol}://${host}` : "";
  };

  const createSecureToken = (size = 24) => randomBytes(size).toString("base64url");

  const ensureHallQrLifetimeLink = async (buildingId: number, createdByUserId?: number | null) => {
    const existing = await getHallQrLinkForBuilding(buildingId);
    if (existing) return existing;

    const token = createSecureToken(24);
    return createSupabaseOrderLink(token, buildingId, {
      expiresAt: null,
      createdByUserId: Number.isFinite(Number(createdByUserId)) ? Number(createdByUserId) : null,
      maxUses: 0,
      channel: "qr_hall",
    });
  };

  app.post("/api/buildings/:id/status", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, buildingId))) {
        return res.status(403).json({ error: "Acces refuse." });
      }

      const { status, survey_date } = req.body;
      const building = await getSupabaseBuilding(buildingId);
      const userBuilding = await getSupabaseUserBuildingByBuildingId(buildingId);

      await updateSupabaseBuilding(buildingId, survey_date ? { status, survey_date } : { status });

      if (userBuilding && building) {
        let title = "Mise a jour de votre immeuble";
        let message = `Le statut de l'immeuble ${building.name} a ete mis a jour.`;

        if (status === "survey_completed") {
          title = "Mesurage effectue";
          message = `Nous avons pris le mesurage technique pour l'immeuble ${building.name}. Vous pouvez desormais commander vos plaques en toute confiance.`;
        } else if (status === "in_production") {
          title = "Commande en production";
          message = `La fabrication des plaques pour l'immeuble ${building.name} a commence.`;
        } else if (status === "installed") {
          title = "Plaques installees";
          message = `La signaletique pour l'immeuble ${building.name} a ete posee avec succes.`;
        }

        await createSupabaseNotification({
          user_id: userBuilding.user_id,
          type: "order",
          title,
          message,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to update building status:", error);
      const message =
        error?.message ||
        error?.details ||
        error?.error_description ||
        "Impossible de mettre a jour le statut de l'immeuble.";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/buildings", async (req, res) => {
    const { userId, role } = req.query;
    const buildings = await listSupabaseBuildings(String(role || ""), userId ? Number(userId) : undefined);
    res.json(buildings);
  });

  app.post("/api/buildings", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (!Number.isFinite(ctx.userId)) {
        return res.status(400).json({ error: "Utilisateur invalide." });
      }

      const {
        name,
        street,
        number,
        box,
        zip,
        city,
        syndic_name,
        billing_info,
        notes,
        gestionnaire_nom,
        gestionnaire_email,
        bce_number,
      } = req.body || {};

      if (!name || !street || !number || !zip || !city) {
        return res.status(400).json({ error: "Nom, rue, numero, code postal et ville sont requis." });
      }

      const creator = await getSupabaseUserById(ctx.userId);
      if (!creator) return res.status(404).json({ error: "Utilisateur introuvable." });
      const ownerUserId = toOrgOwnerId(creator);
      const canonicalKey = buildBuildingCanonicalKey({ name, street, number, zip });
      const normalizedBceNumber = String(bce_number || "").trim() || null;
      const address = makeAddress(street, number, box, zip, city);

      const existing = await findBuildingByIdentity({
        bceNumber: normalizedBceNumber,
        canonicalKey,
        name: String(name),
        street: String(street),
        number: String(number),
        zip: String(zip),
      });

      if (existing) {
        const activeAssignment = await getActiveBuildingSyndicAssignment(existing.id);
        const activeSyndicUserId = Number(activeAssignment?.syndic_user_id || 0);

        if (activeAssignment && activeSyndicUserId !== Number(ownerUserId)) {
          const transfer = await createBuildingTransferRequest({
            buildingId: existing.id,
            fromSyndicUserId: activeSyndicUserId || null,
            toSyndicUserId: ownerUserId,
            requestedByUserId: ctx.userId,
            reason: "claim_existing_acp",
          });
          return res.status(409).json({
            error: "Cette ACP est deja geree par un autre syndic. Demande de transfert en attente.",
            buildingId: existing.id,
            transferRequestId: transfer?.id || null,
            transferStatus: transfer?.status || "pending",
          });
        }

        await assignActiveBuildingSyndic(existing.id, ownerUserId, ctx.userId, {
          force: true,
          reason: "existing_acp_recovery",
        });
        await assignSupabaseBuildingToUser(ownerUserId, existing.id);
        if (creator?.parent_id && Number(creator.id) !== Number(ownerUserId)) {
          await assignSupabaseBuildingToUser(creator.id, existing.id);
        }

        if (
          String(existing.canonical_key || "") !== canonicalKey ||
          (normalizedBceNumber && !String(existing.bce_number || "").trim())
        ) {
          await updateSupabaseBuilding(existing.id, {
            canonical_key: canonicalKey,
            bce_number: String(existing.bce_number || "").trim() || normalizedBceNumber,
          });
        }

        return res.json({ id: existing.id, recovered: true, alreadyExisted: true });
      }

      const building = await createSupabaseBuilding({
        name,
        address,
        street,
        number,
        box,
        zip,
        city,
        status: "pending_survey",
        syndic_name,
        billing_info,
        notes,
        gestionnaire_nom,
        gestionnaire_email,
        bce_number: normalizedBceNumber,
        canonical_key: canonicalKey,
        is_new_for_admin: true,
        created_by_user_id: ownerUserId,
      });

      await assignActiveBuildingSyndic(building.id, ownerUserId, ctx.userId, {
        force: true,
        reason: "initial_assignment",
      });
      await assignSupabaseBuildingToUser(ownerUserId, building.id);
      if (creator?.parent_id && Number(creator.id) !== Number(ownerUserId)) {
        await assignSupabaseBuildingToUser(creator.id, building.id);
      }

      res.json({ id: building.id });
    } catch (error: any) {
      console.error("Failed to create building:", error);
      const message =
        error?.message || error?.error_description || error?.details || "Erreur lors de la creation de l'immeuble";
      res.status(500).json({ error: message });
    }
  });

  app.put("/api/buildings/:id", async (req, res) => {
    try {
      const buildingId = Number(req.params.id);
      const ctx = getActingContext(req);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, buildingId))) {
        return res.status(403).json({ error: "Acces refuse." });
      }

      const {
        name,
        street,
        number,
        box,
        zip,
        city,
        syndic_name,
        billing_info,
        notes,
        gestionnaire_nom,
        gestionnaire_email,
        bce_number,
      } = req.body || {};
      const canonicalKey = buildBuildingCanonicalKey({ name, street, number, zip });
      const duplicate = await findBuildingByIdentity({
        bceNumber: String(bce_number || "").trim() || null,
        canonicalKey,
        name: String(name || ""),
        street: String(street || ""),
        number: String(number || ""),
        zip: String(zip || ""),
      });
      if (duplicate && Number(duplicate.id) !== buildingId) {
        return res.status(409).json({ error: "Une ACP existe deja avec ces informations." });
      }

      const address = makeAddress(street, number, box, zip, city);
      await updateSupabaseBuilding(buildingId, {
        name,
        address,
        street,
        number,
        box,
        zip,
        city,
        syndic_name,
        billing_info,
        notes,
        gestionnaire_nom,
        gestionnaire_email,
        bce_number: String(bce_number || "").trim() || null,
        canonical_key: canonicalKey,
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Impossible de modifier l'immeuble." });
    }
  });

  app.get("/api/buildings/:id", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }

      if (ctx.role && !(await hasBuildingAccess(ctx.role, ctx.userId, buildingId))) {
        return res.status(403).json({ error: "Acces refuse." });
      }

      if (req.query.role === "admin") {
        try {
          await updateSupabaseBuilding(buildingId, { is_new_for_admin: false });
        } catch (error) {
          console.error("Failed to mark building as seen for admin:", error);
        }
      }

      const building = await getSupabaseBuildingWithSignage(buildingId);
      if (!building) {
        return res.status(404).json({ error: "Not found" });
      }

      res.json(building);
    } catch (error: any) {
      console.error("Failed to load building detail:", error);
      const message =
        error?.message || error?.details || error?.error_description || "Impossible de charger l'immeuble.";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/buildings/:id/syndic-assignment", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (ctx.role && !(await hasBuildingAccess(ctx.role, ctx.userId, buildingId)) && ctx.role !== "admin") {
        return res.status(403).json({ error: "Acces refuse." });
      }

      const active = await getActiveBuildingSyndicAssignment(buildingId);
      const history = await listBuildingSyndicAssignments(buildingId);
      res.json({ active, history });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Impossible de charger les affectations." });
    }
  });

  app.post("/api/buildings/:id/transfer-request", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (!Number.isFinite(ctx.userId)) {
        return res.status(400).json({ error: "Utilisateur invalide." });
      }

      const requester = await getSupabaseUserById(ctx.userId);
      if (!requester) return res.status(404).json({ error: "Utilisateur introuvable." });
      const toSyndicUserId = toOrgOwnerId(requester);
      const active = await getActiveBuildingSyndicAssignment(buildingId);

      if (!active || Number(active.syndic_user_id) === Number(toSyndicUserId)) {
        await assignActiveBuildingSyndic(buildingId, toSyndicUserId, ctx.userId, {
          force: true,
          reason: "auto_claim_no_conflict",
        });
        await assignSupabaseBuildingToUser(toSyndicUserId, buildingId);
        if (requester?.parent_id && Number(requester.id) !== Number(toSyndicUserId)) {
          await assignSupabaseBuildingToUser(requester.id, buildingId);
        }
        return res.json({ success: true, assigned: true, transferNeeded: false });
      }

      const transfer = await createBuildingTransferRequest({
        buildingId,
        fromSyndicUserId: active.syndic_user_id,
        toSyndicUserId,
        requestedByUserId: ctx.userId,
        reason: String(req.body?.reason || "manual_transfer_request"),
        evidence: String(req.body?.evidence || ""),
      });

      return res.status(202).json({
        success: true,
        assigned: false,
        transferNeeded: true,
        transferRequest: transfer,
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Impossible de creer la demande de transfert." });
    }
  });

  app.get("/api/building-transfer-requests", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      if (!ctx.role) return res.status(400).json({ error: "Role invalide." });
      const requests = await listBuildingTransferRequests(ctx.role, Number.isFinite(ctx.userId) ? ctx.userId : undefined);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Impossible de charger les demandes." });
    }
  });

  app.post("/api/building-transfer-requests/:id/approve", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const requestId = Number(req.params.id);
      if (!Number.isFinite(requestId) || requestId <= 0) {
        return res.status(400).json({ error: "Demande invalide." });
      }
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }

      const transfer = await getBuildingTransferRequest(requestId);
      if (!transfer) return res.status(404).json({ error: "Demande introuvable." });
      if (String(transfer.status) !== "pending") {
        return res.status(409).json({ error: "Cette demande n'est plus en attente." });
      }

      const actingUser = await getSupabaseUserById(ctx.userId);
      const actingOrgUserId = toOrgOwnerId(actingUser);
      if (!ctx.isAdmin && Number(transfer.from_syndic_user_id || 0) !== Number(actingOrgUserId)) {
        return res.status(403).json({ error: "Seul le syndic source ou un admin peut approuver." });
      }

      const fromSyndicUserId = Number(transfer.from_syndic_user_id || 0);
      const toSyndicUserId = Number(transfer.to_syndic_user_id);
      const buildingId = Number(transfer.building_id);

      if (fromSyndicUserId) {
        await unassignActiveBuildingSyndic(buildingId, fromSyndicUserId, {
          reason: "transfer_approved",
          force: true,
        });
        await removeBuildingFromOrganizationUsers(fromSyndicUserId, buildingId);
      }

      await assignActiveBuildingSyndic(buildingId, toSyndicUserId, ctx.userId, {
        force: true,
        reason: "transfer_approved",
      });
      await assignSupabaseBuildingToUser(toSyndicUserId, buildingId);
      await updateBuildingTransferRequest(requestId, {
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_by_user_id: ctx.userId,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Impossible d'approuver le transfert." });
    }
  });

  app.post("/api/building-transfer-requests/:id/reject", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const requestId = Number(req.params.id);
      if (!Number.isFinite(requestId) || requestId <= 0) {
        return res.status(400).json({ error: "Demande invalide." });
      }
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      const transfer = await getBuildingTransferRequest(requestId);
      if (!transfer) return res.status(404).json({ error: "Demande introuvable." });
      if (String(transfer.status) !== "pending") {
        return res.status(409).json({ error: "Cette demande n'est plus en attente." });
      }

      const actingUser = await getSupabaseUserById(ctx.userId);
      const actingOrgUserId = toOrgOwnerId(actingUser);
      const isSourceSyndic = Number(transfer.from_syndic_user_id || 0) === Number(actingOrgUserId);
      const isRequester = Number(transfer.requested_by_user_id || 0) === Number(ctx.userId);
      if (!ctx.isAdmin && !isSourceSyndic && !isRequester) {
        return res.status(403).json({ error: "Action non autorisee." });
      }

      await updateBuildingTransferRequest(requestId, {
        status: isRequester && !ctx.isAdmin && !isSourceSyndic ? "cancelled" : "rejected",
        decided_at: new Date().toISOString(),
        decided_by_user_id: ctx.userId,
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Impossible de rejeter la demande." });
    }
  });

  app.post("/api/buildings/:id/force-transfer", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      if (!ctx.isAdmin) {
        return res.status(403).json({ error: "Acces admin requis." });
      }

      const buildingId = Number(req.params.id);
      const toSyndicUserId = Number(req.body?.toSyndicUserId);
      const reason = String(req.body?.reason || "admin_forced_transfer");
      if (!Number.isFinite(buildingId) || buildingId <= 0 || !Number.isFinite(toSyndicUserId) || toSyndicUserId <= 0) {
        return res.status(400).json({ error: "Parametres invalides." });
      }

      const active = await getActiveBuildingSyndicAssignment(buildingId);
      if (active?.syndic_user_id) {
        await unassignActiveBuildingSyndic(buildingId, active.syndic_user_id, {
          reason,
          force: true,
        });
        await removeBuildingFromOrganizationUsers(active.syndic_user_id, buildingId);
      }

      await assignActiveBuildingSyndic(buildingId, toSyndicUserId, ctx.userId, {
        force: true,
        reason,
      });
      await assignSupabaseBuildingToUser(toSyndicUserId, buildingId);

      const transfer = await createBuildingTransferRequest({
        buildingId,
        fromSyndicUserId: active?.syndic_user_id || null,
        toSyndicUserId,
        requestedByUserId: ctx.userId,
        reason,
      });

      await updateBuildingTransferRequest(transfer.id, {
        status: "forced",
        forced_by_admin: true,
        force_note: reason,
        decided_at: new Date().toISOString(),
        decided_by_user_id: ctx.userId,
      });

      return res.json({ success: true, transferRequestId: transfer.id });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Impossible de forcer le transfert." });
    }
  });

  app.get("/api/buildings/:id/hall-qr", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, buildingId))) {
        return res.status(403).json({ error: "Acces refuse." });
      }

      const link = await getHallQrLinkForBuilding(buildingId);
      const orders = await listHallQrOrdersForBuilding(buildingId);
      const latestOrder = orders[0] || null;
      const openOrder = orders.find((order: any) => HALL_QR_OPEN_STATUSES.has(String(order.status || ""))) || null;
      const appBaseUrl = resolveAppBaseUrl(req);
      const qrUrl = link && appBaseUrl ? `${appBaseUrl}/order/${link.token}` : null;

      return res.json({
        exists: Boolean(link),
        qr_url: qrUrl,
        token: link?.token || null,
        latest_order: latestOrder,
        open_order: openOrder,
        has_installed_order: orders.some((order: any) => String(order.status || "") === "installed"),
        history_count: orders.length,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Impossible de charger l'etat QR hall." });
    }
  });

  app.post("/api/buildings/:id/hall-qr/request", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, buildingId))) {
        return res.status(403).json({ error: "Acces refuse." });
      }

      const reason = normalizeHallQrReason(req.body?.reason);
      const notes = String(req.body?.notes || "").trim() || null;
      const existingLink = await getHallQrLinkForBuilding(buildingId);
      const orderHistory = await listHallQrOrdersForBuilding(buildingId);
      const hasInstalledOrder = orderHistory.some((order: any) => String(order.status || "") === "installed");
      const openOrder = orderHistory.find((order: any) => HALL_QR_OPEN_STATUSES.has(String(order.status || ""))) || null;

      if (!existingLink && reason !== "initial_install") {
        return res.status(409).json({
          error: "Aucun QR hall existant pour cette ACP. Lancez d'abord une commande initiale.",
        });
      }

      if (existingLink && reason === "initial_install" && hasInstalledOrder) {
        const appBaseUrl = resolveAppBaseUrl(req);
        return res.status(409).json({
          error: "Un QR hall existe deja pour cette ACP. Utilisez une commande de remplacement.",
          qr_url: appBaseUrl ? `${appBaseUrl}/order/${existingLink.token}` : null,
        });
      }

      if (openOrder) {
        return res.status(409).json({
          error: "Une commande QR hall est deja en cours pour cette ACP.",
          order: openOrder,
        });
      }

      const order = await createHallQrOrder({
        buildingId,
        orderLinkToken: existingLink?.token || null,
        requestedByUserId: ctx.userId,
        requestedByRole: ctx.isAdmin ? "admin" : "syndic",
        reason,
        isReplacement: reason !== "initial_install",
        notes,
      });

      const building = await getSupabaseBuilding(buildingId);
      await createSupabaseNotification({
        type: "hall_qr",
        title: "Commande QR Hall",
        message: `Nouvelle commande QR hall (${reason}) pour ${building?.name || `ACP #${buildingId}`}.`,
      });

      const appBaseUrl = resolveAppBaseUrl(req);
      return res.json({
        success: true,
        order,
        qr_url: existingLink && appBaseUrl ? `${appBaseUrl}/order/${existingLink.token}` : null,
        token: existingLink?.token || null,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Impossible de creer la commande QR hall." });
    }
  });

  app.post("/api/buildings/:id/hall-qr/link", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (!ctx.isAdmin) {
        return res.status(403).json({ error: "Acces admin requis." });
      }
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, buildingId))) {
        return res.status(403).json({ error: "Acces refuse." });
      }

      const building = await getSupabaseBuilding(buildingId);
      if (!building) return res.status(404).json({ error: "Immeuble introuvable." });

      const existingLink = await getHallQrLinkForBuilding(buildingId);
      const hallQrLink = await ensureHallQrLifetimeLink(buildingId, Number.isFinite(ctx.userId) ? ctx.userId : null);
      const appBaseUrl = resolveAppBaseUrl(req);
      return res.json({
        success: true,
        created: !Boolean(existingLink),
        token: hallQrLink.token,
        qr_url: appBaseUrl ? `${appBaseUrl}/order/${hallQrLink.token}` : null,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Impossible de generer le lien QR hall." });
    }
  });

  app.get("/api/hall-qr/orders", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      const orders = await listHallQrOrders(ctx.role, Number.isFinite(ctx.userId) ? ctx.userId : undefined);
      return res.json(orders);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Impossible de charger les commandes QR hall." });
    }
  });

  app.patch("/api/hall-qr/orders/:id/status", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      if (!ctx.isAdmin) {
        return res.status(403).json({ error: "Acces admin requis." });
      }

      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Commande invalide." });
      }

      const nextStatus = String(req.body?.status || "").trim().toLowerCase();
      if (!HALL_QR_ALLOWED_TRANSITIONS[nextStatus] && !HALL_QR_TERMINAL_STATUSES.has(nextStatus) && !HALL_QR_OPEN_STATUSES.has(nextStatus)) {
        return res.status(400).json({ error: "Statut QR hall invalide." });
      }

      const order = await getHallQrOrder(orderId);
      if (!order) return res.status(404).json({ error: "Commande QR hall introuvable." });
      const currentStatus = String(order.status || "").trim().toLowerCase();
      if (currentStatus === nextStatus) return res.json({ success: true, order });
      if (HALL_QR_TERMINAL_STATUSES.has(currentStatus)) {
        return res.status(409).json({ error: "Commande terminee, transition impossible." });
      }
      if (!(HALL_QR_ALLOWED_TRANSITIONS[currentStatus]?.has(nextStatus))) {
        return res.status(409).json({ error: `Transition invalide (${currentStatus} -> ${nextStatus}).` });
      }

      const nowIso = new Date().toISOString();
      const notes = String(req.body?.notes || "").trim();
      const payload: Record<string, unknown> = {
        status: nextStatus,
        processed_by_user_id: ctx.userId,
      };

      if (["in_production", "ready_to_install", "installed"].includes(nextStatus) && !order.order_link_token) {
        const link = await ensureHallQrLifetimeLink(Number(order.building_id), Number.isFinite(ctx.userId) ? ctx.userId : null);
        payload.order_link_token = link.token;
      }

      if (HALL_QR_TERMINAL_STATUSES.has(nextStatus)) payload.processed_at = nowIso;
      if (nextStatus === "installed") payload.installed_at = nowIso;
      if (notes) payload.notes = notes;

      const updated = await updateHallQrOrder(orderId, payload);
      const building = await getSupabaseBuilding(Number(order.building_id));
      const userBuilding = await getSupabaseUserBuildingByBuildingId(Number(order.building_id));
      if (userBuilding?.user_id) {
        await createSupabaseNotification({
          user_id: userBuilding.user_id,
          type: "hall_qr",
          title: "Mise a jour QR hall",
          message: `Commande QR hall ${building?.name || `ACP #${order.building_id}`}: ${nextStatus}.`,
        });
      }

      const appBaseUrl = resolveAppBaseUrl(req);
      const linkToken = String(updated?.order_link_token || "").trim();
      return res.json({
        success: true,
        order: updated,
        qr_url: linkToken && appBaseUrl ? `${appBaseUrl}/order/${linkToken}` : null,
        token: linkToken || null,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Impossible de mettre a jour la commande QR hall." });
    }
  });

  app.post("/api/buildings/:id/signage", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, buildingId))) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      const signagePayload = normalizeSignagePayload(req.body);
      const signage = await createSupabaseSignage({
        building_id: buildingId,
        ...signagePayload,
      });
      res.json({ id: signage.id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/signage/:id", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const signage = await getSignageById(req.params.id);
      if (!signage) return res.status(404).json({ error: "Plaquette introuvable." });
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, Number(signage.building_id)))) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      const signagePayload = normalizeSignagePayload(req.body);
      await updateSupabaseSignage(req.params.id, signagePayload);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/signage/:id", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const signage = await getSignageById(req.params.id);
      if (!signage) return res.status(404).json({ error: "Plaquette introuvable." });
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, Number(signage.building_id)))) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      await deleteSupabaseSignage(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/signage/:id/after-photo", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const signage = await getSignageById(req.params.id);
      if (!signage) return res.status(404).json({ error: "Plaquette introuvable." });
      if (!(await hasBuildingAccess(ctx.role, ctx.userId, Number(signage.building_id)))) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      await setSupabaseSignageAfterPhoto(req.params.id, req.body.image);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/buildings/:id", async (req, res) => {
    try {
      const ctx = getActingContext(req);
      const buildingId = Number(req.params.id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }

      if (ctx.isAdmin && isTruthyFlag(req.query.hardDelete ?? req.body?.hardDelete)) {
        await deleteSupabaseBuilding(buildingId);
        return res.json({ success: true, deleted: true });
      }

      if (!["admin", "syndic"].includes(ctx.role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (!Number.isFinite(ctx.userId)) {
        return res.status(400).json({ error: "Utilisateur invalide." });
      }

      const user = await getSupabaseUserById(ctx.userId);
      if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
      const orgOwnerUserId = toOrgOwnerId(user);

      try {
        await unassignActiveBuildingSyndic(buildingId, orgOwnerUserId, {
          reason: ctx.isAdmin ? "admin_detach" : "syndic_detach",
          force: ctx.isAdmin,
        });
      } catch (error: any) {
        if (!isCodeError(error, "NOT_ACTIVE_SYNDIC")) throw error;
      }

      if (ctx.isAdmin) {
        await removeBuildingFromUser(ctx.userId, buildingId);
      } else {
        await removeBuildingFromOrganizationUsers(orgOwnerUserId, buildingId);
      }

      await updateSupabaseBuilding(buildingId, {
        archived_at: new Date().toISOString(),
      });

      res.json({ success: true, detached: true });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Impossible de retirer cette ACP de votre gestion." });
    }
  });
}
