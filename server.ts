import express from "express";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import archiver from "archiver";
import { getServerEnv, loadServerEnv } from "./server/env";
import { generateEmailTemplate } from "./server/services/email-service";
import { parseOrderDetailsPayload, serializeOrderDetailsPayload } from "./server/services/order-details";
import { verifySessionToken } from "./server/services/session-token";
import {
  createOwnerApprovalToken,
  OWNER_APPROVAL_PENDING_STATUSES,
  verifyOwnerApprovalToken,
} from "./server/services/owner-approval";
import { normalizeSignagePayload } from "./server/services/signage";
import { getSupabaseSyncStatus } from "./server/supabase";
import { registerSupabaseAuthRoutes } from "./server/routes/auth-routes";
import { registerSupabaseBuildingRoutes } from "./server/routes/building-routes";
import { registerSupabaseNotificationRoutes } from "./server/routes/notification-routes";
import { registerSupabaseOrderRoutes } from "./server/routes/order-routes";
import type { ServerRouteDeps } from "./server/routes/route-deps";
import { registerSupabaseUserRoutes } from "./server/routes/user-routes";
import {
  assignActiveBuildingSyndic as assignActiveSupabaseBuildingSyndic,
  createBuilding as createSupabaseBuilding,
  createBuildingTransferRequest as createSupabaseBuildingTransferRequest,
  createNotification as createSupabaseNotification,
  createOrder as createSupabaseOrder,
  createOrderLink as createSupabaseOrderLink,
  createHallQrOrder as createSupabaseHallQrOrder,
  consumeOrderLink as consumeSupabaseOrderLink,
  createSignage as createSupabaseSignage,
  createUser as createSupabaseUser,
  deleteBuilding as deleteSupabaseBuilding,
  deleteNotification as deleteSupabaseNotification,
  deleteSignage as deleteSupabaseSignage,
  getSignageById,
  createBugReport,
  listBugReports,
  updateBugReport,
  deleteBugReport,
  getStats,
  deleteUser as deleteSupabaseUser,
  emailExists as supabaseEmailExists,
  findBuildingByIdentity as findSupabaseBuildingByIdentity,
  getBuilding as getSupabaseBuilding,
  getActiveBuildingSyndicAssignment as getSupabaseActiveBuildingSyndicAssignment,
  getBuildingWithSignage as getSupabaseBuildingWithSignage,
  getBuildingTransferRequest as getSupabaseBuildingTransferRequest,
  getOrder as getSupabaseOrder,
  getOrderLink as getSupabaseOrderLink,
  getHallQrLinkForBuilding as getSupabaseHallQrLinkForBuilding,
  getHallQrOrder as getSupabaseHallQrOrder,
  getOpenHallQrOrderForBuilding as getSupabaseOpenHallQrOrderForBuilding,
  getUserBuildingByBuildingId as getSupabaseUserBuildingByBuildingId,
  getUserByEmail as getSupabaseUserByEmail,
  getUserById as getSupabaseUserById,
  getUserByResetToken as getSupabaseUserByResetToken,
  getUserByVerificationToken as getSupabaseUserByVerificationToken,
  isMissingFullAccessColumnError,
  isSupabasePrimaryEnabled,
  listBuildings as listSupabaseBuildings,
  listNotifications as listSupabaseNotifications,
  listOrders as listSupabaseOrders,
  listHallQrOrders as listSupabaseHallQrOrders,
  listHallQrOrdersForBuilding as listSupabaseHallQrOrdersForBuilding,
  listOrdersForExport as listSupabaseOrdersForExport,
  listSignageForBuilding as listSupabaseSignageForBuilding,
  listBuildingSyndicAssignments as listSupabaseBuildingSyndicAssignments,
  listBuildingTransferRequests as listSupabaseBuildingTransferRequests,
  listSyndicUsers as listSupabaseSyndicUsers,
  listTeamMembers as listSupabaseTeamMembers,
  markAllNotificationsRead as markAllSupabaseNotificationsRead,
  markNotificationRead as markSupabaseNotificationRead,
  buildBuildingCanonicalKey,
  linkOwnerToBuilding as linkOwnerToSupabaseBuilding,
  listOwnersForBuilding as listSupabaseOwnersForBuilding,
  removeBuildingFromOrganizationUsers as removeSupabaseBuildingFromOrganizationUsers,
  removeBuildingFromUser as removeSupabaseBuildingFromUser,
  setSignageAfterPhoto as setSupabaseSignageAfterPhoto,
  unlinkOwnerFromBuilding as unlinkSupabaseOwnerFromBuilding,
  unassignActiveBuildingSyndic as unassignActiveSupabaseBuildingSyndic,
  upsertOwnerForOrganization as upsertSupabaseOwnerForOrganization,
  updateBuilding as updateSupabaseBuilding,
  updateBuildingTransferRequest as updateSupabaseBuildingTransferRequest,
  updateOrder as updateSupabaseOrder,
  updateHallQrOrder as updateSupabaseHallQrOrder,
  updateOrderIfStatusIn as updateSupabaseOrderIfStatusIn,
  updateSignage as updateSupabaseSignage,
  updateUser as updateSupabaseUser,
  assignBuildingToUser as assignSupabaseBuildingToUser,
  replaceUserBuildings as replaceSupabaseUserBuildings,
} from "./server/supabase-primary";

loadServerEnv();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

const resend = new Resend(process.env.RESEND_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const supabaseStatus = getSupabaseSyncStatus();
  const serverEnv = getServerEnv();
  const sessionSecret = serverEnv.sessionSecret || serverEnv.supabaseServiceRoleKey;
  const strictAuth = serverEnv.authRequired || serverEnv.nodeEnv === "production";
  const strictCors = serverEnv.corsStrict || serverEnv.nodeEnv === "production";
  const allowedOrigins = new Set(serverEnv.corsAllowedOrigins);
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();

  if (serverEnv.nodeEnv === "production") {
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "plachet", env: serverEnv.nodeEnv });
  });

  app.use((req, res, next) => {
    const origin = String(req.headers.origin || "").trim();
    if (!origin) {
      return next();
    }

    const isAllowedOrigin = allowedOrigins.size === 0 ? !strictCors : allowedOrigins.has(origin);
    if (!isAllowedOrigin) {
      if (strictCors && req.path.startsWith("/api/")) {
        return res.status(403).json({ error: "Origin non autorisee." });
      }
      return next();
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Export-Token");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    return next();
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();

    const now = Date.now();
    if (rateBuckets.size > 2000) {
      for (const [key, value] of rateBuckets.entries()) {
        if (now > value.resetAt) rateBuckets.delete(key);
      }
    }
    const forwardedFor = String(req.headers["x-forwarded-for"] || "");
    const ip = forwardedFor.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const isAuthRoute = req.path === "/api/auth/login" || req.path === "/api/auth/forgot-password" || req.path === "/api/auth/reset-password";
    const windowMs = isAuthRoute ? serverEnv.authRateLimitWindowMs : serverEnv.rateLimitWindowMs;
    const maxRequests = isAuthRoute ? serverEnv.authRateLimitMax : serverEnv.rateLimitMax;
    const bucketKey = `${ip}:${isAuthRoute ? "auth" : "api"}`;
    const bucket = rateBuckets.get(bucketKey);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Trop de requetes, veuillez reessayer plus tard." });
    }

    bucket.count += 1;
    return next();
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();

    const publicRoutes = [
      req.path === "/api/auth/login",
      req.path === "/api/auth/register",
      req.path === "/api/auth/forgot-password",
      req.path === "/api/auth/reset-password",
      req.path === "/api/auth/verify",
      req.path.startsWith("/api/order-links/"),
      req.path === "/api/orders/owner-approval",
      req.path === "/api/contact",
      req.path === "/api/orders" && req.method === "POST",
      req.path === "/api/integrations/supabase/status",
    ];
    if (publicRoutes.some(Boolean)) return next();

    const path = req.path;
    const method = req.method.toUpperCase();
    const isAdminOnlyRoute = (() => {
      if (path === "/api/users" && (method === "GET" || method === "POST")) return true;
      if (/^\/api\/buildings\/\d+\/status$/.test(path) && method === "POST") return true;
      if (/^\/api\/orders\/\d+\/status$/.test(path) && method === "PATCH") return true;
      return false;
    })();

    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      if (!strictAuth) return next();
      return res.status(401).json({ error: "Authentification requise." });
    }

    try {
      const payload = verifySessionToken(token, sessionSecret);
      (req as any).authUser = payload;
      const authUserId = Number(payload.userId);
      const authRole = String(payload.role || "");
      if (isAdminOnlyRoute && authRole !== "admin") {
        return res.status(403).json({ error: "Acces reserve a l'administrateur." });
      }

      const queryUserId = req.query.userId ? Number(req.query.userId) : null;
      const queryRole = req.query.role ? String(req.query.role) : null;
      const bodyUserId = req.body && req.body.userId ? Number(req.body.userId) : null;
      const bodyRole = req.body && req.body.role ? String(req.body.role) : null;

      if (queryUserId != null && Number.isFinite(queryUserId) && queryUserId !== authUserId) {
        return res.status(403).json({ error: "Utilisateur non autorisé." });
      }
      if (bodyUserId != null && Number.isFinite(bodyUserId) && bodyUserId !== authUserId) {
        return res.status(403).json({ error: "Utilisateur non autorisé." });
      }
      if (queryRole && queryRole !== authRole) {
        return res.status(403).json({ error: "Role non autorisé." });
      }
      if (bodyRole && bodyRole !== authRole) {
        return res.status(403).json({ error: "Role non autorisé." });
      }

      if (!req.query.userId) (req.query as any).userId = String(authUserId);
      if (!req.query.role) (req.query as any).role = authRole;
      if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
        if (!req.body.userId) req.body.userId = authUserId;
        if (!req.body.role) req.body.role = authRole;
      }

      return next();
    } catch (_error) {
      if (!strictAuth) return next();
      return res.status(401).json({ error: "Session invalide ou expirée." });
    }
  });

  if (!isSupabasePrimaryEnabled()) {
    throw new Error("Supabase doit etre configure comme base principale pour demarrer le serveur.");
  }

  const routeDeps = {
    OWNER_APPROVAL_PENDING_STATUSES,
    assignSupabaseBuildingToUser,
    assignActiveBuildingSyndic: assignActiveSupabaseBuildingSyndic,
    bcrypt,
    buildBuildingCanonicalKey,
    createBuildingTransferRequest: createSupabaseBuildingTransferRequest,
    createOwnerApprovalToken,
    createSupabaseBuilding,
    createSupabaseNotification,
    createSupabaseOrder,
    createSupabaseOrderLink,
    createHallQrOrder: createSupabaseHallQrOrder,
    consumeSupabaseOrderLink,
    createSupabaseSignage,
    createSupabaseUser,
    crypto,
    deleteSupabaseBuilding,
    deleteSupabaseNotification,
    deleteSupabaseSignage,
    deleteSupabaseUser,
    findBuildingByIdentity: findSupabaseBuildingByIdentity,
    generateEmailTemplate,
    getActiveBuildingSyndicAssignment: getSupabaseActiveBuildingSyndicAssignment,
    getSignageById,
    createBugReport,
    listBugReports,
    updateBugReport,
    deleteBugReport,
    getStats,
    getSupabaseBuilding,
    getSupabaseBuildingWithSignage,
    getBuildingTransferRequest: getSupabaseBuildingTransferRequest,
    getSupabaseOrder,
    getSupabaseOrderLink,
    getHallQrLinkForBuilding: getSupabaseHallQrLinkForBuilding,
    getHallQrOrder: getSupabaseHallQrOrder,
    getOpenHallQrOrderForBuilding: getSupabaseOpenHallQrOrderForBuilding,
    getSupabaseUserBuildingByBuildingId,
    getSupabaseUserByEmail,
    getSupabaseUserById,
    getSupabaseUserByResetToken,
    getSupabaseUserByVerificationToken,
    isMissingFullAccessColumnError,
    listNotifications: listSupabaseNotifications,
    listOrders: listSupabaseOrders,
    listHallQrOrders: listSupabaseHallQrOrders,
    listHallQrOrdersForBuilding: listSupabaseHallQrOrdersForBuilding,
    listOrdersForExport: listSupabaseOrdersForExport,
    listOwnersForBuilding: listSupabaseOwnersForBuilding,
    listSignageForBuilding: listSupabaseSignageForBuilding,
    listBuildings: listSupabaseBuildings,
    listBuildingSyndicAssignments: listSupabaseBuildingSyndicAssignments,
    listBuildingTransferRequests: listSupabaseBuildingTransferRequests,
    listSyndicUsers: listSupabaseSyndicUsers,
    listTeamMembers: listSupabaseTeamMembers,
    markAllNotificationsRead: markAllSupabaseNotificationsRead,
    markNotificationRead: markSupabaseNotificationRead,
    normalizeSignagePayload,
    parseOrderDetailsPayload,
    replaceUserBuildings: replaceSupabaseUserBuildings,
    resend,
    removeBuildingFromOrganizationUsers: removeSupabaseBuildingFromOrganizationUsers,
    removeBuildingFromUser: removeSupabaseBuildingFromUser,
    serializeOrderDetailsPayload,
    setSupabaseSignageAfterPhoto,
    supabaseEmailExists,
    unlinkOwnerFromBuilding: unlinkSupabaseOwnerFromBuilding,
    upsertOwnerForOrganization: upsertSupabaseOwnerForOrganization,
    linkOwnerToBuilding: linkOwnerToSupabaseBuilding,
    updateBuilding: updateSupabaseBuilding,
    updateBuildingTransferRequest: updateSupabaseBuildingTransferRequest,
    updateOrder: updateSupabaseOrder,
    updateHallQrOrder: updateSupabaseHallQrOrder,
    updateOrderIfStatusIn: updateSupabaseOrderIfStatusIn,
    updateSignage: updateSupabaseSignage,
    unassignActiveBuildingSyndic: unassignActiveSupabaseBuildingSyndic,
    updateUser: updateSupabaseUser,
    verifyOwnerApprovalToken,
  } satisfies ServerRouteDeps;

  registerSupabaseAuthRoutes(app, routeDeps);
  registerSupabaseBuildingRoutes(app, routeDeps);
  registerSupabaseOrderRoutes(app, routeDeps);
  registerSupabaseUserRoutes(app, routeDeps);
  registerSupabaseNotificationRoutes(app, routeDeps);

  app.get("/api/integrations/supabase/status", (_req, res) => {
    res.json({
      mode: "supabase",
      configured: supabaseStatus.configured,
      enabled: true,
      syncEnabled: false,
    });
  });

  // Export Source Code API - disabled in production
  app.get("/api/export-code", (req, res) => {
    if (serverEnv.nodeEnv === "production" || !serverEnv.exportCodeEnabled) {
      return res.status(404).json({ error: "Not found" });
    }
    if (serverEnv.exportCodeToken) {
      const providedToken = String(req.headers["x-export-token"] || "");
      if (!providedToken || providedToken !== serverEnv.exportCodeToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    res.attachment("plachet-source-code.zip");
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.on("error", (err) => {
      res.status(500).send({ error: err.message });
    });
    
    archive.pipe(res);
    
    // Add the entire project directory, excluding node_modules, dist, and .git
    archive.glob("**/*", {
      cwd: process.cwd(),
      ignore: ["node_modules/**", "dist/**", ".git/**", "plachet.db", "plachet.db-journal"]
    });
    
    archive.finalize();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (isSupabasePrimaryEnabled()) {
      console.log("Supabase is the primary database.");
    } else if (supabaseStatus.enabled) {
      console.log("Supabase sync is enabled.");
    } else if (supabaseStatus.configured) {
      console.log("Supabase is configured but live sync is disabled.");
    } else {
      console.log("Supabase is not configured.");
    }
  });
}

startServer();
