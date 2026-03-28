import type bcrypt from "bcryptjs";
import type crypto from "crypto";
import type { Resend } from "resend";

export type ServerRouteDeps = {
  OWNER_APPROVAL_PENDING_STATUSES: Set<string>;
  assignSupabaseBuildingToUser: (userId: number | string, buildingId: number | string) => Promise<unknown>;
  assignActiveBuildingSyndic: (
    buildingId: number | string,
    syndicUserId: number | string,
    assignedByUserId?: number | string | null,
    options?: { force?: boolean; reason?: string },
  ) => Promise<any>;
  bcrypt: typeof bcrypt;
  buildBuildingCanonicalKey: (input: {
    name?: unknown;
    zip?: unknown;
    number?: unknown;
    street?: unknown;
  }) => string;
  createBuildingTransferRequest: (payload: {
    buildingId: number | string;
    fromSyndicUserId?: number | string | null;
    toSyndicUserId: number | string;
    requestedByUserId: number | string;
    reason?: string | null;
    evidence?: string | null;
    expiresAt?: string | null;
  }) => Promise<any>;
  createOwnerApprovalToken: (orderId: number | string, ownerEmail: string) => string;
  createSupabaseBuilding: (payload: Record<string, unknown>) => Promise<any>;
  createSupabaseNotification: (payload: Record<string, unknown>) => Promise<any>;
  createSupabaseOrder: (payload: Record<string, unknown>) => Promise<any>;
  createSupabaseOrderLink: (
    token: string,
    buildingId: number | string,
    options?: {
      expiresAt?: string | null;
      createdByUserId?: number | string | null;
      maxUses?: number | null;
      channel?: string | null;
    },
  ) => Promise<any>;
  consumeSupabaseOrderLink: (token: string, expectedBuildingId?: number | string) => Promise<any>;
  getHallQrLinkForBuilding: (buildingId: number | string) => Promise<any>;
  createHallQrOrder: (payload: {
    buildingId: number | string;
    orderLinkToken?: string | null;
    requestedByUserId: number | string;
    requestedByRole: "syndic" | "admin";
    reason: string;
    isReplacement?: boolean;
    notes?: string | null;
  }) => Promise<any>;
  listHallQrOrders: (role: string, userId?: number) => Promise<any[]>;
  listHallQrOrdersForBuilding: (buildingId: number | string) => Promise<any[]>;
  getOpenHallQrOrderForBuilding: (buildingId: number | string) => Promise<any>;
  getHallQrOrder: (id: number | string) => Promise<any>;
  updateHallQrOrder: (id: number | string, payload: Record<string, unknown>) => Promise<any>;
  linkOwnerToBuilding: (buildingId: number | string, ownerId: number | string, reference: string) => Promise<any>;
  listOwnersForBuilding: (buildingId: number | string) => Promise<any[]>;
  createSupabaseSignage: (payload: Record<string, unknown>) => Promise<any>;
  createSupabaseUser: (payload: Record<string, unknown>) => Promise<any>;
  crypto: typeof crypto;
  db?: any;
  deleteSupabaseBuilding: (id: number | string) => Promise<unknown>;
  deleteSupabaseNotification: (id: number | string) => Promise<unknown>;
  deleteSupabaseSignage: (id: number | string) => Promise<unknown>;
  deleteSupabaseUser: (id: number | string) => Promise<unknown>;
  findBuildingByIdentity: (identity: {
    bceNumber?: string | null;
    canonicalKey?: string | null;
    name?: string | null;
    street?: string | null;
    number?: string | null;
    zip?: string | null;
  }) => Promise<any>;
  generateEmailTemplate: (title: string, content: string) => string;
  getActiveBuildingSyndicAssignment: (buildingId: number | string) => Promise<any>;
  getSignageById: (id: number | string) => Promise<any>;
  getSupabaseBuilding: (id: number | string) => Promise<any>;
  getSupabaseBuildingWithSignage: (id: number | string) => Promise<any>;
  getSupabaseOrder: (id: number | string) => Promise<any>;
  getSupabaseOrderLink: (token: string) => Promise<any>;
  getBuildingTransferRequest: (id: number | string) => Promise<any>;
  getSupabaseUserBuildingByBuildingId: (buildingId: number | string) => Promise<any>;
  getSupabaseUserByEmail: (email: string) => Promise<any>;
  getSupabaseUserById: (id: number | string) => Promise<any>;
  getSupabaseUserByResetToken: (token: string, isoNow: string) => Promise<any>;
  getSupabaseUserByVerificationToken: (token: string) => Promise<any>;
  isMissingFullAccessColumnError: (error: unknown) => boolean;
  listNotifications: (role: string, userId?: number) => Promise<any[]>;
  listOrders: (role: string, userId?: number) => Promise<any[]>;
  listOrdersForExport: () => Promise<any[]>;
  listSignageForBuilding: (buildingId: number | string) => Promise<any[]>;
  listBuildings: (role: string, userId?: number) => Promise<any[]>;
  listBuildingSyndicAssignments: (buildingId: number | string) => Promise<any[]>;
  listBuildingTransferRequests: (role: string, userId?: number) => Promise<any[]>;
  listSyndicUsers: () => Promise<any[]>;
  listTeamMembers: (userId: number | string) => Promise<any[]>;
  markAllNotificationsRead: (role: string, userId?: number) => Promise<unknown>;
  markNotificationRead: (id: number | string) => Promise<unknown>;
  normalizeSignagePayload: (payload: Record<string, unknown>) => Record<string, unknown>;
  parseOrderDetailsPayload: (raw: unknown) => { items: any[]; meta: Record<string, unknown> };
  queueSupabaseDelete?: (table: string, criteria: Record<string, unknown>) => void;
  replaceUserBuildings: (userId: number | string, buildingIds: Array<number | string>) => Promise<unknown>;
  resend: Resend;
  removeBuildingFromOrganizationUsers: (
    organizationUserId: number | string,
    buildingId: number | string,
  ) => Promise<{ success: boolean; removed: number }>;
  removeBuildingFromUser: (userId: number | string, buildingId: number | string) => Promise<{ success: boolean }>;
  selectRowById?: (...args: any[]) => any;
  selectRowsByIds?: (...args: any[]) => any[];
  serializeOrderDetailsPayload: (details: unknown, meta?: Record<string, unknown>) => string;
  setSupabaseSignageAfterPhoto: (id: number | string, image: string) => Promise<unknown>;
  supabaseEmailExists: (email: string) => Promise<boolean>;
  syncTableRowById?: (...args: any[]) => void;
  syncTableRows?: (...args: any[]) => void;
  unlinkOwnerFromBuilding: (buildingId: number | string, ownerId: number | string) => Promise<unknown>;
  upsertOwnerForOrganization: (organizationUserId: number | string, name: string, email?: string | null) => Promise<any>;
  updateBuilding: (id: number | string, payload: Record<string, unknown>) => Promise<any>;
  updateOrder: (id: number | string, payload: Record<string, unknown>) => Promise<any>;
  updateOrderIfStatusIn: (
    id: number | string,
    payload: Record<string, unknown>,
    allowedStatuses: string[],
  ) => Promise<any>;
  updateBuildingTransferRequest: (id: number | string, payload: Record<string, unknown>) => Promise<any>;
  updateSignage: (id: number | string, payload: Record<string, unknown>) => Promise<any>;
  unassignActiveBuildingSyndic: (
    buildingId: number | string,
    syndicUserId: number | string,
    options?: { reason?: string; force?: boolean },
  ) => Promise<any>;
  updateUser: (id: number | string, payload: Record<string, unknown>) => Promise<any>;
  verifyOwnerApprovalToken: (token: string) => { orderId: string; ownerEmail: string; exp: number };
  createBugReport: (payload: Record<string, unknown>) => Promise<any>;
  listBugReports: () => Promise<any[]>;
  updateBugReport: (id: number | string, payload: Record<string, unknown>) => Promise<any>;
  deleteBugReport: (id: number | string) => Promise<unknown>;
  getStats: () => Promise<{ orders: any[]; buildings: any[]; users: any[]; bugReports: any[] }>;
};

export const pickDeps = (deps: ServerRouteDeps) => deps;
