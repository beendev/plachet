import React, { useEffect, useState } from 'react';
import { BuildingAccessPicker } from '../../components/admin/BuildingAccessPicker';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Check,
  ChevronRight,
  Copy,
  Edit,
  ExternalLink,
  FileText,
  Layers,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Mail,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  QrCode,
  ShoppingCart,
  Sparkles,
  Trash,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  Wrench,
  X,
} from 'lucide-react';
import {
  ENABLE_NEW_SYNDIC_DASHBOARD,
  extractSignageMetaFromNotes,
  getOrderItemLines,
  OWNER_VALIDATION_PENDING_STATUSES,
  buildFullName,
  getBuildingStatusClass,
  getBuildingStatusLabel,
  getColorHex,
  getDashboardHook,
  getDisplayName,
  getNotificationCategory,
  getNotificationCategoryLabel,
  getOrderStatusClass,
  getOrderStatusLabel,
  getRequesterQualityLabel,
  injectSignageMetaInNotes,
  isActiveFlag,
  normalizeSearchText,
  parseOrderDetails,
  PREDEFINED_COLORS,
} from '../../lib/app-helpers';
import { buildPublicOrderUrl } from '../../lib/url-config';

const PT_TO_MM_BY_FONT: Record<string, number> = {
  arial: 0.112,
  helvetica: 0.111,
  roboto: 0.115,
  univers: 0.111,
  din: 0.11,
  frutiger: 0.111,
};

const FORCE_TRANSFER_REASON_PRESETS = [
  { value: 'urgence_mandat', label: 'Urgence mandat' },
  { value: 'changement_syndic', label: 'Changement syndic' },
  { value: 'blocage_transfert', label: 'Blocage transfert' },
];

const getCalibratedPtToMm = (font: unknown) => {
  const key = String(font || '').trim().toLowerCase();
  return PT_TO_MM_BY_FONT[key] || 0.112;
};

const clampMaxLinesForOrder = (value: unknown) => {
  const parsed = Number(value || 2);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(8, Math.floor(parsed)));
};

const normalizeOrderLines = (lines: unknown, fallback = '') => {
  if (Array.isArray(lines)) {
    const cleaned = lines.map((line) => String(line ?? '')).map((line) => line.trim()).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }
  const fallbackLine = String(fallback || '').trim();
  return fallbackLine ? [fallbackLine] : [];
};

const buildOrderEditorLines = (lines: unknown, fallback: string, maxLines: number) => {
  const rawLines = Array.isArray(lines)
    ? lines.map((line) => String(line ?? ''))
    : [];
  if (rawLines.length === 0) {
    rawLines.push(String(fallback || ''));
  }
  const minVisibleLines = maxLines > 1 ? 2 : 1;
  while (rawLines.length < minVisibleLines) rawLines.push('');
  return rawLines.slice(0, maxLines);
};

const dedupeById = <T extends { id?: number | string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item?.id ?? '');
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

type DashboardView = 'overview' | 'buildings' | 'orders' | 'hallqr' | 'users' | 'notifications' | 'profile' | 'team' | 'installers';

const DASHBOARD_SECTIONS: DashboardView[] = ['overview', 'buildings', 'orders', 'hallqr', 'users', 'notifications', 'profile', 'team', 'installers'];
const ACP_PAGE_SIZE = 6;

const readDashboardSectionFromUrl = (): DashboardView => {
  if (typeof window === 'undefined') return 'overview';
  const section = String(new URLSearchParams(window.location.search).get('section') || '').trim();
  return DASHBOARD_SECTIONS.includes(section as DashboardView) ? (section as DashboardView) : 'overview';
};

const AdminDashboard = ({ user, authToken, onLogout }: { user: any, authToken?: string, onLogout: () => void }) => {
  const [view, setView] = useState<DashboardView>(() => readDashboardSectionFromUrl());
  const [subView, setSubView] = useState<'list' | 'detail'>('list');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [orderTab, setOrderTab] = useState<'en_cours' | 'historique'>('en_cours');
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
  const [isOrderSearchFocused, setIsOrderSearchFocused] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);
  const [isAddingAdminTeamMember, setIsAddingAdminTeamMember] = useState(false);
  const [isCompletingProfile, setIsCompletingProfile] = useState(user.role === 'syndic' && !user.profile_completed);
  const [newBuilding, setNewBuilding] = useState({ name: '', street: '', number: '', box: '', zip: '', city: '', syndic_name: user.name, billing_info: user.company_name ? `${user.company_name}\n${user.address}\nTVA: ${user.vat_number}` : '', notes: '', gestionnaire_nom: '', gestionnaire_email: '' });
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', first_name: '', last_name: '', buildingIds: [] as number[] });
  const [newTeamMember, setNewTeamMember] = useState({ email: '', password: '', name: '', first_name: '', last_name: '', has_full_building_access: false, buildingIds: [] as number[] });
  const [adminNewTeamMember, setAdminNewTeamMember] = useState({ email: '', password: '', name: '', first_name: '', last_name: '', has_full_building_access: false, buildingIds: [] as number[] });
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newTeamMemberConfirmPassword, setNewTeamMemberConfirmPassword] = useState('');
  const [adminNewTeamMemberConfirmPassword, setAdminNewTeamMemberConfirmPassword] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openOrderOnBuildingLoad, setOpenOrderOnBuildingLoad] = useState(false);
  const [quickLinkBuilding, setQuickLinkBuilding] = useState<any>(null);
  const [quickLinkToken, setQuickLinkToken] = useState('');
  const [quickLinkEmail, setQuickLinkEmail] = useState('');
  const [quickLinkSearch, setQuickLinkSearch] = useState('');
  const [isGeneratingQuickLink, setIsGeneratingQuickLink] = useState(false);
  const [isSendingQuickLink, setIsSendingQuickLink] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSendingOrdersReport, setIsSendingOrdersReport] = useState(false);
  const [adminBuildingFilter, setAdminBuildingFilter] = useState<'all' | 'pending_survey' | 'survey_completed' | 'in_production' | 'installed'>('all');
  const [adminOrderFilter, setAdminOrderFilter] = useState<'all' | 'validation' | 'production' | 'pose' | 'billing' | 'done'>('all');
  const [notificationCategoryFilter, setNotificationCategoryFilter] = useState<'all' | 'commandes' | 'immeubles' | 'comptes' | 'contacts' | 'autres'>('all');
  const [adminTeamMembers, setAdminTeamMembers] = useState<any[]>([]);
  const [adminBuildings, setAdminBuildings] = useState<any[]>([]);
  const [isAdminTeamLoading, setIsAdminTeamLoading] = useState(false);
  const [transferRequests, setTransferRequests] = useState<any[]>([]);
  const [hallQrOrders, setHallQrOrders] = useState<any[]>([]);
  const [isLoadingTransferRequests, setIsLoadingTransferRequests] = useState(false);
  const [isLoadingHallQrOrders, setIsLoadingHallQrOrders] = useState(false);
  const [isMutatingTransferRequestId, setIsMutatingTransferRequestId] = useState<number | null>(null);
  const [isMutatingHallQrOrderId, setIsMutatingHallQrOrderId] = useState<number | null>(null);
  const [isRequestingHallQrBuildingId, setIsRequestingHallQrBuildingId] = useState<number | null>(null);
  const [isLoadingHallQrLinkBuildingId, setIsLoadingHallQrLinkBuildingId] = useState<number | null>(null);
  const [isForcingTransferBuildingId, setIsForcingTransferBuildingId] = useState<number | null>(null);
  const [isForceTransferModalOpen, setIsForceTransferModalOpen] = useState(false);
  const [forceTransferTargetBuilding, setForceTransferTargetBuilding] = useState<any | null>(null);
  const [forceTransferTargetSyndicId, setForceTransferTargetSyndicId] = useState<number | null>(null);
  const [forceTransferSearch, setForceTransferSearch] = useState('');
  const [forceTransferReason, setForceTransferReason] = useState('urgence_mandat');
  const [isLoadingSyndicCandidates, setIsLoadingSyndicCandidates] = useState(false);
  const [buildingPage, setBuildingPage] = useState(1);
  const [selectedHallQrBuildingId, setSelectedHallQrBuildingId] = useState<number | null>(null);
  const apiFetch = React.useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
    return globalThis.fetch(input, { ...init, headers });
  }, [authToken]);
  const fetch = apiFetch;

  useEffect(() => {
    if (view === 'overview') {
      fetchBuildings();
      fetchOrders();
      fetchNotifications();
      fetchTransferRequests();
    }
    if (view === 'buildings') {
      fetchBuildings();
      fetchTransferRequests();
    }
    if (view === 'hallqr') {
      fetchBuildings();
      fetchHallQrOrders();
    }
    if (view === 'orders') fetchOrders();
    if (view === 'users') fetchUsers();
    if (view === 'notifications') fetchNotifications();
    if (view === 'team') {
      fetchTeam();
      fetchBuildings();
    }
    if (view === 'installers') {
      fetchUsers();
      fetchTeamForSyndic(user.id);
      fetchBuildingsForAdmin();
    }

    setIsSidebarOpen(false); // Close sidebar on view change on mobile
  }, [view, authToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('section') === view) return;
    url.searchParams.set('section', view);
    window.history.replaceState({}, '', url.toString());
  }, [view]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const section = readDashboardSectionFromUrl();
      setView(section);
      setSubView('list');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (view !== 'orders' && selectedOrderDetail) {
      setSelectedOrderDetail(null);
    }

    if (view !== 'buildings' && view !== 'overview' && quickLinkBuilding !== null) {
      setQuickLinkBuilding(null);
      setQuickLinkToken('');
      setQuickLinkEmail('');
      setQuickLinkSearch('');
    }
    if (view !== 'buildings' && isForceTransferModalOpen) {
      setIsForceTransferModalOpen(false);
      setForceTransferTargetBuilding(null);
      setForceTransferTargetSyndicId(null);
      setForceTransferSearch('');
      setForceTransferReason('urgence_mandat');
    }
  }, [view, selectedOrderDetail, quickLinkBuilding, isForceTransferModalOpen]);

  useEffect(() => {
    setBuildingPage(1);
  }, [search, adminBuildingFilter, view]);

  useEffect(() => {
    if (user.role !== 'syndic') return;
    if (buildings.length === 0) {
      setSelectedHallQrBuildingId(null);
      return;
    }
    if (selectedHallQrBuildingId == null) {
      setSelectedHallQrBuildingId(Number(buildings[0]?.id));
      return;
    }
    const stillExists = buildings.some((building: any) => Number(building.id) === Number(selectedHallQrBuildingId));
    if (!stillExists) {
      setSelectedHallQrBuildingId(Number(buildings[0]?.id));
    }
  }, [user.role, buildings, selectedHallQrBuildingId]);

  const fetchBuildings = async () => {
    if (!user) return;
    const res = await fetch(`/api/buildings?userId=${user.id}&role=${user.role}`);
    const data = await res.json();
    setBuildings(dedupeById(Array.isArray(data) ? data : []));
  };

  const fetchOrders = async () => {
    if (!user) return;
    const res = await fetch(`/api/orders?userId=${user.id}&role=${user.role}`);
    const data = await res.json();
    setOrders(dedupeById(Array.isArray(data) ? data : []));
  };

  const fetchUsers = async (options?: { throwOnError?: boolean }) => {
    const res = await fetch('/api/users');
    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      const message = (data as any)?.error || "Impossible de charger les syndics.";
      if (options?.throwOnError) {
        throw new Error(message);
      }
      console.warn(message);
      setUsers([]);
      return [];
    }
    const nextUsers = dedupeById(Array.isArray(data) ? data : []);
    setUsers(nextUsers);
    return nextUsers;
  };

  const fetchTeamForSyndic = async (syndicId: number) => {
    setIsAdminTeamLoading(true);
    try {
      const res = await fetch(`/api/users/${syndicId}/team`);
      const data = await res.json();
      setAdminTeamMembers(dedupeById(Array.isArray(data) ? data : []));
    } finally {
      setIsAdminTeamLoading(false);
    }
  };

  const fetchBuildingsForAdmin = async () => {
    const res = await fetch(`/api/buildings?role=admin`);
    const data = await res.json();
    setAdminBuildings(dedupeById(Array.isArray(data) ? data : []));
  };

  const fetchTeam = async () => {
    if (!user) return;
    const res = await fetch(`/api/users/${user.id}/team`);
    const data = await res.json();
    setTeamMembers(dedupeById(Array.isArray(data) ? data : []));
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const res = await fetch(`/api/notifications?userId=${user.id}&role=${user.role}`);
    const data = await res.json();
    setNotifications(dedupeById(Array.isArray(data) ? data : []));
  };

  const fetchTransferRequests = async () => {
    if (!user || !['admin', 'syndic'].includes(String(user.role || ''))) {
      setTransferRequests([]);
      return;
    }
    setIsLoadingTransferRequests(true);
    try {
      const endpoint = user.role === 'admin'
        ? '/api/building-transfer-requests?role=admin'
        : `/api/building-transfer-requests?role=${user.role}&userId=${user.id}`;
      const res = await fetch(endpoint);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(data?.error || 'Impossible de charger les demandes de transfert.');
      }
      setTransferRequests(dedupeById(Array.isArray(data) ? data : []));
    } catch (error) {
      console.warn('Transfer requests unavailable:', error);
      setTransferRequests([]);
    } finally {
      setIsLoadingTransferRequests(false);
    }
  };

  const fetchHallQrOrders = async () => {
    if (!user || !['admin', 'syndic'].includes(String(user.role || ''))) {
      setHallQrOrders([]);
      return;
    }
    setIsLoadingHallQrOrders(true);
    try {
      const endpoint = user.role === 'admin'
        ? '/api/hall-qr/orders?role=admin'
        : `/api/hall-qr/orders?role=${user.role}&userId=${user.id}`;
      const res = await fetch(endpoint);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(data?.error || "Impossible de charger les commandes QR Hall.");
      }
      setHallQrOrders(dedupeById(Array.isArray(data) ? data : []));
    } catch (error) {
      console.warn('Hall QR orders unavailable:', error);
      setHallQrOrders([]);
    } finally {
      setIsLoadingHallQrOrders(false);
    }
  };

  const approveTransferRequest = async (request: any) => {
    const requestId = Number(request?.id);
    if (!Number.isFinite(requestId) || requestId <= 0) return;
    const buildingLabel = buildings.find((b: any) => Number(b.id) === Number(request?.building_id))?.name || `ACP #${request?.building_id || '-'}`;
    if (!window.confirm(`Valider le transfert pour ${buildingLabel} ?`)) return;

    setIsMutatingTransferRequestId(requestId);
    try {
      const res = await fetch(`/api/building-transfer-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: user.role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible d'approuver la demande.");
      }
      await Promise.all([fetchTransferRequests(), fetchBuildings()]);
      alert('Demande de transfert approuvee.');
    } catch (error: any) {
      alert(error.message || "Impossible d'approuver la demande.");
    } finally {
      setIsMutatingTransferRequestId(null);
    }
  };

  const rejectTransferRequest = async (request: any) => {
    const requestId = Number(request?.id);
    if (!Number.isFinite(requestId) || requestId <= 0) return;
    if (!window.confirm('Refuser / annuler cette demande de transfert ?')) return;

    setIsMutatingTransferRequestId(requestId);
    try {
      const res = await fetch(`/api/building-transfer-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: user.role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de traiter la demande.');
      }
      await fetchTransferRequests();
      alert('Demande mise a jour.');
    } catch (error: any) {
      alert(error.message || 'Impossible de traiter la demande.');
    } finally {
      setIsMutatingTransferRequestId(null);
    }
  };

  const requestHallQrOrder = async (building: any) => {
    const buildingId = Number(building?.id);
    if (!Number.isFinite(buildingId) || buildingId <= 0) return;
    if (!['admin', 'syndic'].includes(String(user.role || ''))) return;

    const hasInstalledQr = hallQrOrders.some(
      (order: any) => Number(order.building_id) === buildingId && String(order.status || '') === 'installed'
    );
    const hasOpenOrder = hallQrOrders.some(
      (order: any) =>
        Number(order.building_id) === buildingId &&
        ['requested', 'in_production', 'ready_to_install'].includes(String(order.status || ''))
    );
    if (hasOpenOrder) {
      alert('Une commande QR Hall est deja en cours pour cette ACP.');
      return;
    }

    let reason = 'initial_install';
    if (hasInstalledQr) {
      const confirmReplacement = window.confirm(
        'Un QR Hall existe deja pour cette ACP. Voulez-vous lancer une commande de remplacement ?'
      );
      if (!confirmReplacement) return;
      reason = 'replacement_broken';
    }

    setIsRequestingHallQrBuildingId(buildingId);
    try {
      const res = await fetch(`/api/buildings/${buildingId}/hall-qr/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de creer la commande QR Hall.');
      }
      await Promise.all([fetchHallQrOrders(), fetchBuildings()]);
      const qrUrl = String(data.qr_url || '').trim();
      if (qrUrl) {
        try {
          await navigator.clipboard.writeText(qrUrl);
          alert(`Demande QR Hall creee. Lien QR copie.\n${qrUrl}`);
        } catch {
          alert(`Demande QR Hall creee.\nLien QR: ${qrUrl}`);
        }
      } else {
        alert('Demande QR Hall envoyee. Le lien QR sera gere cote admin Plachet.');
      }
    } catch (error: any) {
      alert(error.message || 'Impossible de creer la commande QR Hall.');
    } finally {
      setIsRequestingHallQrBuildingId(null);
    }
  };

  const copyOrCreateHallQrLink = async (building: any) => {
    const buildingId = Number(building?.id);
    if (!Number.isFinite(buildingId) || buildingId <= 0) return;
    if (String(user.role || '') !== 'admin') return;

    setIsLoadingHallQrLinkBuildingId(buildingId);
    try {
      const res = await fetch(`/api/buildings/${buildingId}/hall-qr`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Impossible de charger le lien QR Hall.");
      }

      const qrUrl = String(data?.qr_url || '').trim();
      if (qrUrl) {
        try {
          await navigator.clipboard.writeText(qrUrl);
          alert(`Lien QR Hall copie.\n${qrUrl}`);
        } catch {
          alert(`Lien QR Hall:\n${qrUrl}`);
        }
        return;
      }

      const shouldCreate = window.confirm(
        "Aucun lien QR Hall n'existe pour cette ACP. Voulez-vous le generer maintenant ?"
      );
      if (!shouldCreate) return;

      const createRes = await fetch(`/api/buildings/${buildingId}/hall-qr/link`, {
        method: 'POST',
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || "Impossible de generer le lien QR Hall.");
      }
      const createdUrl = String(createData?.qr_url || '').trim();
      if (!createdUrl) {
        throw new Error("Lien QR Hall indisponible apres generation.");
      }
      try {
        await navigator.clipboard.writeText(createdUrl);
        alert(`Lien QR Hall genere et copie.\n${createdUrl}`);
      } catch {
        alert(`Lien QR Hall genere.\n${createdUrl}`);
      }
    } catch (error: any) {
      alert(error.message || "Impossible de gerer le lien QR Hall.");
    } finally {
      setIsLoadingHallQrLinkBuildingId(null);
    }
  };

  const updateHallQrOrderStatus = async (order: any, nextStatus: string) => {
    const orderId = Number(order?.id);
    if (!Number.isFinite(orderId) || orderId <= 0) return;
    if (user.role !== 'admin') return;

    const statusLabelMap: Record<string, string> = {
      in_production: 'en production',
      ready_to_install: 'pret a poser',
      installed: 'pose',
      cancelled: 'annule',
    };
    const confirmLabel = statusLabelMap[nextStatus] || nextStatus;
    if (!window.confirm(`Passer cette commande QR Hall en statut "${confirmLabel}" ?`)) return;

    setIsMutatingHallQrOrderId(orderId);
    try {
      const res = await fetch(`/api/hall-qr/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de mettre a jour la commande QR Hall.');
      }
      await fetchHallQrOrders();
    } catch (error: any) {
      alert(error.message || 'Impossible de mettre a jour la commande QR Hall.');
    } finally {
      setIsMutatingHallQrOrderId(null);
    }
  };

  const openForceTransferModal = async (building: any) => {
    const buildingId = Number(building?.id);
    if (!Number.isFinite(buildingId) || buildingId <= 0) return;
    if (user.role !== 'admin') return;

    setForceTransferTargetBuilding(building);
    setForceTransferTargetSyndicId(null);
    setForceTransferSearch('');
    setForceTransferReason('urgence_mandat');
    setIsForceTransferModalOpen(true);

    if (users.length > 0) return;
    setIsLoadingSyndicCandidates(true);
    try {
      await fetchUsers({ throwOnError: true });
    } catch (error: any) {
      alert(error.message || "Impossible de charger la liste des syndics.");
    } finally {
      setIsLoadingSyndicCandidates(false);
    }
  };

  const closeForceTransferModal = () => {
    if (isForcingTransferBuildingId != null) return;
    setIsForceTransferModalOpen(false);
    setForceTransferTargetBuilding(null);
    setForceTransferTargetSyndicId(null);
    setForceTransferSearch('');
    setForceTransferReason('urgence_mandat');
  };

  const confirmForceTransfer = async () => {
    const buildingId = Number(forceTransferTargetBuilding?.id);
    if (!Number.isFinite(buildingId) || buildingId <= 0) return;
    if (user.role !== 'admin') return;
    if (!Number.isFinite(forceTransferTargetSyndicId || NaN)) {
      alert('Selectionnez un syndic cible.');
      return;
    }

    setIsForcingTransferBuildingId(buildingId);
    try {
      const res = await fetch(`/api/buildings/${buildingId}/force-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toSyndicUserId: Number(forceTransferTargetSyndicId),
          reason: String(forceTransferReason || 'admin_forced_transfer').trim() || 'admin_forced_transfer',
          userId: user.id,
          role: user.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de forcer le transfert.');
      }
      await Promise.all([fetchTransferRequests(), fetchBuildings()]);
      closeForceTransferModal();
      alert(`Transfert force execute (demande #${data.transferRequestId || '-'})`);
    } catch (error: any) {
      alert(error.message || 'Impossible de forcer le transfert.');
    } finally {
      setIsForcingTransferBuildingId(null);
    }
  };

  const markAsRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await fetch(`/api/notifications/read-all?userId=${user.id}&role=${user.role}`, { method: 'POST' });
    fetchNotifications();
  };

  const deleteNotification = async (id: number) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const normalizeOrderStatus = (value: unknown) =>
    normalizeSearchText(value).replace(/[^a-z_]/g, '');
  const isOrderStatus = (value: unknown, expected: string) =>
    normalizeOrderStatus(value) === expected;
  const toDbOrderStatus = (key: string) => {
    const statusMap: Record<string, string> = {
      recue: 're\u00E7ue',
      en_traitement: 'en_traitement',
      en_pose: 'en_pose',
      posee: 'pos\u00E9e',
      facturee: 'factur\u00E9e',
      annulee: 'annul\u00E9e',
    };
    return statusMap[key] || key;
  };
  const pendingValidationCount = orders.filter(o => OWNER_VALIDATION_PENDING_STATUSES.includes(o.status)).length;
  const activeOrdersCount = orders.filter((o) => !isOrderStatus(o.status, 'posee') && !isOrderStatus(o.status, 'facturee')).length;
  const pendingSurveyCount = buildings.filter(b => b.status === 'pending_survey').length;
  const productionCount = buildings.filter(b => b.status === 'in_production').length;
  const installedCount = buildings.filter(b => b.status === 'installed').length;
  const measuredBuildingsCount = buildings.filter(b => b.status === 'survey_completed').length;
  const recentBuildings = buildings.slice(0, 4);
  const recentOrders = orders.slice(0, 4);
  const urgentOrders = orders.filter(o => OWNER_VALIDATION_PENDING_STATUSES.includes(o.status)).slice(0, 3);
  const adminBuildingsToMeasure = buildings.filter((b) => b.status === 'pending_survey');
  const adminBuildingsToPrepare = buildings.filter((b) => b.status === 'survey_completed');
  const adminBuildingsInProduction = buildings.filter((b) => b.status === 'in_production');
  const adminRecentlyInstalled = buildings.filter((b) => b.status === 'installed').slice(0, 4);
  const adminOrdersAwaitingValidation = orders.filter((o) => OWNER_VALIDATION_PENDING_STATUSES.includes(o.status));
  const adminOrdersInProduction = orders.filter((o) => isOrderStatus(o.status, 'recue') || isOrderStatus(o.status, 'en_traitement'));
  const adminOrdersInPose = orders.filter((o) => o.status === 'en_pose');
  const adminOrdersToInvoice = orders.filter((o) => isOrderStatus(o.status, 'posee'));
  const adminOrdersCompleted = orders.filter((o) => isOrderStatus(o.status, 'facturee'));
  const adminOverviewBuildings = dedupeById([...adminBuildingsToMeasure, ...adminBuildingsToPrepare, ...adminBuildingsInProduction]).slice(0, 5);
  const adminOverviewOrders = dedupeById([...adminOrdersAwaitingValidation, ...adminOrdersInProduction, ...adminOrdersInPose, ...adminOrdersToInvoice]).slice(0, 5);
  const displayFirstName = user.first_name || user.name || 'Syndic';
  const dashboardHook = getDashboardHook();
  const buildingSearchNeedle = normalizeSearchText(search);
  const matchesBuildingSearch = (building: any) => {
    if (!buildingSearchNeedle) return true;
    const searchableText = normalizeSearchText([
      building?.name,
      building?.address,
      building?.street,
      building?.number,
      building?.box,
      building?.zip,
      building?.city,
    ].filter(Boolean).join(' '));
    return searchableText.includes(buildingSearchNeedle);
  };
  const filteredBuildingsForList = buildings
    .filter((b) => adminBuildingFilter === 'all' || b.status === adminBuildingFilter)
    .filter(matchesBuildingSearch);
  const syndicFilteredBuildingsForList = buildings.filter(matchesBuildingSearch);
  const buildingsForCurrentList = user.role === 'admin' ? filteredBuildingsForList : syndicFilteredBuildingsForList;
  const totalBuildingPages = Math.max(1, Math.ceil(buildingsForCurrentList.length / ACP_PAGE_SIZE));
  const clampedBuildingPage = Math.min(Math.max(1, buildingPage), totalBuildingPages);
  const paginatedBuildings = buildingsForCurrentList.slice((clampedBuildingPage - 1) * ACP_PAGE_SIZE, clampedBuildingPage * ACP_PAGE_SIZE);
  const notificationCategories = ['commandes', 'immeubles', 'comptes', 'contacts', 'autres'] as const;
  const filteredNotifications = notifications.filter((notification) =>
    notificationCategoryFilter === 'all' || getNotificationCategory(notification) === notificationCategoryFilter
  );
  const actingOrganizationUserId = Number(user?.parent_id || user?.id || 0);
  const transferStatusClassMap: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-zinc-100 text-zinc-700',
    forced: 'bg-blue-100 text-blue-700',
    expired: 'bg-zinc-100 text-zinc-600',
  };
  const transferStatusLabelMap: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvee',
    rejected: 'Refusee',
    cancelled: 'Annulee',
    forced: 'Forcee',
    expired: 'Expiree',
  };
  const pendingTransferRequestsCount = transferRequests.filter((request) => String(request.status || '') === 'pending').length;
  const hallQrStatusClassMap: Record<string, string> = {
    requested: 'bg-amber-100 text-amber-700',
    in_production: 'bg-blue-100 text-blue-700',
    ready_to_install: 'bg-indigo-100 text-indigo-700',
    installed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-zinc-100 text-zinc-700',
  };
  const hallQrStatusLabelMap: Record<string, string> = {
    requested: 'Demandee',
    in_production: 'En production',
    ready_to_install: 'Pret a poser',
    installed: 'Pose',
    cancelled: 'Annulee',
  };
  const selectedHallQrBuilding = buildings.find((building: any) => Number(building.id) === Number(selectedHallQrBuildingId));
  const selectedHallQrOrder = selectedHallQrBuilding
    ? hallQrOrders
        .filter((order: any) => Number(order.building_id) === Number(selectedHallQrBuilding.id))
        .sort((a: any, b: any) => Number(new Date(b.created_at || 0)) - Number(new Date(a.created_at || 0)))[0]
    : null;
  const selectedHallQrHasOpenOrder = selectedHallQrBuilding
    ? hallQrOrders.some((order: any) =>
        Number(order.building_id) === Number(selectedHallQrBuilding.id) &&
        ['requested', 'in_production', 'ready_to_install'].includes(String(order.status || ''))
      )
    : false;
  const selectedHallQrHasInstalled = selectedHallQrBuilding
    ? hallQrOrders.some((order: any) =>
        Number(order.building_id) === Number(selectedHallQrBuilding.id) &&
        String(order.status || '') === 'installed'
      )
    : false;
  const syndicCandidates = users.filter((candidate: any) => String(candidate?.role || '') === 'syndic' && !candidate?.parent_id);
  const normalizedForceTransferSearch = normalizeSearchText(forceTransferSearch);
  const filteredForceTransferCandidates = syndicCandidates
    .filter((candidate: any) => {
      if (!normalizedForceTransferSearch) return true;
      const haystack = normalizeSearchText([
        candidate?.name,
        candidate?.company_name,
        candidate?.email,
      ].join(' '));
      return haystack.includes(normalizedForceTransferSearch);
    })
    .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'fr', { sensitivity: 'base' }));
  const selectedForceTransferSyndic = syndicCandidates.find((candidate: any) => Number(candidate.id) === Number(forceTransferTargetSyndicId));

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((newTeamMember.password || '') !== (newTeamMemberConfirmPassword || '')) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    if ((newTeamMember.password || '').length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    try {
      const res = await fetch(`/api/users/${user.id}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTeamMember,
          confirm_password: newTeamMemberConfirmPassword,
          name: buildFullName(newTeamMember.first_name, newTeamMember.last_name, newTeamMember.name)
        })
      });
      if (res.ok) {
        setIsAddingTeamMember(false);
        setNewTeamMember({ email: '', password: '', name: '', first_name: '', last_name: '', has_full_building_access: false, buildingIds: [] });
        setNewTeamMemberConfirmPassword('');
        fetchTeam();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de la creation du membre');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la creation du membre');
    }
  };

  const handleAddAdminTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminNewTeamMember.password !== adminNewTeamMemberConfirmPassword) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    const res = await fetch(`/api/users/${user.id}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...adminNewTeamMember,
        confirm_password: adminNewTeamMemberConfirmPassword,
        name: buildFullName(adminNewTeamMember.first_name, adminNewTeamMember.last_name, adminNewTeamMember.name)
      })
    });
    if (res.ok) {
      setAdminNewTeamMember({ email: '', password: '', name: '', first_name: '', last_name: '', has_full_building_access: false, buildingIds: [] });
      setAdminNewTeamMemberConfirmPassword('');
      setIsAddingAdminTeamMember(false);
      fetchTeamForSyndic(user.id);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Erreur lors de la creation du placeur.');
    }
  };

  const handleDeleteTeamMember = async (id: number) => {
    if (confirm('Etes-vous sur de vouloir supprimer ce membre de votre equipe ?')) {
      await fetch(`/api/users/team/${id}`, { method: 'DELETE' });
      fetchTeam();
    }
  };

  const handleDeleteAdminTeamMember = async (id: number) => {
    if (confirm('Supprimer ce placeur ?')) {
      await fetch(`/api/users/team/${id}`, { method: 'DELETE' });
      fetchTeamForSyndic(user.id);
    }
  };

  const handleUpdateTeamMemberAccess = async (memberId: number, payload: { has_full_building_access: boolean; buildingIds: number[] }) => {
    try {
      const res = await fetch(`/api/users/team/${memberId}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de mettre a jour les acces.");
      }

      setTeamMembers((members) =>
        members.map((member) =>
          member.id === memberId
            ? { ...member, has_full_building_access: payload.has_full_building_access, buildingIds: payload.buildingIds }
            : member
        )
      );
    } catch (error: any) {
      alert(error.message || "Impossible de mettre a jour les acces.");
    }
  };

  const handleUpdateAdminTeamMemberAccess = async (memberId: number, payload: { has_full_building_access: boolean; buildingIds: number[] }) => {
    try {
      const res = await fetch(`/api/users/team/${memberId}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de mettre a jour les acces.");
      }
      setAdminTeamMembers((members) =>
        members.map((member) => {
          if (member.id !== memberId) return member;
          return { ...member, ...payload };
        })
      );
    } catch (error) {
      console.error(error);
      alert("Impossible de mettre a jour les acces.");
    }
  };

  const handleDeleteAccount = async () => {
    if (user.role === 'admin') return;

    const firstConfirmation = window.confirm("Cette action supprimera votre compte de maniere irreversible. Voulez-vous continuer ?");
    if (!firstConfirmation) return;

    const secondConfirmation = window.confirm("Confirmez-vous la suppression definitive de votre compte et de vos acces ?");
    if (!secondConfirmation) return;

    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/users/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Impossible de supprimer le compte.");
      }

      alert("Votre compte a ete supprime conformement a votre demande.");
      onLogout();
      window.location.href = '/';
    } catch (error: any) {
      alert(error.message || "Impossible de supprimer le compte.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleAddBuilding = async () => {
    if (!newBuilding.name || !newBuilding.street || !newBuilding.number || !newBuilding.zip || !newBuilding.city) {
      alert("Veuillez renseigner au minimum le nom de l'ACP, la rue, le numero, le code postal et la commune.");
      return;
    }

    try {
      if (selectedBuilding && view === 'buildings' && subView === 'detail') {
        const updateRes = await fetch(`/api/buildings/${selectedBuilding.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBuilding)
        });

        if (!updateRes.ok) {
          const errorData = await updateRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Impossible d'enregistrer les modifications de l'immeuble.");
        }

        const res = await fetch(`/api/buildings/${selectedBuilding.id}${user.role === 'admin' ? '?role=admin' : ''}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedBuilding(data);
        }
      } else {
        const createRes = await fetch('/api/buildings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newBuilding, userId: user.role === 'syndic' ? user.id : null })
        });

        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => ({}));
          if (createRes.status === 409 && errorData?.transferRequestId) {
            await fetchTransferRequests();
            throw new Error(`${errorData.error || "ACP deja existante."} (demande #${errorData.transferRequestId})`);
          }
          throw new Error(errorData.error || "Impossible d'enregistrer l'immeuble.");
        }
      }

      setNewBuilding({ name: '', street: '', number: '', box: '', zip: '', city: '', syndic_name: user.name, billing_info: user.company_name ? `${user.company_name}\n${user.address}\nTVA: ${user.vat_number}` : '', notes: '', gestionnaire_nom: '', gestionnaire_email: '' });
      setIsAdding(false);
      await Promise.all([fetchBuildings(), fetchTransferRequests()]);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Une erreur est survenue lors de l'enregistrement de l'immeuble.");
    }
  };

  const handleAddUser = async () => {
    if ((newUser.password || '') !== (newUserConfirmPassword || '')) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    if ((newUser.password || '').length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newUser,
        confirm_password: newUserConfirmPassword,
        name: buildFullName(newUser.first_name, newUser.last_name, newUser.name)
      })
    });
    setNewUser({ email: '', password: '', name: '', first_name: '', last_name: '', buildingIds: [] });
    setNewUserConfirmPassword('');
    setIsAddingUser(false);
    fetchUsers();
  };

  const handleSelectBuilding = async (id: number, options?: { openOrder?: boolean }) => {
    try {
      const res = await fetch(`/api/buildings/${id}${user.role === 'admin' ? '?role=admin' : ''}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch building');
      }
      const data = await res.json();
      setSelectedBuilding(data);
      setOpenOrderOnBuildingLoad(Boolean(options?.openOrder));
      setView('buildings');
      setSubView('detail');
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erreur lors du chargement de l'immeuble.");
    }
  };

  const handleDeleteBuilding = async (id: number) => {
    const confirmMessage = user.role === 'admin'
      ? "Retirer cette ACP de la gestion active ? (l'historique est conserve)"
      : "Retirer cette ACP de votre gestion ? (pas de suppression definitive)";
    if (!confirm(confirmMessage)) return;
    try {
      const res = await fetch(`/api/buildings/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Impossible de retirer cette ACP.");
      }
      await Promise.all([fetchBuildings(), fetchTransferRequests()]);
    } catch (error: any) {
      alert(error.message || "Impossible de retirer cette ACP.");
    }
  };

  const generateQuickLinkForBuilding = async (building: any) => {
    setQuickLinkBuilding(building);
    setQuickLinkEmail('');
    setQuickLinkToken('');
    setIsGeneratingQuickLink(true);
    try {
      const res = await fetch(`/api/buildings/${building.id}/generate-link`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Lien indisponible');
      }
      setQuickLinkToken(data.token);
    } catch (error) {
      console.error(error);
      alert("Impossible de generer le lien de commande.");
      setQuickLinkBuilding(null);
    } finally {
      setIsGeneratingQuickLink(false);
    }
  };

  const openQuickShare = (building?: any) => {
    setQuickLinkBuilding(null);
    setQuickLinkToken('');
    setQuickLinkEmail('');
    setQuickLinkSearch('');
    if (building) {
      generateQuickLinkForBuilding(building);
    } else {
      setQuickLinkBuilding({});
    }
  };

  const copyQuickLink = async () => {
    if (!quickLinkToken) return;
    const url = buildPublicOrderUrl(quickLinkToken);
    try {
      await navigator.clipboard.writeText(url);
      alert('Lien copie.');
    } catch (error) {
      alert('Impossible de copier le lien automatiquement.');
    }
  };

  const openQuickLink = () => {
    if (!quickLinkToken) return;
    window.location.href = buildPublicOrderUrl(quickLinkToken);
  };

  const sendQuickLink = async () => {
    if (!quickLinkBuilding || !quickLinkEmail) return;
    setIsSendingQuickLink(true);
    try {
      const res = await fetch(`/api/buildings/${quickLinkBuilding.id}/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: quickLinkEmail,
          syndicName: getDisplayName(user),
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur d'envoi");
      }
      alert('Lien envoye avec succes.');
      setQuickLinkBuilding(null);
      setQuickLinkToken('');
      setQuickLinkEmail('');
    } catch (error) {
      console.error(error);
      alert("Impossible d'envoyer le lien de commande.");
    } finally {
      setIsSendingQuickLink(false);
    }
  };

  const sendOrdersReport = async () => {
    const targetEmail = window.prompt("Envoyer le rapport a quelle adresse email ?", user.email || "");
    if (!targetEmail) return;

    setIsSendingOrdersReport(true);
    try {
      const res = await fetch('/api/orders/export/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: user.role,
          userId: user.id,
          toEmail: targetEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible d'envoyer le rapport.");
      }
      alert('Rapport envoye avec succes.');
    } catch (error: any) {
      alert(error.message || "Impossible d'envoyer le rapport.");
    } finally {
      setIsSendingOrdersReport(false);
    }
  };
  const downloadOrdersReport = async () => {
    try {
      const res = await fetch(`/api/orders/export?role=${user.role}&userId=${user.id}`);
      if (!res.ok) throw new Error("Impossible de telecharger le rapport.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-commandes-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.message || "Impossible de telecharger le rapport.");
    }
  };

  const orderSearchTerm = normalizeSearchText(search);
  const tabOrders = orders.filter((o) => {
    if (user.role === 'admin') {
      return orderTab === 'en_cours'
        ? !isOrderStatus(o.status, 'annulee') && !isOrderStatus(o.status, 'facturee')
        : isOrderStatus(o.status, 'annulee') || isOrderStatus(o.status, 'facturee');
    }
    return orderTab === 'en_cours'
      ? !isOrderStatus(o.status, 'posee') && !isOrderStatus(o.status, 'annulee') && !isOrderStatus(o.status, 'facturee')
      : isOrderStatus(o.status, 'posee') || isOrderStatus(o.status, 'annulee') || isOrderStatus(o.status, 'facturee');
  });
  const filteredOrders = tabOrders.filter((o) => {
    if (!orderSearchTerm) return true;

    return [
      o.building_name,
      o.requester_name,
      o.requester_email,
      o.lot_number,
      o.order_number,
      o.name_to_replace,
      o.details
    ].some((value) => normalizeSearchText(value).includes(orderSearchTerm));
  });

  const orderSearchSuggestions = orderSearchTerm
    ? Array.from(
        new Map(
          tabOrders.flatMap((order: any) => {
            const candidates = [
              { label: order.building_name, meta: 'ACP' },
              { label: order.requester_name, meta: 'Demandeur' },
              { label: order.requester_email, meta: 'Email' },
              { label: order.lot_number ? `Lot ${order.lot_number}` : '', meta: 'Lot' },
              { label: order.order_number, meta: 'Numero de commande' },
              { label: order.name_to_replace, meta: 'Nom a graver' }
            ].filter((item) => item.label && normalizeSearchText(item.label).includes(orderSearchTerm));

            return candidates.map((item) => [
              `${item.meta}:${normalizeSearchText(item.label)}`,
              item
            ]);
          })
        ).values()
      ).slice(0, 8)
    : [];
  const adminFilteredOrders = filteredOrders.filter((order) => {
    if (user.role !== 'admin' || adminOrderFilter === 'all') return true;
    if (adminOrderFilter === 'validation') return OWNER_VALIDATION_PENDING_STATUSES.includes(order.status);
    if (adminOrderFilter === 'production') return isOrderStatus(order.status, 'recue') || isOrderStatus(order.status, 'en_traitement');
    if (adminOrderFilter === 'pose') return order.status === 'en_pose';
    if (adminOrderFilter === 'billing') return isOrderStatus(order.status, 'posee');
    if (adminOrderFilter === 'done') return isOrderStatus(order.status, 'facturee') || isOrderStatus(order.status, 'annulee');
    return true;
  });
  const selectedOrderParsedDetails = selectedOrderDetail ? parseOrderDetails(selectedOrderDetail.details) : { items: [], meta: {}, rawText: '' };
  const selectedOrderLinkedBuilding = selectedOrderDetail
    ? buildings.find((b: any) =>
        (selectedOrderDetail.building_id && Number(b.id) === Number(selectedOrderDetail.building_id)) ||
        b.name === selectedOrderDetail.building_name
      )
    : null;
  const selectedOrderOwnerName = selectedOrderDetail
    ? String(
        selectedOrderParsedDetails.meta?.owner_name ||
        (selectedOrderDetail.requester_quality === 'owner' ? selectedOrderDetail.requester_name : '')
      ).trim() || 'Non renseigne'
    : 'Non renseigne';
  const selectedOrderOwnerEmail = selectedOrderDetail
    ? String(
        selectedOrderDetail.owner_email ||
        selectedOrderParsedDetails.meta?.owner_email ||
        (selectedOrderDetail.requester_quality === 'owner' ? selectedOrderDetail.requester_email : '')
      ).trim() || 'Non renseigne'
    : 'Non renseigne';
  const selectedOrderOwnerReference = selectedOrderDetail
    ? String(
        selectedOrderDetail.owner_reference ||
        selectedOrderParsedDetails.meta?.owner_reference ||
        ''
      ).trim() || 'Non renseigne'
    : 'Non renseigne';
  const selectedOrderManagerName = selectedOrderDetail
    ? String(
        selectedOrderDetail.requester_quality === 'syndic'
          ? selectedOrderDetail.requester_name
          : selectedOrderLinkedBuilding?.gestionnaire_nom || ''
      ).trim() || 'Non renseigne'
    : 'Non renseigne';
  const selectedOrderManagerEmail = selectedOrderDetail
    ? String(
        selectedOrderDetail.requester_quality === 'syndic'
          ? selectedOrderDetail.requester_email
          : selectedOrderLinkedBuilding?.gestionnaire_email || ''
      ).trim() || 'Non renseigne'
    : 'Non renseigne';
  const selectedOrderItems = selectedOrderParsedDetails.items || [];
  const selectedOrderPlaquettesCount = selectedOrderItems.length > 0
    ? selectedOrderItems.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.quantity || 1)), 0)
    : 0;
  const selectedOrderHasMultiLine = selectedOrderItems.some((item: any) => getOrderItemLines(item).length > 1);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-black/5 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-sm font-bold uppercase tracking-tight">{user.role === 'admin' ? 'Admin' : 'Syndic'}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          <div className={`w-5 h-0.5 bg-black transition-transform ${isSidebarOpen ? 'rotate-45 translate-y-1.5' : 'mb-1'}`} />
          <div className={`w-5 h-0.5 bg-black transition-opacity ${isSidebarOpen ? 'opacity-0' : 'mb-1'}`} />
          <div className={`w-5 h-0.5 bg-black transition-transform ${isSidebarOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed md:static inset-0 z-30 bg-white border-r border-black/5 flex flex-col w-full md:w-80 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} pt-16 md:pt-0`}>
        <div className="hidden md:flex p-8 border-b border-black/5 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-sm font-bold uppercase tracking-tight">{user.role === 'admin' ? 'Admin' : 'Syndic'}</span>
          </div>
          <button onClick={onLogout} className="text-zinc-400 hover:text-black transition-colors">
            <LogOut size={18} />
          </button>
        </div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          <button 
            onClick={() => { setAdminBuildingFilter('all'); setAdminOrderFilter('all'); setView('overview'); setSubView('list'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'overview' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <LayoutDashboard size={16} /> Vue d'ensemble
          </button>
          <button 
            onClick={() => { setAdminBuildingFilter('all'); setView('buildings'); setSubView('list'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'buildings' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <Building2 size={16} /> Immeubles
          </button>
          
          <button 
            onClick={() => { setAdminOrderFilter('all'); setView('orders'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'orders' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <ShoppingCart size={16} /> {user.role === 'syndic' ? 'Suivi commandes' : 'Commandes'}
          </button>

          {(user.role === 'syndic' || user.role === 'admin') && (
            <button
              onClick={() => setView('hallqr')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'hallqr' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
            >
              <QrCode size={16} /> QR Hall
            </button>
          )}

          {user.role === 'admin' && (
            <button 
              onClick={() => setView('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'users' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
            >
              <UsersIcon size={16} /> Syndics
            </button>
          )}

          {user.role === 'admin' && (
            <button 
              onClick={() => setView('installers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'installers' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
            >
              <UsersIcon size={16} /> Placeurs
            </button>
          )}

          {user.role === 'syndic' && !user.parent_id && (
            <button 
              onClick={() => setView('team')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'team' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
            >
              <UsersIcon size={16} /> Mon equipe
            </button>
          )}

          <button 
            onClick={() => setView('notifications')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'notifications' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <div className="flex items-center gap-3">
              <Bell size={16} /> Alertes
            </div>
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setView('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'profile' ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <Settings size={16} /> Mon Profil
          </button>
          <button 
            onClick={onLogout}
            className="md:hidden w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-red-500 hover:bg-red-50 mt-8"
          >
            <LogOut size={16} /> Deconnexion
          </button>
        </nav>
        <div className="mt-auto p-6 md:p-8 border-t border-black/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Connecte en tant que</div>
          <div className="text-xs font-bold truncate">{user.name}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12">
        {view === 'overview' && (
          <div className="max-w-5xl mx-auto">
            {user.role === 'syndic' && ENABLE_NEW_SYNDIC_DASHBOARD ? (
              <>
                <div className="mb-8 md:mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest mb-4">
                    <LayoutDashboard size={14} /> Espace syndic
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-3">Bonjour {displayFirstName}</h1>
                  <p className="text-zinc-500 text-sm md:text-base max-w-2xl">
                    {dashboardHook}
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 md:gap-8 mb-8 md:mb-12">
                  <div className="bg-black text-white p-6 md:p-10 rounded-[28px] md:rounded-[40px] overflow-hidden relative">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                    <div className="relative">
                      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 mb-4">Action rapide</div>
                      <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3">Commander ou partager un lien en quelques secondes.</h2>
                      <p className="text-sm md:text-base text-white/70 max-w-xl mb-8">
                        {pendingValidationCount > 0
                          ? `${pendingValidationCount} commande${pendingValidationCount > 1 ? 's' : ''} attend${pendingValidationCount > 1 ? 'ent' : ''} une validation.`
                          : "Aucune commande n'attend de validation pour le moment."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => setView('buildings')}
                          className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all"
                        >
                          Commander
                        </button>
                        <button
                          onClick={() => buildings.length > 0 ? openQuickShare() : setView('buildings')}
                          className="bg-white/10 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/15 transition-all"
                        >
                          Envoyer lien ACP
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 md:p-8 rounded-[28px] md:rounded-[40px] border border-black/5">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-5">Vue d'ensemble</div>
                    <div className="space-y-3">
                      <button onClick={() => setView('buildings')} className="w-full flex items-center justify-between bg-zinc-50 rounded-2xl px-4 py-4 hover:bg-zinc-100 transition-all">
                        <div className="text-left">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Immeubles</div>
                          <div className="text-lg font-bold">{buildings.length} actif{buildings.length > 1 ? 's' : ''}</div>
                        </div>
                        <span className="text-2xl font-bold text-zinc-900">{buildings.length}</span>
                      </button>
                      <button onClick={() => setView('orders')} className="w-full flex items-center justify-between bg-zinc-50 rounded-2xl px-4 py-4 hover:bg-zinc-100 transition-all">
                        <div className="text-left">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Commandes en cours</div>
                          <div className="text-lg font-bold">{activeOrdersCount} demande{activeOrdersCount > 1 ? 's' : ''}</div>
                        </div>
                        <span className="text-2xl font-bold text-zinc-900">{activeOrdersCount}</span>
                      </button>
                      <button onClick={() => setView('buildings')} className="w-full flex items-center justify-between bg-zinc-50 rounded-2xl px-4 py-4 hover:bg-zinc-100 transition-all">
                        <div className="text-left">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">ACP a mesurer</div>
                          <div className="text-lg font-bold">{pendingSurveyCount} immeuble{pendingSurveyCount > 1 ? 's' : ''}</div>
                        </div>
                        <span className="text-2xl font-bold text-amber-500">{pendingSurveyCount}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg md:text-xl font-bold tracking-tight uppercase">Immeubles mesures</h2>
                      <button onClick={() => setView('buildings')} className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black">Voir tout</button>
                    </div>
                    <div className="grid gap-3 md:gap-4">
                      {recentBuildings.length > 0 ? recentBuildings.map(b => (
                        <div key={b.id} className="bg-white p-4 md:p-6 rounded-[24px] border border-black/5 hover:border-black/20 transition-all">
                          <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => handleSelectBuilding(b.id)}>
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate mb-1">{b.name}</div>
                              <div className="text-[10px] text-zinc-400 truncate mb-3">{b.address}</div>
                              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                <span className={`w-2 h-2 rounded-full ${
                                  b.status === 'pending_survey' ? 'bg-amber-500' :
                                  b.status === 'survey_completed' ? 'bg-blue-500' :
                                  b.status === 'in_production' ? 'bg-emerald-500' :
                                  'bg-zinc-300'
                                }`} />
                                {b.status === 'pending_survey' && 'En attente de mesurage'}
                                {b.status === 'survey_completed' && 'Mesurage effectue'}
                                {b.status === 'in_production' && 'En production'}
                                {b.status === 'installed' && 'Place'}
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                          </div>
                          <div className="mt-4 pt-4 border-t border-black/5 flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleSelectBuilding(b.id, { openOrder: true })}
                              className="flex-1 bg-black text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                            >
                              Commander
                            </button>
                            <button
                              onClick={() => openQuickShare(b)}
                              className="flex-1 bg-zinc-100 text-zinc-700 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all"
                            >
                              Envoyer lien ACP
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="bg-white p-6 rounded-[24px] border border-dashed border-black/10 text-sm text-zinc-500">
                          Aucun immeuble n'est encore rattache a ce compte.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg md:text-xl font-bold tracking-tight uppercase">Suivi de commande</h2>
                      <button onClick={() => setView('orders')} className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black">Voir tout</button>
                    </div>
                    <div className="grid gap-3 md:gap-4">
                      {(urgentOrders.length > 0 ? urgentOrders : recentOrders).map(o => (
                        <div key={o.id} onClick={() => setView('orders')} className="bg-white p-4 md:p-6 rounded-[24px] border border-black/5 cursor-pointer hover:border-black/20 transition-all">
                          <div className="flex justify-between items-start gap-3 mb-3">
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate">{o.requester_name}</div>
                              <div className="text-[10px] text-zinc-400 truncate">{o.building_name}</div>
                            </div>
                            <div className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${getOrderStatusClass(o.status)}`}>
                              {getOrderStatusLabel(o.status)}
                            </div>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {o.lot_number ? `Lot ${o.lot_number}` : 'Lot non renseigne'}
                          </div>
                        </div>
                      ))}
                      {recentOrders.length === 0 && (
                        <div className="bg-white p-6 rounded-[24px] border border-dashed border-black/10 text-sm text-zinc-500">
                          Aucune commande recente pour l'instant.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8 md:mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest mb-4">
                    <Wrench size={14} /> Vue d'ensemble
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-3">Vue d'ensemble</h1>
                  <p className="text-zinc-500 text-sm md:text-base max-w-3xl">
                    Priorisez les ACP a mesurer, completer les standards techniques, puis faites avancer les commandes pour que le syndic voie chaque progression en temps reel.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8 md:mb-10">
                  <button onClick={() => { setAdminBuildingFilter('pending_survey'); setView('buildings'); setSubView('list'); }} className="bg-white border border-black/5 rounded-[24px] p-5 text-left hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/5 transition-all">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">ACP a mesurer</div>
                    <div className="text-3xl font-bold text-amber-500 mb-1">{pendingSurveyCount}</div>
                    <div className="text-xs text-zinc-500">Mesurage terrain</div>
                  </button>
                  <button onClick={() => { setAdminOrderFilter('validation'); setView('orders'); }} className="bg-white border border-black/5 rounded-[24px] p-5 text-left hover:border-red-200 hover:shadow-lg hover:shadow-red-500/5 transition-all">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">A valider</div>
                    <div className="text-3xl font-bold text-red-500 mb-1">{pendingValidationCount}</div>
                    <div className="text-xs text-zinc-500">Validation proprietaire</div>
                  </button>
                  <button onClick={() => { setAdminOrderFilter('production'); setView('orders'); }} className="bg-white border border-black/5 rounded-[24px] p-5 text-left hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Production</div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">{adminOrdersInProduction.length}</div>
                    <div className="text-xs text-zinc-500">Commandes actives</div>
                  </button>
                  <button onClick={() => { setAdminOrderFilter('pose'); setView('orders'); }} className="bg-white border border-black/5 rounded-[24px] p-5 text-left hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">A poser</div>
                    <div className="text-3xl font-bold text-emerald-600 mb-1">{adminOrdersInPose.length}</div>
                    <div className="text-xs text-zinc-500">Interventions terrain</div>
                  </button>
                  <button onClick={() => { setOrderTab('en_cours'); setAdminOrderFilter('billing'); setView('orders'); }} className="bg-white border border-black/5 rounded-[24px] p-5 text-left hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">A facturer</div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">{adminOrdersToInvoice.length}</div>
                    <div className="text-xs text-zinc-500">Commandes posees</div>
                  </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
                  <div className="bg-white border border-black/5 rounded-[28px] p-6 md:p-8">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Priorite operationnelle</div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                      {adminBuildingsToMeasure.length > 0
                        ? `${adminBuildingsToMeasure.length} ACP a traiter en premier`
                        : adminOrdersInProduction.length > 0
                          ? `${adminOrdersInProduction.length} commande${adminOrdersInProduction.length > 1 ? 's' : ''} en cours`
                          : 'Aucune urgence immediate'}
                    </h2>
                    <p className="text-sm text-zinc-600 mb-6">
                      {adminBuildingsToMeasure.length > 0
                        ? "Commencez par les mesurages pour debloquer les commandes."
                        : adminOrdersInProduction.length > 0
                          ? "Poursuivez la fabrication puis basculez en pose."
                          : "Vous pouvez verifier les dossiers recents et la facturation."}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          setAdminBuildingFilter(adminBuildingsToMeasure.length > 0 ? 'pending_survey' : 'survey_completed');
                          setView('buildings');
                          setSubView('list');
                        }}
                        className="bg-black text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all"
                      >
                        Ouvrir la file immeubles
                      </button>
                      <button
                        onClick={() => {
                          setAdminOrderFilter(adminOrdersAwaitingValidation.length > 0 ? 'validation' : 'production');
                          setView('orders');
                        }}
                        className="bg-white border border-black/10 text-zinc-700 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-50 transition-all"
                      >
                        Traiter les commandes
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-black/5 rounded-[28px] p-6 md:p-8">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Rythme du jour</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-2xl bg-zinc-50 border border-black/5 px-4 py-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Commandes actives</span>
                        <span className="text-lg font-bold">{activeOrdersCount}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-zinc-50 border border-black/5 px-4 py-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Posees a facturer</span>
                        <span className="text-lg font-bold text-orange-600">{adminOrdersToInvoice.length}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-zinc-50 border border-black/5 px-4 py-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Commandes facturees</span>
                        <span className="text-lg font-bold text-emerald-600">{adminOrdersCompleted.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg md:text-xl font-bold tracking-tight uppercase">File immeubles</h2>
                      <button onClick={() => { setAdminBuildingFilter('all'); setView('buildings'); setSubView('list'); }} className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black">Voir tout</button>
                    </div>
                    <div className="grid gap-3 md:gap-4">
                      {adminOverviewBuildings.map(b => (
                        <div key={b.id} className="bg-white p-4 md:p-6 rounded-[24px] border border-black/5 hover:border-black/20 transition-all">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate">{b.name}</div>
                              <div className="text-[10px] text-zinc-400 truncate mt-1">{b.address}</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${getBuildingStatusClass(b.status)}`}>
                              {getBuildingStatusLabel(b.status)}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500 mb-4">
                            {b.status === 'pending_survey' ? 'Mesurez les plaques et renseignez les standards.' :
                             b.status === 'survey_completed' ? 'Controlez les standards puis ouvrez les commandes.' :
                             'Suivez la production et preparez la pose.'}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={() => handleSelectBuilding(b.id)} className="flex-1 bg-black text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
                              Ouvrir la fiche
                            </button>
                            {b.status === 'survey_completed' && (
                              <button onClick={() => handleSelectBuilding(b.id, { openOrder: true })} className="flex-1 bg-zinc-100 text-zinc-700 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all">
                                Ouvrir commande
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {adminOverviewBuildings.length === 0 && (
                        <div className="bg-white p-6 rounded-[24px] border border-dashed border-black/10 text-sm text-zinc-500">
                          Aucun immeuble ne demande d'action immediate.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg md:text-xl font-bold tracking-tight uppercase">File commandes</h2>
                      <button onClick={() => { setAdminOrderFilter('all'); setView('orders'); }} className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black">Voir tout</button>
                    </div>
                    <div className="grid gap-3 md:gap-4">
                      {adminOverviewOrders.map(o => (
                        <div key={o.id} onClick={() => { setSelectedOrderDetail(o); setView('orders'); }} className="bg-white p-4 md:p-6 rounded-[24px] border border-black/5 cursor-pointer hover:border-black/20 transition-all">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate">{o.requester_name}</div>
                              <div className="text-[10px] text-zinc-400 truncate mt-1">{o.building_name}</div>
                            </div>
                            <div className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${getOrderStatusClass(o.status)}`}>
                              {getOrderStatusLabel(o.status)}
                            </div>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {OWNER_VALIDATION_PENDING_STATUSES.includes(o.status)
                              ? 'Validation externe a debloquer'
                              : o.status === 'en_pose'
                                ? 'Intervention a finaliser'
                                : o.status === 'posee'
                                  ? 'A facturer'
                                : 'Commande a pousser en production'}
                          </div>
                        </div>
                      ))}
                      {adminOverviewOrders.length === 0 && (
                        <div className="bg-white p-6 rounded-[24px] border border-dashed border-black/10 text-sm text-zinc-500">
                          Aucune commande urgente a traiter.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {quickLinkBuilding !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 w-full max-w-2xl shadow-2xl">
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <div className="text-lg md:text-2xl font-bold tracking-tight uppercase text-emerald-600 mb-2">Lien de commande ACP</div>
                  {!quickLinkBuilding.id && (
                    <p className="text-sm text-zinc-500">
                      Selectionnez d'abord l'ACP pour garantir que le lien genere correspond au bon immeuble.
                    </p>
                  )}
                </div>
                <button onClick={() => setQuickLinkBuilding(null)} className="text-zinc-400 hover:text-black">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                {!quickLinkBuilding.id && (
                  <div className="bg-zinc-50 rounded-2xl p-4 md:p-5 border border-black/5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 block">Immeubles actifs</label>
                    <div className="relative mb-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="text"
                        value={quickLinkSearch}
                        onChange={(e) => setQuickLinkSearch(e.target.value)}
                        placeholder="Rechercher un immeuble..."
                        className="w-full bg-white border border-black/5 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-black text-sm"
                      />
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {buildings
                        .filter((b) =>
                          String(b.name || '').toLowerCase().includes(quickLinkSearch.toLowerCase()) ||
                          String(b.address || '').toLowerCase().includes(quickLinkSearch.toLowerCase())
                        )
                        .map((b) => (
                          <button
                            key={b.id}
                            onClick={() => generateQuickLinkForBuilding(b)}
                            className="w-full bg-white rounded-xl border border-black/5 px-4 py-4 text-left hover:border-black/20 hover:bg-zinc-50 transition-all"
                          >
                            <div className="text-sm font-bold truncate mb-1">{b.name}</div>
                            <div className="text-xs text-zinc-500 truncate">{b.address}</div>
                          </button>
                        ))}
                      {buildings.filter((b) =>
                        String(b.name || '').toLowerCase().includes(quickLinkSearch.toLowerCase()) ||
                        String(b.address || '').toLowerCase().includes(quickLinkSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="bg-white rounded-xl border border-dashed border-black/10 px-4 py-6 text-sm text-zinc-500">
                          Aucun immeuble ne correspond a votre recherche.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {quickLinkBuilding.id && (
                  <>
                    <div className="bg-emerald-50 rounded-2xl p-4 md:p-5 border border-emerald-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Immeuble selectionne</div>
                          <div className="text-base font-bold">{quickLinkBuilding.name}</div>
                          <div className="text-sm text-zinc-600">{quickLinkBuilding.address}</div>
                        </div>
                        <button
                          onClick={() => {
                            setQuickLinkBuilding({});
                            setQuickLinkToken('');
                            setQuickLinkEmail('');
                            setQuickLinkSearch('');
                          }}
                          className="bg-white text-zinc-700 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 transition-all"
                        >
                          Choisir un autre
                        </button>
                      </div>
                    </div>

                <div className="bg-zinc-50 rounded-2xl p-4 md:p-5 border border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Lien unique</div>
                  {isGeneratingQuickLink ? (
                    <div className="text-sm text-zinc-500">Generation du lien en cours...</div>
                  ) : (
                    <>
                      <a
                        href={quickLinkToken ? buildPublicOrderUrl(quickLinkToken) : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block text-xs md:text-sm font-medium break-all mb-4 ${quickLinkToken ? 'text-zinc-700 hover:text-black underline underline-offset-2' : 'text-zinc-400 pointer-events-none no-underline'}`}
                      >
                        {quickLinkToken ? buildPublicOrderUrl(quickLinkToken) : 'Lien indisponible'}
                      </a>
                      <button
                        onClick={copyQuickLink}
                        disabled={!quickLinkToken}
                        className="w-full sm:w-auto bg-black text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                      >
                        Copier le lien
                      </button>
                      <button
                        onClick={openQuickLink}
                        disabled={!quickLinkToken}
                        className="w-full sm:w-auto bg-zinc-100 text-zinc-700 px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50"
                      >
                        Ouvrir le lien
                      </button>
                    </>
                  )}
                </div>

                <div className="bg-zinc-50 rounded-2xl p-4 md:p-5 border border-black/5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">Envoyer par email</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={quickLinkEmail}
                      onChange={(e) => setQuickLinkEmail(e.target.value)}
                      placeholder="pl@chet.be"
                      className="flex-1 bg-white border border-black/5 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black text-sm"
                    />
                    <button
                      onClick={sendQuickLink}
                      disabled={isSendingQuickLink || !quickLinkEmail}
                      className="bg-emerald-600 text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {isSendingQuickLink ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">
                    Utilise l'adresse contact qui doit recevoir le portail de commande.
                  </p>
                </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'buildings' && subView === 'list' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase tracking-widest mb-4">
                <Building2 size={14} /> {user.role === 'admin' ? 'File immeubles' : 'Immeubles'}
              </div>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-2">{user.role === 'admin' ? 'Parc technique' : 'Mes immeubles'}</h1>
                  <p className="text-zinc-500 text-sm md:text-base max-w-2xl">
                    {user.role === 'admin'
                      ? "Travaillez immeuble par immeuble : mesurage, standards, production et pose."
                      : "Retrouvez chaque immeuble, son statut et l'action a lancer en priorite."}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setNewBuilding({ name: '', street: '', number: '', box: '', zip: '', city: '', syndic_name: user.name, billing_info: user.company_name ? `${user.company_name}\n${user.address}\nTVA: ${user.vat_number}` : '', notes: '', gestionnaire_nom: '', gestionnaire_email: '' });
                    setIsAdding(true);
                  }}
                  className={`w-full lg:w-auto px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all text-xs ${user.role === 'admin' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-black text-white hover:bg-zinc-800'}`}
                >
                  <Plus size={18} /> {user.role === 'admin' ? 'Creer un dossier ACP' : 'Ajouter un immeuble'}
                </button>
              </div>
            </div>

            {user.role === 'admin' ? (
              <div className="grid md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                <button onClick={() => setAdminBuildingFilter('all')} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminBuildingFilter === 'all' ? 'border-black shadow-lg shadow-black/5' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">ACP actives</div>
                  <div className="text-3xl font-bold">{buildings.length}</div>
                </button>
                <button onClick={() => setAdminBuildingFilter('pending_survey')} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminBuildingFilter === 'pending_survey' ? 'border-amber-200 shadow-lg shadow-amber-500/10' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">A mesurer</div>
                  <div className="text-3xl font-bold text-amber-500">{pendingSurveyCount}</div>
                </button>
                <button onClick={() => setAdminBuildingFilter('survey_completed')} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminBuildingFilter === 'survey_completed' ? 'border-blue-200 shadow-lg shadow-blue-500/10' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Mesures prises</div>
                  <div className="text-3xl font-bold text-blue-600">{measuredBuildingsCount}</div>
                </button>
                <button onClick={() => setAdminBuildingFilter('in_production')} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminBuildingFilter === 'in_production' ? 'border-emerald-200 shadow-lg shadow-emerald-500/10' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">En production</div>
                  <div className="text-3xl font-bold text-emerald-600">{productionCount}</div>
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">ACP actives</div>
                  <div className="text-3xl font-bold">{buildings.length}</div>
                </div>
                <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">A mesurer</div>
                  <div className="text-3xl font-bold text-amber-500">{pendingSurveyCount}</div>
                </div>
                <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Pretes a commander</div>
                  <div className="text-3xl font-bold text-blue-600">{measuredBuildingsCount}</div>
                </div>
              </div>
            )}

            <div className="relative mb-6 md:mb-8">
              <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="text" 
                placeholder="Rechercher une ACP, une adresse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-black/5 rounded-xl md:rounded-2xl px-12 md:px-16 py-4 md:py-5 focus:ring-2 focus:ring-black outline-none shadow-sm text-sm"
              />
            </div>

            {user.role === 'admin' && (
            <div className="mb-6 md:mb-8 bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Demandes de transfert ACP</div>
                  <div className="text-lg font-bold tracking-tight">
                    {pendingTransferRequestsCount} en attente
                  </div>
                </div>
                <button
                  onClick={fetchTransferRequests}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all"
                >
                  Actualiser
                </button>
              </div>

              {isLoadingTransferRequests ? (
                <div className="text-sm text-zinc-500">Chargement des demandes...</div>
              ) : transferRequests.length === 0 ? (
                <div className="text-sm text-zinc-500">Aucune demande de transfert pour le moment.</div>
              ) : (
                <div className="grid gap-3">
                  {transferRequests.slice(0, 8).map((request: any) => {
                    const requestId = Number(request.id);
                    const requestStatus = String(request.status || 'pending');
                    const buildingLabel = buildings.find((b: any) => Number(b.id) === Number(request.building_id))?.name || `ACP #${request.building_id}`;
                    const isSourceSyndic = Number(request.from_syndic_user_id || 0) === actingOrganizationUserId;
                    const isRequester = Number(request.requested_by_user_id || 0) === Number(user.id);
                    const canApprove = requestStatus === 'pending' && (user.role === 'admin' || isSourceSyndic);
                    const canReject = requestStatus === 'pending' && (user.role === 'admin' || isSourceSyndic || isRequester);
                    const isMutating = isMutatingTransferRequestId === requestId;

                    return (
                      <div key={requestId} className="bg-zinc-50 border border-black/5 rounded-2xl p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-bold truncate">{buildingLabel}</div>
                              <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${transferStatusClassMap[requestStatus] || 'bg-zinc-100 text-zinc-700'}`}>
                                {transferStatusLabelMap[requestStatus] || requestStatus}
                              </span>
                            </div>
                              <div className="text-xs text-zinc-500">
                                Source #{request.from_syndic_user_id || '-'} -&gt; Cible #{request.to_syndic_user_id || '-'}  demande #{requestId}
                              </div>
                            {request.reason && (
                              <div className="text-xs text-zinc-500 mt-1 truncate">Motif: {String(request.reason)}</div>
                            )}
                          </div>

                          {(canApprove || canReject) && (
                            <div className="flex items-center gap-2">
                              {canApprove && (
                                <button
                                  onClick={() => approveTransferRequest(request)}
                                  disabled={isMutating}
                                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                  {isMutating ? '...' : 'Approuver'}
                                </button>
                              )}
                              {canReject && (
                                <button
                                  onClick={() => rejectTransferRequest(request)}
                                  disabled={isMutating}
                                  className="px-3 py-2 rounded-xl bg-white border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
                                >
                                  {isMutating ? '...' : (isRequester && user.role !== 'admin' ? 'Annuler' : 'Refuser')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            <div className="grid gap-4">
              {buildingsForCurrentList.length === 0 ? (
                <div className="bg-white border border-dashed border-black/10 rounded-[24px] md:rounded-[32px] p-8 md:p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-5 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                    <Building2 size={24} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mb-2">
                    {buildings.length === 0 ? "Aucun immeuble enregistre" : "Aucun immeuble trouve"}
                  </h3>
                  <p className="text-sm text-zinc-500 max-w-xl mx-auto mb-6">
                    {buildings.length === 0
                      ? "Commencez par ajouter votre premiere ACP. Vous pourrez ensuite enregistrer ses standards, commander et envoyer un lien de commande."
                      : "Aucun resultat ne correspond a votre recherche. Essayez avec le nom de l'ACP ou une partie de l'adresse."}
                  </p>
                  <button
                    onClick={() => {
                      setNewBuilding({ name: '', street: '', number: '', box: '', zip: '', city: '', syndic_name: user.name, billing_info: user.company_name ? `${user.company_name}\n${user.address}\nTVA: ${user.vat_number}` : '', notes: '', gestionnaire_nom: '', gestionnaire_email: '' });
                      setIsAdding(true);
                    }}
                    className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all"
                  >
                    Ajouter un immeuble
                  </button>
                </div>
              ) : paginatedBuildings.map((b) => {
                const buildingStatus = String(b.status || '');
                const syndicWorkflowStep =
                  buildingStatus === 'pending_survey' ? 1 :
                  buildingStatus === 'survey_completed' ? 2 :
                  buildingStatus === 'in_production' ? 3 : 4;
                const syndicWorkflowLabel =
                  buildingStatus === 'pending_survey' ? 'Mesurage en attente' :
                  buildingStatus === 'survey_completed' ? 'Pret a commander' :
                  buildingStatus === 'in_production' ? 'Production en cours' : 'ACP active';
                const syndicWorkflowHint =
                  buildingStatus === 'pending_survey'
                    ? "Attendez la validation du mesurage avant de commander."
                    : buildingStatus === 'survey_completed'
                      ? "Les standards sont prets. Vous pouvez lancer une commande."
                      : buildingStatus === 'in_production'
                        ? "La fabrication est en cours. Suivez l'etat dans la fiche."
                        : "Partagez le lien residents et suivez les demandes depuis Suivi commandes.";
                const syndicPrimaryActionLabel =
                  buildingStatus === 'survey_completed'
                    ? 'Commander maintenant'
                    : buildingStatus === 'pending_survey'
                      ? 'Suivre mesurage'
                      : buildingStatus === 'in_production'
                        ? 'Suivre production'
                        : 'Ouvrir la fiche ACP';
                const handleSyndicPrimaryAction = () => {
                  if (buildingStatus === 'survey_completed') {
                    handleSelectBuilding(b.id, { openOrder: true });
                    return;
                  }
                  handleSelectBuilding(b.id);
                };
                return (
                <div 
                  key={b.id}
                  className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 hover:shadow-xl hover:shadow-black/5 transition-all relative overflow-hidden"
                >
                  {user.role === 'admin' && isActiveFlag(b.is_new_for_admin) && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl z-10">
                      Nouveau
                    </div>
                  )}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="flex items-start gap-4 md:gap-6 min-w-0 flex-1">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-50 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-400 shrink-0">
                        <Building2 size={20} className="md:w-6 md:h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base md:text-lg font-bold tracking-tight">{b.name}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                            b.status === 'pending_survey' ? 'bg-amber-100 text-amber-700' :
                            b.status === 'survey_completed' ? 'bg-blue-100 text-blue-700' :
                            b.status === 'in_production' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-zinc-100 text-zinc-700'
                          }`}>
                            {b.status === 'pending_survey' ? 'A mesurer' :
                             b.status === 'survey_completed' ? 'Mesure' :
                             b.status === 'in_production' ? 'En production' : 'Place'}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-zinc-500 mb-4">{b.address}</p>
                        {user.role === 'admin' ? (
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div className="bg-zinc-50 rounded-2xl p-3">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Prochaine action</div>
                              <div className="text-sm font-bold">
                                {b.status === 'pending_survey' ? 'Prendre le mesurage' :
                                 b.status === 'survey_completed' ? 'Completer les standards' :
                                 b.status === 'in_production' ? 'Suivre la production' : 'Consulter la fiche'}
                              </div>
                            </div>
                            <div className="bg-zinc-50 rounded-2xl p-3">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Facturation</div>
                              <div className="text-sm font-bold truncate">{b.billing_info ? 'Renseignee' : 'A completer'}</div>
                            </div>
                            <div className="bg-zinc-50 rounded-2xl p-3">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Gestion</div>
                              <div className="text-sm font-bold truncate">{b.gestionnaire_nom || 'Non renseigne'}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-50 rounded-2xl p-3">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Workflow</div>
                            <div className="text-sm font-bold">Etape {syndicWorkflowStep}/4  {syndicWorkflowLabel}</div>
                            <p className="text-xs text-zinc-500 mt-1">{syndicWorkflowHint}</p>
                            {b.gestionnaire_nom && (
                              <p className="text-xs text-zinc-500 mt-2 truncate">
                                Contact: <span className="font-semibold text-zinc-700">{b.gestionnaire_nom}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-56 shrink-0">
                      {user.role === 'admin' ? (
                        <>
                          <button 
                            onClick={() => handleSelectBuilding(b.id)}
                            className="w-full bg-black text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                          >
                            Voir details
                          </button>
                          <button
                            onClick={() => openForceTransferModal(b)}
                            disabled={isForcingTransferBuildingId === Number(b.id)}
                            className="w-full bg-white border border-blue-100 text-blue-700 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-50"
                          >
                            {isForcingTransferBuildingId === Number(b.id) ? 'Transfert...' : 'Forcer transfert'}
                          </button>
                          {b.status === 'survey_completed' && (
                            <button
                              onClick={() => handleSelectBuilding(b.id, { openOrder: true })}
                              className="w-full bg-blue-500 text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all"
                            >
                              Ouvrir commande
                            </button>
                          )}
                          {b.status === 'pending_survey' && (
                            <button
                              onClick={() => handleSelectBuilding(b.id)}
                              className="w-full bg-amber-500 text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all"
                            >
                              Mesurer et completer
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleSyndicPrimaryAction}
                            className="w-full bg-emerald-500 text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all"
                          >
                            {syndicPrimaryActionLabel}
                          </button>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={() => openQuickShare(b)}
                              className="w-full bg-zinc-100 text-zinc-700 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all"
                            >
                              Lien residents
                            </button>
                            <button
                              onClick={() => handleSelectBuilding(b.id)}
                              className="w-full bg-white border border-black/10 text-zinc-700 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all"
                            >
                              Ouvrir la fiche
                            </button>
                          </div>
                        </>
                      )}
                      {user.role === 'admin' && (
                        <button 
                          onClick={() => handleDeleteBuilding(b.id)}
                          className="w-full px-4 py-3 text-red-500 border border-red-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all"
                        >
                          Retirer ACP
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
            {buildingsForCurrentList.length > ACP_PAGE_SIZE && (
              <div className="mt-6 md:mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-zinc-500">
                  Page <span className="font-bold text-zinc-800">{clampedBuildingPage}</span> / {totalBuildingPages}
                  <span className="ml-2">({buildingsForCurrentList.length} ACP)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBuildingPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={clampedBuildingPage <= 1}
                    className="px-4 py-2 rounded-xl border border-black/10 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
                  >
                    Precedent
                  </button>
                  <button
                    onClick={() => setBuildingPage((currentPage) => Math.min(totalBuildingPages, currentPage + 1))}
                    disabled={clampedBuildingPage >= totalBuildingPages}
                    className="px-4 py-2 rounded-xl border border-black/10 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isForceTransferModalOpen && user.role === 'admin' && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
            onClick={closeForceTransferModal}
          >
            <div
              className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-5xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-black/5">
                <div>
                  <h3 className="text-lg md:text-xl font-bold tracking-tight uppercase">Forcer transfert ACP</h3>
                  <p className="text-xs text-zinc-500 mt-1">Action d'urgence admin uniquement</p>
                </div>
                <button
                  onClick={closeForceTransferModal}
                  disabled={isForcingTransferBuildingId != null}
                  className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 hover:text-black transition-all disabled:opacity-50"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid md:grid-cols-[1.65fr_1fr] gap-6">
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">1. Rechercher un syndic</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                          type="text"
                          value={forceTransferSearch}
                          onChange={(e) => setForceTransferSearch(e.target.value)}
                          placeholder="Nom, societe ou email..."
                          className="w-full bg-zinc-50 border border-black/5 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">2. Choisir le syndic cible</label>
                      <div className="max-h-80 overflow-y-auto grid gap-2 pr-1">
                        {isLoadingSyndicCandidates ? (
                          <div className="text-sm text-zinc-500 bg-zinc-50 border border-black/5 rounded-xl p-4">Chargement des syndics...</div>
                        ) : filteredForceTransferCandidates.length === 0 ? (
                          <div className="text-sm text-zinc-500 bg-zinc-50 border border-black/5 rounded-xl p-4">Aucun syndic ne correspond.</div>
                        ) : (
                          filteredForceTransferCandidates.map((candidate: any) => {
                            const isSelected = Number(candidate.id) === Number(forceTransferTargetSyndicId);
                            return (
                              <button
                                key={candidate.id}
                                type="button"
                                onClick={() => setForceTransferTargetSyndicId(Number(candidate.id))}
                                className={`w-full text-left rounded-xl border p-3 transition-all ${
                                  isSelected
                                    ? 'border-black bg-black text-white'
                                    : 'border-black/10 bg-white hover:border-black/30'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                                      {candidate.name || 'Syndic'}
                                    </div>
                                    <div className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                                      {candidate.company_name || 'Societe non renseignee'}
                                    </div>
                                    <div className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                                      {candidate.email || 'Email non renseigne'}
                                    </div>
                                  </div>
                                  <div className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                    #{candidate.id}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-zinc-50 border border-black/5 rounded-2xl p-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">ACP cible</div>
                      <div className="text-base font-bold">{forceTransferTargetBuilding?.name || '-'}</div>
                      <div className="text-xs text-zinc-500 mt-1">{forceTransferTargetBuilding?.address || '-'}</div>
                      <div className="mt-3 text-[10px] uppercase tracking-widest text-zinc-400">
                        Syndic actuel: <span className="font-bold text-zinc-700 normal-case tracking-normal">{forceTransferTargetBuilding?.syndic_name || 'Non renseigne'}</span>
                      </div>
                    </div>

                    <div className="bg-white border border-black/5 rounded-2xl p-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">3. Motif</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {FORCE_TRANSFER_REASON_PRESETS.map((preset) => {
                          const active = String(forceTransferReason || '') === preset.value;
                          return (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setForceTransferReason(preset.value)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                active
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-zinc-600 border-black/10 hover:border-black/30'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        value={forceTransferReason}
                        onChange={(e) => setForceTransferReason(e.target.value)}
                        placeholder="urgence_mandat"
                        className="w-full bg-zinc-50 border border-black/5 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>

                    {selectedForceTransferSyndic ? (
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Transfert vers</div>
                        <div className="text-sm font-bold text-blue-900">
                          {selectedForceTransferSyndic.name || 'Syndic'} (#{selectedForceTransferSyndic.id})
                        </div>
                        <div className="text-xs text-blue-700 mt-1">{selectedForceTransferSyndic.email || 'Email non renseigne'}</div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Action requise</div>
                        <div className="text-xs text-amber-700">Selectionnez un syndic cible pour activer la confirmation.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 border-t border-black/5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  onClick={closeForceTransferModal}
                  disabled={isForcingTransferBuildingId != null}
                  className="px-5 py-3 rounded-xl border border-black/10 text-zinc-700 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmForceTransfer}
                  disabled={isForcingTransferBuildingId != null || !forceTransferTargetSyndicId}
                  className="px-5 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isForcingTransferBuildingId != null ? 'Transfert en cours...' : 'Confirmer transfert force'}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'buildings' && subView === 'detail' && (
          <BuildingDetail 
            building={selectedBuilding} 
            user={user}
            initialIsOrdering={openOrderOnBuildingLoad}
            onBack={() => setSubView('list')} 
            onRefresh={() => handleSelectBuilding(selectedBuilding.id)}
            onEditBuilding={() => {
              setNewBuilding({
                name: selectedBuilding.name,
                street: selectedBuilding.street || '',
                number: selectedBuilding.number || '',
                box: selectedBuilding.box || '',
                zip: selectedBuilding.zip || '',
                city: selectedBuilding.city || '',
                syndic_name: selectedBuilding.syndic_name || '',
                billing_info: selectedBuilding.billing_info || '',
                notes: selectedBuilding.notes || '',
                gestionnaire_nom: selectedBuilding.gestionnaire_nom || '',
                gestionnaire_email: selectedBuilding.gestionnaire_email || ''
              });
              setIsAdding(true);
            }}
          />
        )}

        {view === 'hallqr' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase tracking-widest mb-4">
                <QrCode size={14} /> QR Hall
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-2">
                {user.role === 'admin' ? 'Gestion QR Hall' : 'Demander un QR Hall'}
              </h1>
              <p className="text-zinc-500 text-sm md:text-base max-w-3xl">
                {user.role === 'admin'
                  ? "Generez et suivez les QR Hall lies a vie a chaque ACP. Les syndics passent une demande, l'equipe Plachet execute."
                  : "Option additionnelle Plachet. Le QR est rattache a vie a l'ACP et gere par notre equipe. Vous introduisez la demande, nous prenons ensuite le relais."}
              </p>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">Choisir l&apos;ACP</label>
                <select
                  value={selectedHallQrBuildingId ?? ''}
                  onChange={(event) => setSelectedHallQrBuildingId(Number(event.target.value) || null)}
                  className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Selectionner une ACP</option>
                  {buildings
                    .slice()
                    .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'fr', { sensitivity: 'base' }))
                    .map((building: any) => (
                      <option key={building.id} value={building.id}>
                        {building.name} - {building.address || `${building.street || ''} ${building.number || ''}`.trim()}
                      </option>
                    ))}
                </select>
                {selectedHallQrBuilding && (
                  <p className="text-xs text-zinc-500 mt-3">
                    ACP selectionnee: <span className="font-semibold text-zinc-700">{selectedHallQrBuilding.name}</span>
                  </p>
                )}
              </div>

              <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Statut actuel</div>
                {selectedHallQrOrder ? (
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${hallQrStatusClassMap[String(selectedHallQrOrder.status || '')] || 'bg-zinc-100 text-zinc-700'}`}>
                      {hallQrStatusLabelMap[String(selectedHallQrOrder.status || '')] || String(selectedHallQrOrder.status || 'inconnu')}
                    </span>
                    <span className="text-xs text-zinc-500">Demande #{selectedHallQrOrder.id}</span>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 mb-3">Aucune demande QR Hall pour cette ACP.</div>
                )}
                {user.role === 'syndic' ? (
                  <button
                    onClick={() => selectedHallQrBuilding && requestHallQrOrder(selectedHallQrBuilding)}
                    disabled={!selectedHallQrBuilding || isRequestingHallQrBuildingId === Number(selectedHallQrBuilding?.id) || selectedHallQrHasOpenOrder}
                    className="w-full bg-black text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                  >
                    {!selectedHallQrBuilding
                      ? 'Selectionner une ACP'
                      : isRequestingHallQrBuildingId === Number(selectedHallQrBuilding.id)
                        ? 'Demande en cours...'
                        : selectedHallQrHasOpenOrder
                          ? 'Demande deja en cours'
                          : selectedHallQrHasInstalled
                            ? 'Demander remplacement QR Hall'
                            : 'Demander QR Hall'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => selectedHallQrBuilding && copyOrCreateHallQrLink(selectedHallQrBuilding)}
                      disabled={!selectedHallQrBuilding || isLoadingHallQrLinkBuildingId === Number(selectedHallQrBuilding?.id)}
                      className="w-full bg-black text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                    >
                      {!selectedHallQrBuilding
                        ? 'Selectionner une ACP'
                        : isLoadingHallQrLinkBuildingId === Number(selectedHallQrBuilding.id)
                          ? 'Generation...'
                          : 'Generer ou copier le lien QR'}
                    </button>
                    <p className="text-xs text-zinc-500 mt-3">
                      Ce lien est celui a imprimer et poser dans le hall.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Demandes recentes QR Hall</div>
                <button
                  onClick={fetchHallQrOrders}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all"
                >
                  Actualiser
                </button>
              </div>
              {isLoadingHallQrOrders ? (
                <div className="text-sm text-zinc-500">Chargement...</div>
              ) : hallQrOrders.length === 0 ? (
                <div className="text-sm text-zinc-500">Aucune demande pour le moment.</div>
              ) : (
                <div className="grid gap-3">
                  {hallQrOrders.slice(0, 8).map((order: any) => {
                    const buildingLabel = buildings.find((b: any) => Number(b.id) === Number(order.building_id))?.name || `ACP #${order.building_id}`;
                    const status = String(order.status || '');
                    const orderId = Number(order.id);
                    const isMutating = isMutatingHallQrOrderId === orderId;
                    const canMoveProduction = user.role === 'admin' && status === 'requested';
                    const canMoveReady = user.role === 'admin' && status === 'in_production';
                    const canMoveInstalled = user.role === 'admin' && status === 'ready_to_install';
                    const canCancel = user.role === 'admin' && ['requested', 'in_production', 'ready_to_install'].includes(status);
                    return (
                      <div key={order.id} className="bg-zinc-50 border border-black/5 rounded-2xl p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-bold">{buildingLabel}</div>
                            <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${hallQrStatusClassMap[status] || 'bg-zinc-100 text-zinc-700'}`}>
                              {hallQrStatusLabelMap[status] || status}
                            </span>
                            <span className="text-xs text-zinc-500">Commande #{order.id}</span>
                          </div>
                          {(canMoveProduction || canMoveReady || canMoveInstalled || canCancel) && (
                            <div className="flex flex-wrap items-center gap-2">
                              {canMoveProduction && (
                                <button
                                  onClick={() => updateHallQrOrderStatus(order, 'in_production')}
                                  disabled={isMutating}
                                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                  {isMutating ? '...' : 'Production'}
                                </button>
                              )}
                              {canMoveReady && (
                                <button
                                  onClick={() => updateHallQrOrderStatus(order, 'ready_to_install')}
                                  disabled={isMutating}
                                  className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                                >
                                  {isMutating ? '...' : 'Pret pose'}
                                </button>
                              )}
                              {canMoveInstalled && (
                                <button
                                  onClick={() => updateHallQrOrderStatus(order, 'installed')}
                                  disabled={isMutating}
                                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                  {isMutating ? '...' : 'Marquer pose'}
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  onClick={() => updateHallQrOrderStatus(order, 'cancelled')}
                                  disabled={isMutating}
                                  className="px-3 py-2 rounded-xl bg-white border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
                                >
                                  {isMutating ? '...' : 'Annuler'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'orders' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-2">
                  {user.role === 'syndic' ? 'Suivi des commandes' : 'File des commandes'}
                </h1>
                <p className="text-zinc-500 text-sm md:text-base">
                  {user.role === 'syndic'
                    ? "Retrouvez ici les demandes recues, leur avancement et ce qui reste a traiter."
                    : "Traitez ici les validations, la production, la pose et l'historique des demandes."}
                </p>
              </div>
              {user.role !== 'syndic' && (
                <button 
                  onClick={downloadOrdersReport}
                  className="w-full md:w-auto bg-emerald-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 text-xs"
                >
                  <FileText size={18} /> Telecharger Rapport
                </button>
              )}
              {user.role === 'syndic' && (
                <button
                  onClick={sendOrdersReport}
                  disabled={isSendingOrdersReport}
                  className="w-full md:w-auto bg-emerald-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 text-xs disabled:opacity-50"
                >
                  <Mail size={18} /> {isSendingOrdersReport ? 'Envoi...' : 'Envoyer rapport'}
                </button>
              )}
            </div>

            {user.role === 'syndic' && (
              <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">A valider</div>
                  <div className="text-3xl font-bold text-red-500">{pendingValidationCount}</div>
                </div>
                <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">En cours</div>
                  <div className="text-3xl font-bold text-zinc-900">{orders.filter(o => o.status !== 'posee' && o.status !== 'annulee' && !OWNER_VALIDATION_PENDING_STATUSES.includes(o.status)).length}</div>
                </div>
                <div className="bg-white border border-black/5 rounded-[24px] p-5 md:p-6">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Terminees</div>
                  <div className="text-3xl font-bold text-emerald-600">{orders.filter(o => o.status === 'posee').length}</div>
                </div>
              </div>
            )}

            {user.role === 'admin' && (
              <div className="grid md:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
                <button onClick={() => setAdminOrderFilter('validation')} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminOrderFilter === 'validation' ? 'border-red-200 shadow-lg shadow-red-500/10' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Validation</div>
                  <div className="text-3xl font-bold text-red-500">{adminOrdersAwaitingValidation.length}</div>
                </button>
                <button onClick={() => setAdminOrderFilter('production')} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminOrderFilter === 'production' ? 'border-amber-200 shadow-lg shadow-amber-500/10' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Production</div>
                  <div className="text-3xl font-bold text-amber-600">{adminOrdersInProduction.length}</div>
                </button>
                <button onClick={() => setAdminOrderFilter('pose')} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminOrderFilter === 'pose' ? 'border-blue-200 shadow-lg shadow-blue-500/10' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Pose</div>
                  <div className="text-3xl font-bold text-blue-600">{adminOrdersInPose.length}</div>
                </button>
                <button onClick={() => { setOrderTab('en_cours'); setAdminOrderFilter('billing'); }} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminOrderFilter === 'billing' ? 'border-orange-200 shadow-lg shadow-orange-500/10' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">A facturer</div>
                  <div className="text-3xl font-bold text-orange-600">{adminOrdersToInvoice.length}</div>
                </button>
                <button onClick={() => setAdminOrderFilter('all')} className={`bg-white border rounded-[24px] p-5 md:p-6 text-left transition-all ${adminOrderFilter === 'all' ? 'border-black shadow-lg shadow-black/5' : 'border-black/5'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Toutes</div>
                  <div className="text-3xl font-bold">{orders.length}</div>
                </button>
              </div>
            )}

            <div className="relative mb-6 md:mb-8">
              <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="text" 
                placeholder={user.role === 'syndic' ? "Rechercher un demandeur, un lot ou une ACP..." : "Rechercher une commande (nom, immeuble, lot)..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsOrderSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsOrderSearchFocused(false), 150)}
                className="w-full bg-white border border-black/5 rounded-xl md:rounded-2xl px-12 md:px-16 py-4 md:py-5 focus:ring-2 focus:ring-black outline-none shadow-sm text-sm"
              />
              {isOrderSearchFocused && orderSearchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-3 bg-white border border-black/5 rounded-[24px] shadow-2xl z-40 overflow-hidden">
                  {orderSearchSuggestions.map((suggestion: any) => (
                    <button
                      key={`${suggestion.meta}-${suggestion.label}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearch(suggestion.label);
                        setIsOrderSearchFocused(false);
                      }}
                      className="w-full px-5 py-4 text-left hover:bg-zinc-50 transition-all border-b border-black/5 last:border-b-0"
                    >
                      <div className="text-sm font-bold text-zinc-900">{suggestion.label}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">{suggestion.meta}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 mb-8 border-b border-black/5">
              <button 
                onClick={() => setOrderTab('en_cours')}
                className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${orderTab === 'en_cours' ? 'border-b-2 border-black text-black' : 'text-zinc-400 hover:text-black'}`}
              >
                En Cours
              </button>
              <button 
                onClick={() => setOrderTab('historique')}
                className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${orderTab === 'historique' ? 'border-b-2 border-black text-black' : 'text-zinc-400 hover:text-black'}`}
              >
                Historique
              </button>
            </div>

            <div className="grid gap-8">
              {(() => {
                const ordersToRender = user.role === 'admin' ? adminFilteredOrders : filteredOrders;
                if (ordersToRender.length === 0) {
                  return (
                    <div className="bg-white border border-dashed border-black/10 rounded-[24px] md:rounded-[32px] p-8 md:p-12 text-center">
                      <div className="w-14 h-14 mx-auto mb-5 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                        <ShoppingCart size={24} />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight mb-2">Aucune commande a afficher</h3>
                      <p className="text-sm text-zinc-500 max-w-xl mx-auto mb-6">
                        {user.role === 'syndic'
                          ? "Aucune demande ne correspond a ce filtre. Vous pouvez lancer une commande depuis l'onglet Immeubles."
                          : "Aucune commande ne correspond a ce filtre."}
                      </p>
                      {user.role === 'syndic' && (
                        <button
                          onClick={() => { setView('buildings'); setSubView('list'); }}
                          className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all"
                        >
                          Aller vers mes immeubles
                        </button>
                      )}
                    </div>
                  );
                }

                return ordersToRender.map((order: any) => {
                  const parsedDetails = parseOrderDetails(order.details);
                  const orderItems = parsedDetails.items || [];
                  const engravedNames = parsedDetails.items.length > 0
                    ? parsedDetails.items.map((item: any) => getOrderItemLines(item).join(' / ') || 'Texte non renseigne')
                    : [order.name_to_replace || 'Commande sans nom'];
                  const orderPlaquettesCount = orderItems.length > 0
                    ? orderItems.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.quantity || 1)), 0)
                    : 0;
                  const orderHasMultiLine = orderItems.some((item: any) => getOrderItemLines(item).length > 1);

                  return (
                    <div key={order.id} className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 overflow-hidden">
                      <div className="p-4 md:p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                                {order.order_number || `Commande #${order.id}`}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                {new Date(order.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="font-bold text-sm md:text-base mb-1">
                              {engravedNames.join(', ')}
                            </div>
                            <div className="text-xs text-zinc-500 mb-2">
                              Demande par {order.requester_name}
                            </div>
                            {user.role === 'admin' && (
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-zinc-100 text-[9px] font-bold uppercase tracking-widest text-zinc-700">
                                  {orderPlaquettesCount} plaque{orderPlaquettesCount > 1 ? 'ttes' : 'tte'}
                                </span>
                                {orderHasMultiLine && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
                                    2+ lignes
                                  </span>
                                )}
                              </div>
                            )}
                            {user.role === 'admin' && (
                              <div className="text-xs text-zinc-500 mb-3">
                                {OWNER_VALIDATION_PENDING_STATUSES.includes(order.status)
                                  ? 'Action requise : debloquer la validation proprietaire.'
                                  : order.status === 'en_pose'
                                    ? 'Action requise : finaliser la pose et ajouter les photos.'
                                    : order.status === 'posee'
                                      ? 'Action requise : marquer facturee.'
                                      : 'Action requise : faire avancer la commande.'}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const match = buildings.find((b) => b.name === order.building_name);
                                  if (match) handleSelectBuilding(match.id);
                                }}
                                className="px-3 py-1.5 bg-zinc-100 rounded-full text-[9px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-200 transition-all"
                              >
                                {order.building_name}
                              </button>
                              <span className="text-[10px] text-zinc-400">
                                Lot {order.lot_number || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                            <div className={`text-center px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${getOrderStatusClass(order.status)}`}>
                              {getOrderStatusLabel(order.status)}
                            </div>
                            <div className="flex gap-2">
                              {user.role === 'admin' && (
                                <button
                                  onClick={async () => {
                                    const nextStatus = OWNER_VALIDATION_PENDING_STATUSES.includes(order.status)
                                      ? 'recue'
                                      : order.status === 'recue'
                                        ? 'en_traitement'
                                        : order.status === 'en_traitement'
                                          ? 'en_pose'
                                          : order.status === 'en_pose'
                                            ? 'posee'
                                            : order.status === 'posee'
                                              ? 'facturee'
                                            : order.status;
                                    if (nextStatus === order.status) {
                                      setSelectedOrderDetail(order);
                                      return;
                                    }
                                    await fetch(`/api/orders/${order.id}/status`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: nextStatus })
                                    });
                                    fetchOrders();
                                  }}
                                  className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                                >
                                  {OWNER_VALIDATION_PENDING_STATUSES.includes(order.status)
                                    ? 'Valider'
                                    : order.status === 'recue'
                                      ? 'Lancer'
                                    : order.status === 'en_traitement'
                                        ? 'Passer en pose'
                                        : order.status === 'en_pose'
                                          ? 'Marquer posee'
                                          : order.status === 'posee'
                                            ? 'Marquer facturee'
                                          : 'Traiter'}
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedOrderDetail(order)}
                                className="px-4 py-2 bg-zinc-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-200 transition-all"
                              >
                                Voir le detail
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {selectedOrderDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-10 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">
                    {selectedOrderDetail.order_number || `Commande #${selectedOrderDetail.id}`}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase mb-2">Detail de la demande</h2>
                </div>
                <button onClick={() => setSelectedOrderDetail(null)} className="text-zinc-400 hover:text-black">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div className="w-full md:w-auto">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">ACP</div>
                  <p className="text-sm font-bold">{selectedOrderDetail.building_name}</p>
                  <p className="text-xs md:text-sm text-zinc-400">{selectedOrderDetail.building_address}</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {user.role === 'admin' && (
                    <select 
                      value={selectedOrderDetail.status}
                      onChange={async (e) => {
                        await fetch(`/api/orders/${selectedOrderDetail.id}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: e.target.value })
                        });
                        setSelectedOrderDetail({ ...selectedOrderDetail, status: e.target.value });
                        fetchOrders();
                      }}
                      className={`w-full md:w-auto px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border-none outline-none cursor-pointer ${getOrderStatusClass(selectedOrderDetail.status)}`}
                    >
                      <option value="validation_proprietaire">Validation proprietaire</option>
                      <option value="recue">Recue</option>
                      <option value="en_traitement">En Traitement</option>
                      <option value="en_pose">En Pose</option>
                      <option value="posee">Posee</option>
                      <option value="facturee">Facturee</option>
                      <option value="annulee">Annulee</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 pt-6 border-t border-zinc-200">
                <div>
                  {user.role === 'syndic' ? (
                    <>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Synthese</div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-zinc-100 rounded-full text-[9px] font-bold uppercase tracking-tight text-zinc-700">
                          {getRequesterQualityLabel(selectedOrderDetail.requester_quality)}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-zinc-100 rounded-full text-[9px] font-bold uppercase tracking-tight text-zinc-700">
                          Boite / Appt {selectedOrderDetail.lot_number || 'N/A'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="bg-gradient-to-r from-zinc-50 to-white p-3 rounded-xl border border-black/5">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Gestionnaire</div>
                          <div className="text-sm font-bold">{selectedOrderManagerName}</div>
                          <div className="text-xs text-zinc-500">{selectedOrderManagerEmail}</div>
                        </div>
                        {selectedOrderDetail.requester_quality !== 'syndic' && (
                          <div className="bg-gradient-to-r from-zinc-50 to-white p-3 rounded-xl border border-black/5">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Demandeur</div>
                            <div className="text-sm font-bold">{selectedOrderDetail.requester_name || 'Non renseigne'}</div>
                            <div className="text-xs text-zinc-500">{selectedOrderDetail.requester_email || 'Non renseigne'}</div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Demandeur</div>
                      <div className="text-sm font-bold">{selectedOrderDetail.requester_name}</div>
                      <div className="text-xs text-zinc-500 mb-1">{selectedOrderDetail.requester_email}</div>
                      <div className="inline-flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded text-[9px] font-bold uppercase tracking-tight text-zinc-600 mb-2">
                        {getRequesterQualityLabel(selectedOrderDetail.requester_quality)} a Boite / Appt {selectedOrderDetail.lot_number || 'N/A'}
                      </div>
                      {selectedOrderDetail.name_to_replace && (
                        <div className="text-sm md:text-base text-zinc-600 mt-1">
                          <strong>Nom a remplacer:</strong> {selectedOrderDetail.name_to_replace}
                        </div>
                      )}
                      {selectedOrderParsedDetails.meta?.owner_name && (
                        <div className="text-sm md:text-base text-zinc-600 mt-1">
                          <strong>Proprietaire:</strong> {selectedOrderParsedDetails.meta.owner_name}
                        </div>
                      )}
                      {selectedOrderDetail.owner_email && (
                        <div className="text-sm md:text-base text-zinc-600 mt-1">
                          <strong>Email proprietaire:</strong> {selectedOrderDetail.owner_email}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Gravure / Details</div>
                  {user.role === 'admin' && (
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-zinc-100 text-[9px] font-bold uppercase tracking-widest text-zinc-700">
                        {selectedOrderPlaquettesCount} plaque{selectedOrderPlaquettesCount > 1 ? 'ttes' : 'tte'}
                      </span>
                      {selectedOrderHasMultiLine && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
                          2+ lignes
                        </span>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {user.role === 'syndic' && (
                      <>
                        <div className="bg-black text-white p-3 md:p-4 rounded-xl border border-black/5">
                          <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/60 block mb-2">Commande</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/60 mb-1">Nom a remplacer</div>
                              <div className="text-sm md:text-base font-bold">
                                {selectedOrderDetail.name_to_replace || 'Non renseigne'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/60 mb-1">Proprietaire</div>
                              <div className="text-sm md:text-base font-bold">{selectedOrderOwnerName}</div>
                              <div className="text-sm md:text-base text-white/80 mt-1">{selectedOrderOwnerEmail}</div>
                              <div className="text-[11px] text-white/70 mt-1">Ref: {selectedOrderOwnerReference}</div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {(() => {
	                      const parsedDetails = parseOrderDetails(selectedOrderDetail.details);
	                      if (parsedDetails.items.length > 0) {
	                        return parsedDetails.items.map((item: any, idx: number) => (
	                            (() => {
	                              const linkedSignage = selectedOrderLinkedBuilding?.signage?.find(
	                                (s: any) => Number(s.id) === Number(item.signage_id)
	                              );
                                const itemLines = getOrderItemLines(item);
	                              const itemMaterial = item.material || linkedSignage?.material || '';
	                              const itemMountType = item.mount_type || linkedSignage?.mount_type || '';
	                              const itemMarkingMethod = item.marking_method || linkedSignage?.marking_method || '';
	                              return (
		                            <div key={idx} className="bg-zinc-50 p-3 md:p-4 rounded-xl border border-black/5 flex justify-between items-center gap-2">
		                              <div className="min-w-0">
		                                <div className="flex items-center gap-2 flex-wrap">
		                                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 block truncate">{item.category}</span>
                                  {itemLines.length > 1 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-emerald-700">
                                      {itemLines.length} lignes
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 mt-1">
                                  {itemLines.length > 0 ? itemLines.map((line: string, lineIdx: number) => (
                                    <div key={`${idx}-line-${lineIdx}`} className="text-xs md:text-sm font-bold block break-words">
                                      <span className="text-zinc-400 mr-1">Ligne {lineIdx + 1}:</span>{line}
                                    </div>
                                  )) : (
                                    <span className="text-xs md:text-sm font-bold block">Texte non renseigne</span>
                                  )}
                                </div>
	                                {user.role === 'admin' && (
                                  <div className="flex flex-col gap-1 mt-1">
                                    <span className="text-xs md:text-sm text-zinc-500 font-medium block">
                                      {item.width && item.height ? `${item.width} x ${item.height} mm` : 'Dimensions standards'} 
                                      {item.font ? ` a ${item.font}` : ''}
                                      {item.font_size ? ` (${item.font_size}pt)` : ''}
                                    </span>
	                                    {(itemMaterial || itemMountType || itemMarkingMethod) && (
	                                      <span className="text-xs md:text-sm text-zinc-500 font-medium block">
	                                        {itemMaterial ? `Support: ${itemMaterial}` : 'Support: standard'}
	                                        {itemMountType ? ` a Pose: ${MOUNT_TYPE_LABELS[itemMountType] || itemMountType}` : ''}
	                                        {itemMarkingMethod ? ` a Marquage: ${MARKING_METHOD_LABELS[itemMarkingMethod] || itemMarkingMethod}` : ''}
	                                      </span>
	                                    )}
	                                    {item.color_bg && item.color_text && (
	                                      <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-black/5 shadow-sm">
                                          <div className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: getColorHex(item.color_bg) }} title={item.color_bg} />
                                          <span className="text-[8px] md:text-[9px] font-bold text-zinc-500">{item.color_bg}</span>
                                        </div>
                                        <span className="text-[8px] md:text-[9px] text-zinc-300">/</span>
                                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-black/5 shadow-sm">
                                          <div className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: getColorHex(item.color_text) }} title={item.color_text} />
                                          <span className="text-[8px] md:text-[9px] font-bold text-zinc-500">{item.color_text}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
	                              <div className="text-xs font-bold bg-white px-2 py-1 md:px-3 rounded-lg border border-black/5 shrink-0">
	                                x{item.quantity}
	                              </div>
	                            </div>
	                              );
	                            })()
	                          ));
	                      }
                      if (parsedDetails.rawText) {
                        return <p className="text-xs md:text-sm text-zinc-600 leading-relaxed font-mono bg-zinc-50 p-3 md:p-4 rounded-xl border border-black/5 break-words">{selectedOrderDetail.details}</p>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              {((user.role === 'admin' && selectedOrderDetail.status === 'en_pose') || selectedOrderDetail.status === 'posee') && (
                <div className="pt-6 mt-6 border-t border-zinc-200">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Photos d'intervention</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      {selectedOrderDetail.photo_before ? (
                        <img src={selectedOrderDetail.photo_before} alt="Avant" className="w-full h-32 md:h-40 object-cover rounded-xl" />
                      ) : (
                        <label className="w-full h-32 md:h-40 border-2 border-dashed border-black/10 rounded-xl flex flex-col items-center justify-center bg-zinc-50 cursor-pointer hover:bg-white transition-colors">
                          <Camera size={20} className="text-zinc-400 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Photo Avant</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                await fetch(`/api/orders/${selectedOrderDetail.id}/photo`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ type: 'before', image: reader.result })
                                });
                                setSelectedOrderDetail({ ...selectedOrderDetail, photo_before: reader.result });
                                fetchOrders();
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <div className="relative">
                      {selectedOrderDetail.photo_after ? (
                        <img src={selectedOrderDetail.photo_after} alt="Apres" className="w-full h-32 md:h-40 object-cover rounded-xl" />
                      ) : (
                        <label className="w-full h-32 md:h-40 border-2 border-dashed border-black/10 rounded-xl flex flex-col items-center justify-center bg-zinc-50 cursor-pointer hover:bg-white transition-colors">
                          <Camera size={20} className="text-zinc-400 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Photo Apres</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                await fetch(`/api/orders/${selectedOrderDetail.id}/photo`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ type: 'after', image: reader.result })
                                });
                                setSelectedOrderDetail({ ...selectedOrderDetail, photo_after: reader.result });
                                fetchOrders();
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase">Mon Profil Professionnel</h1>
              <button 
                onClick={() => setIsCompletingProfile(true)}
                className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
              >
                <Edit size={14} /> Modifier mon profil
              </button>
            </div>
            <div className="bg-white p-6 md:p-12 rounded-[24px] md:rounded-[40px] border border-black/5 space-y-8 md:space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">Contact principal</div>
                  <div className="text-lg md:text-xl font-bold">{getDisplayName(user)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">Societe</div>
                  <div className="text-lg md:text-xl font-bold">{user.company_name || 'N/A'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">Email</div>
                  <div className="text-lg md:text-xl font-bold break-all">{user.email}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">Telephone</div>
                  <div className="text-lg md:text-xl font-bold">{user.phone || 'N/A'}</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">Adresse</div>
                <div className="text-lg md:text-xl font-bold">{user.address || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">Numero de TVA</div>
                <div className="text-lg md:text-xl font-bold">{user.vat_number || 'N/A'}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">BCE</div>
                  <div className="text-lg md:text-xl font-bold">{user.bce_number || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">IPI</div>
                  <div className="text-lg md:text-xl font-bold">{user.ipi_number || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 md:mb-2">Certification</div>
                  <div className="text-lg md:text-xl font-bold">{isActiveFlag(user.is_ipi_certified) ? 'IPI certifie' : 'Non renseignee'}</div>
                </div>
              </div>
              {user.role !== 'admin' && (
                <div className="border-t border-red-100 pt-8">
                  <div className="bg-red-50 border border-red-100 rounded-[24px] p-6 md:p-8">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">Suppression du compte</div>
                    <h2 className="text-lg md:text-xl font-bold tracking-tight mb-2">Supprimer mon compte</h2>
                    <p className="text-sm text-zinc-600 mb-6">
                      Cette action supprime vos donnees de compte de maniere irreversible et retire vos acces. Les donnees strictement necessaires a la tracabilite des demandes et commandes peuvent etre conservees sous forme anonymisee.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="bg-white border border-red-200 text-red-600 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      {isDeletingAccount ? 'Suppression...' : 'Supprimer mon compte'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'users' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-2">Gestion Syndics</h1>
                <p className="text-zinc-500 text-sm md:text-base">Comptes d'acces partenaires.</p>
              </div>
              <button 
                onClick={() => setIsAddingUser(true)}
                className="w-full md:w-auto bg-black text-white px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all text-xs"
              >
                <UserPlus size={18} /> Nouveau Syndic
              </button>
            </div>
            <div className="grid gap-4">
              {users.map((u) => (
                <div key={u.id} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 flex flex-col gap-4 md:gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-50 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-400 shrink-0">
                        <UsersIcon size={20} className="md:w-6 md:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-bold tracking-tight truncate">{getDisplayName(u)}</h3>
                        <p className="text-xs md:text-sm text-zinc-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t border-black/5 sm:border-none pt-4 sm:pt-0">
                      <div className={`px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${u.profile_completed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {u.profile_completed ? 'Profil Complet' : 'Profil Incomplet'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setView('installers'); }}
                          className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100"
                        >
                          Gerer placeurs
                        </button>
                        <button className="p-2 md:p-3 text-zinc-300 hover:text-black transition-all">
                          <Settings size={18} className="md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {u.profile_completed === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 md:pt-6 border-t border-zinc-50">
                      <div>
                        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Societe</div>
                        <div className="text-xs md:text-sm font-bold">{u.company_name}</div>
                      </div>
                      <div>
                        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Telephone</div>
                        <div className="text-xs md:text-sm font-bold">{u.phone}</div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Adresse</div>
                        <div className="text-xs md:text-sm font-bold">{u.address}</div>
                      </div>
                      <div>
                        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">TVA</div>
                        <div className="text-xs md:text-sm font-bold">{u.vat_number}</div>
                      </div>
                      <div>
                        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">BCE</div>
                        <div className="text-xs md:text-sm font-bold">{u.bce_number || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">IPI</div>
                        <div className="text-xs md:text-sm font-bold">{u.ipi_number || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Statut IPI</div>
                        <div className="text-xs md:text-sm font-bold">{isActiveFlag(u.is_ipi_certified) ? 'Certifie' : 'Non certifie'}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'team' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-2">Mon equipe</h1>
                <p className="text-zinc-500 text-sm md:text-base">Gerez les acces de vos collaborateurs.</p>
              </div>
              <button 
                onClick={() => setIsAddingTeamMember(true)}
                className="w-full md:w-auto bg-black text-white px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all text-xs"
              >
                <UserPlus size={18} /> Nouveau collaborateur
              </button>
            </div>
            <div className="grid gap-4">
              {teamMembers.map((m) => (
                <div key={m.id} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 flex flex-col gap-4 md:gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-50 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-400 shrink-0">
                        <UsersIcon size={20} className="md:w-6 md:h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg md:text-xl uppercase tracking-tight">{getDisplayName(m)}</h3>
                        <p className="text-zinc-500 text-sm">{m.email}</p>
                      </div>
                    </div>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteTeamMember(m.id)}
                        className="w-full sm:w-auto px-4 py-2 border border-red-200 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                  <BuildingAccessPicker
                    buildings={buildings}
                    selectedIds={m.buildingIds || []}
                    hasFullAccess={Boolean(m.has_full_building_access)}
                    onToggleFullAccess={(next) =>
                      handleUpdateTeamMemberAccess(m.id, { has_full_building_access: next, buildingIds: m.buildingIds || [] })
                    }
                    onToggleBuilding={(buildingId, next) => {
                      const nextIds = next
                        ? [...(m.buildingIds || []), buildingId]
                        : (m.buildingIds || []).filter((id: number) => id !== buildingId);
                      handleUpdateTeamMemberAccess(m.id, { has_full_building_access: false, buildingIds: nextIds });
                    }}
                    emptyLabel="Aucun immeuble n'est encore disponible pour attribution."
                  />
                </div>
              ))}
              {teamMembers.length === 0 && (
                <div className="text-center py-12 bg-zinc-50 rounded-[32px] border border-black/5">
                  <UsersIcon size={48} className="mx-auto text-zinc-300 mb-4" />
                  <p className="text-zinc-500 font-medium">Aucun collaborateur dans votre equipe.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'installers' && user.role === 'admin' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-2">Placeurs</h1>
                <p className="text-zinc-500 text-sm md:text-base">Creez un placeur, envoyez-lui son lien d'activation, puis attribuez-lui des immeubles.</p>
              </div>
              <button 
                onClick={() => setIsAddingAdminTeamMember(true)}
                className="w-full md:w-auto bg-black text-white px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all text-xs"
              >
                <UserPlus size={18} /> Nouveau placeur
              </button>
            </div>

            <div className="grid gap-4">
              {adminTeamMembers.map((m) => (
                <div key={m.id} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 flex flex-col gap-4 md:gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-50 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-400 shrink-0">
                        <UsersIcon size={20} className="md:w-6 md:h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg md:text-xl uppercase tracking-tight">{getDisplayName(m)}</h3>
                        <p className="text-zinc-500 text-sm">{m.email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${m.profile_completed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {m.profile_completed ? 'Profil complete' : 'En attente activation'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${m.email_verified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {m.email_verified ? 'Email verifie' : 'Email a verifier'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteAdminTeamMember(m.id)}
                        className="w-full sm:w-auto px-4 py-2 border border-red-200 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                  <BuildingAccessPicker
                    buildings={adminBuildings}
                    selectedIds={m.buildingIds || []}
                    hasFullAccess={Boolean(m.has_full_building_access)}
                    onToggleFullAccess={(next) =>
                      handleUpdateAdminTeamMemberAccess(m.id, { has_full_building_access: next, buildingIds: m.buildingIds || [] })
                    }
                    onToggleBuilding={(buildingId, next) => {
                      const nextIds = next
                        ? [...(m.buildingIds || []), buildingId]
                        : (m.buildingIds || []).filter((id: number) => id !== buildingId);
                      handleUpdateAdminTeamMemberAccess(m.id, { has_full_building_access: false, buildingIds: nextIds });
                    }}
                    emptyLabel="Aucun immeuble disponible."
                  />
                </div>
              ))}
              {isAdminTeamLoading && <div className="text-sm text-zinc-500">Chargement...</div>}
              {adminTeamMembers.length === 0 && !isAdminTeamLoading && (
                <div className="text-center py-12 bg-zinc-50 rounded-[32px] border border-black/5">
                  <UsersIcon size={48} className="mx-auto text-zinc-300 mb-4" />
                  <p className="text-zinc-500 font-medium">Aucun placeur cree.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'notifications' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-2">Notifications</h1>
                <p className="text-zinc-500 text-sm md:text-base">Restez informe des dernieres activites de votre parc.</p>
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="w-full md:w-auto text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-2 bg-emerald-50 px-4 py-3 md:py-2 rounded-xl md:rounded-lg transition-all"
                >
                  <Check size={14} /> Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
              <button
                onClick={() => setNotificationCategoryFilter('all')}
                className={`text-left rounded-[24px] p-4 md:p-5 border transition-all ${notificationCategoryFilter === 'all' ? 'bg-black text-white border-black' : 'bg-white border-black/5 hover:border-black/15'}`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${notificationCategoryFilter === 'all' ? 'text-white/60' : 'text-zinc-400'}`}>Toutes</div>
                <div className="text-2xl font-bold">{notifications.length}</div>
              </button>
              {notificationCategories.map((category) => {
                const count = notifications.filter((notification) => getNotificationCategory(notification) === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => setNotificationCategoryFilter(category)}
                    className={`text-left rounded-[24px] p-4 md:p-5 border transition-all ${notificationCategoryFilter === category ? 'bg-black text-white border-black' : 'bg-white border-black/5 hover:border-black/15'}`}
                  >
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${notificationCategoryFilter === category ? 'text-white/60' : 'text-zinc-400'}`}>
                      {getNotificationCategoryLabel(category)}
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4">
              {filteredNotifications.map((n) => {
                const isWelcome = n.type === 'welcome';
                const isOrder = n.type === 'order';
                const isContact = n.type === 'contact';

                return (
                  <div 
                    key={n.id} 
                    className={`group relative p-4 md:p-8 rounded-[24px] md:rounded-[32px] border transition-all ${
                      n.is_read 
                        ? 'bg-white border-black/5 opacity-60 hover:opacity-100' 
                        : isWelcome 
                          ? 'bg-indigo-50 border-indigo-100 shadow-lg shadow-indigo-500/5'
                          : isOrder
                            ? 'bg-emerald-50 border-emerald-100 shadow-lg shadow-emerald-500/5'
                            : 'bg-blue-50 border-blue-100 shadow-lg shadow-blue-500/5'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
                      <div className="flex gap-4 md:gap-6 w-full md:w-auto">
                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${
                          isWelcome ? 'bg-indigo-100 text-indigo-600' :
                          isOrder ? 'bg-emerald-100 text-emerald-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {isWelcome ? <Sparkles size={20} className="md:w-6 md:h-6" /> :
                           isOrder ? <ShoppingCart size={20} className="md:w-6 md:h-6" /> :
                           <Mail size={20} className="md:w-6 md:h-6" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 md:gap-3 mb-1">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 truncate">
                              {new Date(n.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!n.is_read && (
                              <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 animate-pulse ${
                                isWelcome ? 'bg-indigo-500' :
                                isOrder ? 'bg-emerald-500' :
                                'bg-blue-500'
                              }`} />
                            )}
                          </div>
                          <h3 className="text-base md:text-xl font-bold tracking-tight mb-1 md:mb-2">{n.title}</h3>
                          <p className="text-xs md:text-sm text-zinc-600 leading-relaxed max-w-2xl whitespace-pre-line break-words">{n.message}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-row md:flex-col gap-2 items-center md:items-end w-full md:w-auto justify-end border-t border-black/5 md:border-none pt-4 md:pt-0">
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          className="p-2 text-zinc-300 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-all"
                          title="Supprimer"
                        >
                          <Trash size={16} className="md:w-4 md:h-4" />
                        </button>
                        {!n.is_read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className={`px-3 py-2 md:px-4 md:py-2 bg-white border rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm hover:shadow-md ${
                              isWelcome ? 'border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white' :
                              isOrder ? 'border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white' :
                              'border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'
                            }`}
                          >
                            Marquer comme lu
                          </button>
                        )}
                        {(isOrder || isWelcome || n.title === "Mesurage effectue") && (
                          <button 
                            onClick={() => {
                              if (isOrder) {
                                setAdminOrderFilter('all');
                                setView('orders');
                              }
                              if (isWelcome) {
                                if (user.role === 'admin') setView('users');
                                else setView('buildings');
                              }
                              if (n.title === "Mesurage effectue") {
                                setAdminBuildingFilter('all');
                                setView('buildings');
                              }
                              if (!n.is_read) markAsRead(n.id);
                            }}
                            className="px-3 py-2 md:px-4 md:py-2 bg-zinc-900 text-white rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                          >
                            <span className="hidden sm:inline">
                              {isOrder ? 'Voir la commande' : 
                               n.title === "Mesurage effectue" ? 'Commander' :
                               (user.role === 'admin' ? 'Voir les syndics' : 'Commencer')}
                            </span>
                            <span className="sm:hidden">Voir</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredNotifications.length === 0 && (
                <div className="bg-white border border-dashed border-black/10 rounded-[24px] md:rounded-[40px] py-20 md:py-32 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4 md:mb-6">
                    <Bell size={24} className="md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-base md:text-lg font-bold uppercase tracking-widest text-zinc-400">Aucune notification</h3>
                  <p className="text-zinc-400 text-xs md:text-sm mt-2">
                    {notificationCategoryFilter === 'all'
                      ? 'Vous etes a jour !'
                      : `Aucune notification dans ${getNotificationCategoryLabel(notificationCategoryFilter).toLowerCase()}.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Building Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-12 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase">
                  {(selectedBuilding && view === 'buildings' && subView === 'detail') ? "Modifier l'immeuble" : "Ajouter un immeuble"}
                </h2>
                <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-black"><X size={24} /></button>
              </div>
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom de l'ACP</label>
                    <input 
                      type="text" 
                      value={newBuilding.name}
                      onChange={(e) => setNewBuilding({...newBuilding, name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Syndic</label>
                    <input 
                      type="text" 
                      value={newBuilding.syndic_name}
                      onChange={(e) => setNewBuilding({...newBuilding, syndic_name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Rue</label>
                    <input 
                      type="text" 
                      value={newBuilding.street}
                      onChange={(e) => setNewBuilding({...newBuilding, street: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numero</label>
                      <input 
                        type="text" 
                        value={newBuilding.number}
                        onChange={(e) => setNewBuilding({...newBuilding, number: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Boite</label>
                      <input 
                        type="text" 
                        value={newBuilding.box}
                        onChange={(e) => setNewBuilding({...newBuilding, box: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Code Postal</label>
                      <input 
                        type="text" 
                        value={newBuilding.zip}
                        onChange={(e) => setNewBuilding({...newBuilding, zip: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Commune</label>
                      <input 
                        type="text" 
                        value={newBuilding.city}
                        onChange={(e) => setNewBuilding({...newBuilding, city: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom du gestionnaire (facultatif)</label>
                    <input 
                      type="text" 
                      value={newBuilding.gestionnaire_nom}
                      onChange={(e) => setNewBuilding({...newBuilding, gestionnaire_nom: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email du gestionnaire (facultatif)</label>
                    <input 
                      type="email" 
                      value={newBuilding.gestionnaire_email}
                      onChange={(e) => setNewBuilding({...newBuilding, gestionnaire_email: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Coordonnees de facturation</label>
                  <textarea 
                    rows={2}
                    value={newBuilding.billing_info}
                    onChange={(e) => setNewBuilding({...newBuilding, billing_info: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none resize-none text-sm" 
                    placeholder="Adresse de facturation, TVA, etc."
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Notes internes</label>
                  <textarea 
                    rows={3}
                    value={newBuilding.notes}
                    onChange={(e) => setNewBuilding({...newBuilding, notes: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none resize-none text-sm" 
                  />
                </div>
                <button 
                  onClick={handleAddBuilding}
                  className="w-full bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all"
                >
                  {(selectedBuilding && view === 'buildings' && subView === 'detail') ? "Enregistrer les modifications" : "Enregistrer l'immeuble"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {isAddingTeamMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-12 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Nouveau Collaborateur</h2>
                <button onClick={() => setIsAddingTeamMember(false)} className="text-zinc-400 hover:text-black"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddTeamMember} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prenom</label>
                    <input 
                      type="text" 
                      required
                      value={newTeamMember.first_name}
                      onChange={(e) => setNewTeamMember({...newTeamMember, first_name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom</label>
                    <input 
                      type="text" 
                      required
                      value={newTeamMember.last_name}
                      onChange={(e) => setNewTeamMember({...newTeamMember, last_name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
                    <input 
                      type="email" 
                      required
                      value={newTeamMember.email}
                      onChange={(e) => setNewTeamMember({...newTeamMember, email: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Mot de passe</label>
                    <input 
                      type="password" 
                      required
                      minLength={8}
                      value={newTeamMember.password}
                      onChange={(e) => setNewTeamMember({...newTeamMember, password: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                    <p className="text-[10px] text-zinc-500">Minimum 8 caracteres.</p>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confirmer mot de passe</label>
                    <input 
                      type="password" 
                      required
                      minLength={8}
                      value={newTeamMemberConfirmPassword}
                      onChange={(e) => setNewTeamMemberConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                </div>
                <BuildingAccessPicker
                  buildings={buildings}
                  selectedIds={newTeamMember.buildingIds}
                  hasFullAccess={newTeamMember.has_full_building_access}
                  onToggleFullAccess={(next) => setNewTeamMember({ ...newTeamMember, has_full_building_access: next })}
                  onToggleBuilding={(buildingId, next) => {
                    const nextIds = next
                      ? [...newTeamMember.buildingIds, buildingId]
                      : newTeamMember.buildingIds.filter((id) => id !== buildingId);
                    setNewTeamMember({ ...newTeamMember, buildingIds: nextIds });
                  }}
                  emptyLabel="Ajoutez d'abord un immeuble pour pouvoir attribuer un acces cible."
                />
                <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full bg-black text-white py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all text-xs"
                  >
                    Creer le compte
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isAddingAdminTeamMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-12 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Nouveau placeur</h2>
                <button onClick={() => setIsAddingAdminTeamMember(false)} className="text-zinc-400 hover:text-black"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddAdminTeamMember} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prenom</label>
                    <input 
                      type="text" 
                      required
                      value={adminNewTeamMember.first_name}
                      onChange={(e) => setAdminNewTeamMember({...adminNewTeamMember, first_name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom</label>
                    <input 
                      type="text" 
                      required
                      value={adminNewTeamMember.last_name}
                      onChange={(e) => setAdminNewTeamMember({...adminNewTeamMember, last_name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
                    <input 
                      type="email" 
                      required
                      value={adminNewTeamMember.email}
                      onChange={(e) => setAdminNewTeamMember({...adminNewTeamMember, email: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Mot de passe</label>
                    <input 
                      type="password" 
                      required
                      minLength={8}
                      value={adminNewTeamMember.password}
                      onChange={(e) => setAdminNewTeamMember({...adminNewTeamMember, password: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                    <p className="text-[10px] text-zinc-500">Minimum 8 caracteres.</p>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confirmer mot de passe</label>
                    <input 
                      type="password" 
                      required
                      minLength={8}
                      value={adminNewTeamMemberConfirmPassword}
                      onChange={(e) => setAdminNewTeamMemberConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                </div>
                <BuildingAccessPicker
                  buildings={adminBuildings}
                  selectedIds={adminNewTeamMember.buildingIds}
                  hasFullAccess={adminNewTeamMember.has_full_building_access}
                  onToggleFullAccess={(next) => setAdminNewTeamMember({ ...adminNewTeamMember, has_full_building_access: next })}
                  onToggleBuilding={(buildingId, next) => {
                    const nextIds = next
                      ? [...adminNewTeamMember.buildingIds, buildingId]
                      : adminNewTeamMember.buildingIds.filter((id) => id !== buildingId);
                    setAdminNewTeamMember({ ...adminNewTeamMember, buildingIds: nextIds });
                  }}
                  emptyLabel="Ajoutez d'abord un immeuble pour ce placeur."
                />
                <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full bg-black text-white py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all text-xs"
                  >
                    Creer le compte
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isAddingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-12 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Nouveau Compte Syndic</h2>
                <button onClick={() => setIsAddingUser(false)} className="text-zinc-400 hover:text-black"><X size={24} /></button>
              </div>
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prenom</label>
                    <input 
                      type="text" 
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom</label>
                    <input 
                      type="text" 
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
                    <input 
                      type="email" 
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Mot de passe</label>
                    <input 
                      type="password" 
                      minLength={8}
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                    <p className="text-[10px] text-zinc-500">Minimum 8 caracteres.</p>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confirmer mot de passe</label>
                    <input 
                      type="password" 
                      minLength={8}
                      value={newUserConfirmPassword}
                      onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Associer a des immeubles</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-zinc-50 rounded-xl">
                    {buildings.map(b => (
                      <label key={b.id} className="flex items-center gap-2 text-xs">
                        <input 
                          type="checkbox" 
                          checked={newUser.buildingIds.includes(b.id)}
                          onChange={(e) => {
                            const ids = e.target.checked 
                              ? [...newUser.buildingIds, b.id]
                              : newUser.buildingIds.filter(id => id !== b.id);
                            setNewUser({...newUser, buildingIds: ids});
                          }}
                        />
                        <span className="truncate">{b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={handleAddUser}
                  className="w-full bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all"
                >
                  Creer le compte
                </button>
              </div>
            </div>
          </div>
        )}

        {isCompletingProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-12 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6 md:mb-10">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase mb-2">
                    {user.profile_completed ? "Modifier votre profil" : "Completer votre profil"}
                  </h2>
                  <p className="text-zinc-500 text-xs md:text-sm">
                    {user.profile_completed 
                      ? "Mettez a jour vos informations professionnelles." 
                      : "Veuillez renseigner vos informations professionnelles pour finaliser votre inscription."}
                  </p>
                </div>
                {user.profile_completed === 1 && (
                  <button onClick={() => setIsCompletingProfile(false)} className="text-zinc-400 hover:text-black">
                    <X size={24} />
                  </button>
                )}
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                await fetch('/api/users/update-profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...data,
                    id: user.id,
                    is_ipi_certified: formData.get('is_ipi_certified') === 'on'
                  })
                });
                setIsCompletingProfile(false);
                window.location.reload();
              }} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prenom</label>
                    <input name="first_name" defaultValue={user.first_name} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom</label>
                    <input name="last_name" defaultValue={user.last_name} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom de la societe</label>
                  <input name="company_name" defaultValue={user.company_name} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Telephone</label>
                    <input name="phone" defaultValue={user.phone} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">N TVA</label>
                    <input name="vat_number" defaultValue={user.vat_number} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">N BCE</label>
                    <input name="bce_number" defaultValue={user.bce_number} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">N IPI</label>
                    <input name="ipi_number" defaultValue={user.ipi_number} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                </div>
                <label className="flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-4 cursor-pointer">
                  <input name="is_ipi_certified" type="checkbox" defaultChecked={isActiveFlag(user.is_ipi_certified)} className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Certifie IPI</span>
                </label>
                <div className="space-y-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Rue</label>
                    <input name="street" defaultValue={user.street} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numero</label>
                      <input name="number" defaultValue={user.number} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Boite</label>
                      <input name="box" defaultValue={user.box} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Code Postal</label>
                      <input name="zip" defaultValue={user.zip} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Commune</label>
                      <input name="city" defaultValue={user.city} required className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">
                  {user.profile_completed ? "Enregistrer les modifications" : "Enregistrer et Continuer"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const MATERIAL_TECHNICAL_CONFIG: Record<string, {
  label: string;
  helper: string;
  thicknesses: string[];
  mountTypes: string[];
  markingMethods: string[];
  shapes: string[];
  corners: string[];
  showShape: boolean;
  showCorners: boolean;
}> = {
  PVC: {
    label: 'PVC',
    helper: "Support standard pour BAL/parlophone. Souvent en gravure ou impression UV selon le rendu attendu.",
    thicknesses: ['0.8 mm', '1.5 mm', '2 mm', '3 mm', 'Autre'],
    mountTypes: ['glissiere', 'colle_3m', 'colle', 'visse'],
    markingMethods: ['grave', 'imprime_uv', 'imprime'],
    shapes: ['Rectangle', 'Carre', 'Sur mesure'],
    corners: ['Droits', 'Arrondis'],
    showShape: true,
    showCorners: true,
  },
  alu: {
    label: 'Aluminium',
    helper: "Support premium rigide. Utilise pour plaques durables en interieur/exterieur.",
    thicknesses: ['1 mm', '1.5 mm', '2 mm', '3 mm', 'Autre'],
    mountTypes: ['colle_3m', 'visse', 'entretoises', 'glissiere'],
    markingMethods: ['grave', 'imprime_uv', 'imprime'],
    shapes: ['Rectangle', 'Carre', 'Sur mesure'],
    corners: ['Droits', 'Arrondis'],
    showShape: true,
    showCorners: true,
  },
  plexi: {
    label: 'Plexiglas',
    helper: "Support transparent/satine pour rendu premium. Compatible impression UV ou gravure selon modele.",
    thicknesses: ['2 mm', '3 mm', '5 mm', '8 mm', 'Autre'],
    mountTypes: ['colle_3m', 'visse', 'entretoises'],
    markingMethods: ['imprime_uv', 'grave', 'imprime'],
    shapes: ['Rectangle', 'Carre', 'Sur mesure'],
    corners: ['Droits', 'Arrondis'],
    showShape: true,
    showCorners: true,
  },
  dibond: {
    label: 'Dibond',
    helper: "Composite alu pour signaletique rigide avec excellente stabilite dimensionnelle.",
    thicknesses: ['2 mm', '3 mm', '4 mm', 'Autre'],
    mountTypes: ['colle_3m', 'visse', 'entretoises'],
    markingMethods: ['imprime_uv', 'imprime'],
    shapes: ['Rectangle', 'Carre', 'Sur mesure'],
    corners: ['Droits', 'Arrondis'],
    showShape: true,
    showCorners: true,
  },
  laiton: {
    label: 'Laiton',
    helper: "Support noble, souvent grave, pour plaques de standing.",
    thicknesses: ['0.8 mm', '1 mm', '1.5 mm', 'Autre'],
    mountTypes: ['colle_3m', 'visse', 'entretoises'],
    markingMethods: ['grave', 'imprime'],
    shapes: ['Rectangle', 'Ovale', 'Sur mesure'],
    corners: ['Droits', 'Arrondis'],
    showShape: true,
    showCorners: true,
  },
  imprime: {
    label: 'Imprime',
    helper: "Insertion imprimee pour glissieres BAL/parlophone.",
    thicknesses: ['0.2 mm', '0.5 mm', 'Standard insertion', 'Autre'],
    mountTypes: ['glissiere', 'imprime'],
    markingMethods: ['imprime', 'imprime_uv'],
    shapes: ['Rectangle', 'Sur mesure'],
    corners: ['Droits'],
    showShape: true,
    showCorners: false,
  },
  dymo: {
    label: 'Dymo',
    helper: "Etiquette technique ou provisoire. Releve simple, centre sur le texte, la taille et le support.",
    thicknesses: ['Ruban standard', 'Autre'],
    mountTypes: ['colle', 'glissiere'],
    markingMethods: ['dymo', 'imprime'],
    shapes: ['Bande'],
    corners: [],
    showShape: true,
    showCorners: false,
  },
};

const MOUNT_TYPE_LABELS: Record<string, string> = {
  glissiere: 'Glissiere',
  colle: 'Colle',
  colle_3m: 'Adhesif 3M',
  visse: 'Visse',
  entretoises: 'Entretoises',
  imprime: 'Imprime (Insertion)',
};

const MARKING_METHOD_LABELS: Record<string, string> = {
  grave: 'Grave',
  imprime_uv: 'Impression UV',
  imprime: 'Imprime',
  dymo: 'Dymo',
};

const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Roboto',
  'Verdana',
  'Inter',
  'Futura',
  'Times',
  'Georgia',
  'Baskerville',
  'Lora',
  'Courier',
  'Inconsolata',
  'Dancing Script',
  'Pacifico',
  'Lobster',
];

const CATEGORY_DIMENSION_PRESETS: Record<string, Array<{ label: string; width: string; height: string }>> = {
  mailbox: [
    { label: 'BAL 70 x 20 mm', width: '70', height: '20' },
    { label: 'BAL 75 x 25 mm', width: '75', height: '25' },
    { label: 'BAL 80 x 20 mm', width: '80', height: '20' },
    { label: 'BAL 100 x 25 mm', width: '100', height: '25' },
  ],
  intercom: [
    { label: 'Interphone 60 x 15 mm', width: '60', height: '15' },
    { label: 'Interphone 70 x 20 mm', width: '70', height: '20' },
    { label: 'Interphone 80 x 20 mm', width: '80', height: '20' },
    { label: 'Interphone 100 x 20 mm', width: '100', height: '20' },
  ],
  door: [
    { label: 'Porte 100 x 30 mm', width: '100', height: '30' },
    { label: 'Porte 120 x 40 mm', width: '120', height: '40' },
    { label: 'Porte 150 x 50 mm', width: '150', height: '50' },
  ],
  elevator: [
    { label: 'Ascenseur 80 x 30 mm', width: '80', height: '30' },
    { label: 'Ascenseur 100 x 40 mm', width: '100', height: '40' },
    { label: 'Ascenseur 120 x 50 mm', width: '120', height: '50' },
  ],
  directory: [
    { label: 'Tableau 150 x 50 mm', width: '150', height: '50' },
    { label: 'Tableau 200 x 80 mm', width: '200', height: '80' },
    { label: 'Tableau 250 x 100 mm', width: '250', height: '100' },
  ],
};

const SIGNAGE_CATEGORY_LABELS: Record<string, string> = {
  mailbox: 'Boite aux lettres',
  intercom: 'Parlophone',
  elevator: 'Ascenseur',
  door: 'Porte / Appartement',
  directory: 'Tableau indicateur',
};

const BuildingDetail = ({ building, user, initialIsOrdering = false, onBack, onRefresh, onEditBuilding }: { building: any, user: any, initialIsOrdering?: boolean, onBack: () => void, onRefresh: () => void, onEditBuilding: () => void }) => {
  type BuildingOwner = {
    owner_id: number;
    name: string;
    email: string;
    reference: string;
  };

  const [isAddingSignage, setIsAddingSignage] = useState(false);
  const [editingSignageId, setEditingSignageId] = useState<number | null>(null);
  const [deletingSignageId, setDeletingSignageId] = useState<number | null>(null);
  const [isSavingSignage, setIsSavingSignage] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderToken, setOrderToken] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isSharingLink, setIsSharingLink] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [orderRequesterQuality, setOrderRequesterQuality] = useState<'owner' | 'syndic'>('owner');
  const [ownerContact, setOwnerContact] = useState({ name: '', email: '' });
  const [ownerReference, setOwnerReference] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [buildingOwners, setBuildingOwners] = useState<BuildingOwner[]>([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);

  const [newSignage, setNewSignage] = useState({
    category: 'mailbox',
    mount_type: 'glissiere',
    material: 'PVC',
    width: '',
    height: '',
    thickness: '',
    shape: '',
    corners: '',
    marking_method: 'grave',
    max_lines: '2',
    color_bg: '',
    color_text: '',
    font: '',
    font_size: '',
    location_detail: '',
    notes: '',
    image_data: '',
    after_image_data: ''
  });

  const materialConfig = MATERIAL_TECHNICAL_CONFIG[newSignage.material] || MATERIAL_TECHNICAL_CONFIG.PVC;
  const applyMaterialConfig = (material: string) => {
    const config = MATERIAL_TECHNICAL_CONFIG[material] || MATERIAL_TECHNICAL_CONFIG.PVC;
    setNewSignage((current) => ({
      ...current,
      material,
      thickness: config.thicknesses.includes(current.thickness) ? current.thickness : '',
      mount_type: config.mountTypes.includes(current.mount_type) ? current.mount_type : config.mountTypes[0] || '',
      marking_method: config.markingMethods.includes(current.marking_method) ? current.marking_method : config.markingMethods[0] || '',
      shape: config.showShape && config.shapes.includes(current.shape) ? current.shape : '',
      corners: config.showCorners && config.corners.includes(current.corners) ? current.corners : '',
    }));
  };
  const dimensionPresets = CATEGORY_DIMENSION_PRESETS[newSignage.category] || [];
  const withSignageMeta = (payload: any) => ({
    ...payload,
    notes: injectSignageMetaInNotes(payload.notes, payload.max_lines),
  });
  const stripSignageMeta = (notes: unknown) => extractSignageMetaFromNotes(notes).cleanNotes;

  useEffect(() => {
    if (initialIsOrdering) {
      setIsOrdering(true);
    }
  }, [building.id, initialIsOrdering]);

  const fetchBuildingOwners = async () => {
    setIsLoadingOwners(true);
    try {
      const res = await fetch(`/api/buildings/${building.id}/owners?userId=${user.id}&role=${user.role}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || "Impossible de charger les proprietaires.");
      setBuildingOwners(Array.isArray(data) ? data : []);
    } catch (error) {
      setBuildingOwners([]);
      console.warn("Owners list unavailable:", error);
    } finally {
      setIsLoadingOwners(false);
    }
  };

  const saveOwnerForBuilding = async (name: string, email: string, reference: string) => {
    const res = await fetch(`/api/buildings/${building.id}/owners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        role: user.role,
        name: String(name || '').trim(),
        email: String(email || '').trim() || null,
        reference: String(reference || '').trim()
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Impossible d'enregistrer le proprietaire.");
    }
    setBuildingOwners(Array.isArray(data.owners) ? data.owners : []);
  };

  const removeOwnerFromBuilding = async (ownerId: number) => {
    try {
      const res = await fetch(`/api/buildings/${building.id}/owners/${ownerId}?userId=${user.id}&role=${user.role}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible de supprimer ce proprietaire.");
      }
      setBuildingOwners(Array.isArray(data.owners) ? data.owners : []);
    } catch (error: any) {
      alert(error.message || "Impossible de supprimer ce proprietaire.");
    }
  };

  useEffect(() => {
    if (isOrdering) {
      fetchBuildingOwners();
    }
  }, [isOrdering, building.id, user.id, user.role]);

  const buildFallbackOwnerReference = () => {
    const sanitizedName = String(ownerContact.name || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    const timestamp = Date.now().toString().slice(-6);
    return `PLA-${sanitizedName || "PLACHET"}-${timestamp}`;
  };

  const handleAfterPhoto = async (signageId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await fetch(`/api/signage/${signageId}/after-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      onRefresh();
    };
    reader.readAsDataURL(file);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'survey_completed') {
        payload.survey_date = new Date().toISOString();
      }

      const res = await fetch(`/api/buildings/${building.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de mettre a jour le statut du projet.");
      }

      onRefresh();
    } catch (error: any) {
      alert(error.message || "Impossible de mettre a jour le statut du projet.");
    }
  };

  const generateOrderLink = async () => {
    const res = await fetch(`/api/buildings/${building.id}/generate-link`, { method: 'POST' });
    const { token } = await res.json();
    setOrderToken(token);
    setIsSharingLink(true);
  };

  const copyLink = async () => {
    const url = buildPublicOrderUrl(orderToken);
    try {
      await navigator.clipboard.writeText(url);
      alert('Lien copie !');
    } catch (err) {
      alert('Impossible de copier automatiquement. Veuillez selectionner et copier le lien manuellement.');
    }
  };

  const openLink = () => {
    if (!orderToken) return;
    window.location.href = buildPublicOrderUrl(orderToken);
  };

  const sendEmailLink = async () => {
    if (!shareEmail) return alert('Veuillez entrer une adresse email.');
    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/buildings/${building.id}/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: shareEmail,
          syndicName: user.name,
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Email envoye avec succes s !');
        setIsSharingLink(false);
        setShareEmail('');
      } else {
        alert('Erreur lors de l\'envoi de l\'email.');
      }
    } catch (e) {
      alert('Erreur de connexion.');
    }
    setIsSendingEmail(false);
  };

  const handleAddSignage = async () => {
    // Validation
    if (!newSignage.category || !newSignage.mount_type || !newSignage.width || !newSignage.height || !newSignage.color_bg || !newSignage.color_text || !newSignage.marking_method) {
      alert("Veuillez remplir tous les champs obligatoires (Categorie, Fixation, Dimensions, Couleurs, Marquage).");
      return;
    }

    setIsSavingSignage(true);

    try {
      if (editingSignageId) {
        const signagePayload = withSignageMeta(newSignage);
        const res = await fetch(`/api/signage/${editingSignageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signagePayload)
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Impossible d'enregistrer la modification.");
        }
        setIsAddingSignage(false);
        setEditingSignageId(null);
        alert('Element technique modifie avec succes s !');
      } else {
        const signagePayload = withSignageMeta(newSignage);
        const res = await fetch(`/api/buildings/${building.id}/signage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signagePayload)
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Impossible d'enregistrer l'element technique.");
        }
        setIsAddingSignage(false);
        setNewSignage({
          category: 'mailbox',
          mount_type: 'glissiere',
          material: 'PVC',
          width: '',
          height: '',
          thickness: '',
          shape: '',
          corners: '',
          marking_method: 'grave',
          max_lines: '2',
          color_bg: '',
          color_text: '',
          font: '',
          font_size: '',
          location_detail: '',
          notes: '',
          image_data: '',
          after_image_data: ''
        });
        alert('Element technique enregistre avec succes s !');
      }
      onRefresh();
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement:", error);
      alert(error.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSavingSignage(false);
    }
  };

  const handleOpenAddSignage = () => {
    setNewSignage({
      category: 'mailbox',
      mount_type: 'glissiere',
      material: 'PVC',
      width: '',
      height: '',
      thickness: '',
      shape: '',
      corners: '',
      marking_method: 'grave',
      max_lines: '2',
      color_bg: '',
      color_text: '',
      font: '',
      font_size: '',
      location_detail: '',
      notes: '',
      image_data: '',
      after_image_data: ''
    });
    setEditingSignageId(null);
    setIsAddingSignage(true);
  };

  const handleDeleteSignage = async (id: number) => {
    if (confirm("Etes-vous sur de vouloir supprimer cet Element technique ?")) {
      setDeletingSignageId(id);
      try {
        const res = await fetch(`/api/signage/${id}`, { method: 'DELETE' });
        if (res.ok) {
          onRefresh();
        } else {
          const data = await res.json();
          alert("Erreur lors de la suppression: " + (data.error || "Inconnue"));
        }
      } catch (e) {
        alert("Erreur de connexion.");
      } finally {
        setDeletingSignageId(null);
      }
    }
  };

  const openEditSignage = (signage: any) => {
    const signageMeta = extractSignageMetaFromNotes(signage.notes);
    setNewSignage({
      category: signage.category || 'mailbox',
      mount_type: signage.mount_type || 'glissiere',
      material: signage.material || 'PVC',
      width: signage.width || '',
      height: signage.height || '',
      thickness: signage.thickness || '',
      shape: signage.shape || '',
      corners: signage.corners || '',
      marking_method: signage.marking_method || '',
      max_lines: String(signageMeta.maxLines || 2),
      color_bg: signage.color_bg || '',
      color_text: signage.color_text || '',
      font: signage.font || '',
      font_size: signage.font_size || '',
      location_detail: signage.location_detail || '',
      notes: signageMeta.cleanNotes || '',
      image_data: signage.image_data || '',
      after_image_data: signage.after_image_data || ''
    });
    setEditingSignageId(signage.id);
    setIsAddingSignage(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black flex items-center gap-2">
          <ArrowRight size={14} className="rotate-180" /> Retour
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={generateOrderLink}
            className="bg-white border border-black/5 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50"
          >
            <LinkIcon size={14} /> Partager le lien
          </button>
          <button 
            onClick={() => setIsOrdering(true)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700"
          >
            <ShoppingCart size={14} /> Commander
          </button>
        </div>
      </div>

      {isSharingLink && orderToken && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold tracking-tight">Partager le lien</h3>
              <button onClick={() => setIsSharingLink(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">Lien de commande</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={buildPublicOrderUrl(orderToken)}
                    className="flex-1 bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
                  />
                  <button onClick={copyLink} className="bg-black text-white px-4 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center">
                    <Copy size={16} />
                  </button>
                  <a
                    href={buildPublicOrderUrl(orderToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-100 text-zinc-700 px-4 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center"
                    aria-label="Ouvrir le lien"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
                <button
                  onClick={openLink}
                  className="mt-3 w-full bg-zinc-100 text-zinc-700 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                >
                  Ouvrir le lien ici
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-zinc-500 text-[10px] font-bold uppercase tracking-widest">OU</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">Envoyer par email (via Plachet)</label>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Email du client"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="flex-1 bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
                  />
                  <button 
                    onClick={sendEmailLink} 
                    disabled={isSendingEmail || !shareEmail}
                    className="bg-emerald-600 text-white px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSendingEmail ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">Un email professionnel sera envoye au client avec le lien de commande.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-10 rounded-[40px] border border-black/5 shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight mb-8 uppercase">Statut du Projet</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  building.status === 'pending_survey' ? 'bg-amber-500 animate-pulse' :
                  building.status === 'survey_completed' ? 'bg-blue-500' :
                  'bg-zinc-300'
                }`} />
                <div className="text-sm font-bold uppercase tracking-widest">
                  {building.status === 'pending_survey' && 'En attente de mesurage'}
                  {building.status === 'survey_completed' && 'Mesurage effectue'}
                </div>
              </div>
              
              {building.survey_date && (
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  Mesurage pris le {new Date(building.survey_date).toLocaleDateString('fr-FR')}
                </div>
              )}

	              {user.role === 'admin' && (
	                <div className="pt-6 border-t border-zinc-100 flex flex-wrap gap-2">
	                  <button
	                    onClick={() => handleStatusUpdate('pending_survey')}
	                    disabled={building.status === 'pending_survey'}
	                    className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
	                      building.status === 'pending_survey'
	                        ? 'bg-amber-500 text-white'
	                        : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white'
	                    } disabled:opacity-70 disabled:cursor-not-allowed`}
	                  >
	                    En attente de mesurage
	                  </button>
	                  <button
	                    onClick={() => handleStatusUpdate('survey_completed')}
	                    disabled={building.status === 'survey_completed'}
	                    className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
	                      building.status === 'survey_completed'
	                        ? 'bg-blue-500 text-white'
	                        : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
	                    } disabled:opacity-70 disabled:cursor-not-allowed`}
	                  >
	                    Mesurage effectue
	                  </button>
	                </div>
	              )}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[40px] border border-black/5 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight uppercase">Informations</h2>
              <button 
                onClick={onEditBuilding}
                className="text-zinc-400 hover:text-black transition-all p-2 rounded-xl hover:bg-zinc-50"
                title="Modifier l'immeuble"
              >
                <Edit size={16} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Immeuble</div>
                <div className="font-bold">{building.name}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Adresse</div>
                <div className="text-sm text-zinc-500">{building.address}</div>
              </div>
              <div className="pt-6 border-t border-zinc-100">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Facturation</div>
                <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-line">{building.billing_info || 'Non renseignee.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-end">
            <h2 className="text-3xl font-bold tracking-tighter uppercase">Standards Techniques</h2>
            {user.role === 'admin' && (
              <button 
                onClick={handleOpenAddSignage}
                className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
              >
                <Plus size={14} /> Ajouter un standard
              </button>
            )}
          </div>

          <div className="grid gap-6">
            {building.signage?.map((s: any) => (
              <div key={s.id} className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center text-black">
                      {s.category === 'mailbox' && <Mail size={20} />}
                      {s.category === 'intercom' && <Phone size={20} />}
                      {s.category === 'elevator' && <Layers size={20} />}
                      {s.category === 'door' && <Building2 size={20} />}
                      {s.category === 'directory' && <FileText size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-tight">{SIGNAGE_CATEGORY_LABELS[s.category] || s.category}</h4>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{MOUNT_TYPE_LABELS[s.mount_type] || s.mount_type}</p>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditSignage(s)} className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSignage(s.id)} 
                        disabled={deletingSignageId === s.id}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingSignageId === s.id ? <span className="animate-spin block w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"></span> : <Trash2 size={16} />}
                      </button>
                    </div>
                  )}
                </div>
                {user.role === 'admin' ? (
                  <details className="group mt-2">
                    <summary className="list-none cursor-pointer bg-zinc-50 border border-black/5 rounded-2xl px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Details du standard</span>
                      <ChevronRight size={16} className="text-zinc-400 transition-transform group-open:rotate-90" />
                    </summary>

                    <div className="pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-zinc-50 p-4 rounded-2xl flex flex-col justify-center">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Dimensions</div>
                          <div className="text-xl font-black tracking-tighter">{s.width} O {s.height} <span className="text-xs text-zinc-400 font-bold">mm</span></div>
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-2xl flex flex-col justify-center">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Matiere</div>
                          <div className="text-sm font-bold">{s.material || '-'}</div>
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-2xl flex flex-col justify-center">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Epaisseur</div>
                          <div className="text-sm font-bold">{s.thickness || '-'}</div>
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-2xl flex flex-col justify-center">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Forme</div>
                          <div className="text-sm font-bold">{s.shape || '-'}</div>
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-2xl md:col-span-2 flex flex-col justify-center">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Couleurs & Typographie</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-black/5 shadow-sm">
                              <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: getColorHex(s.color_bg) }} title={s.color_bg} />
                              <span className="text-xs font-bold">{s.color_bg}</span>
                            </div>
                            <span className="text-zinc-300 font-bold">/</span>
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-black/5 shadow-sm">
                              <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: getColorHex(s.color_text) }} title={s.color_text} />
                              <span className="text-xs font-bold">{s.color_text}</span>
                            </div>
                            <span className="text-zinc-300 font-bold">/</span>
                            <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg border border-black/5 shadow-sm">{s.font || '-'} {s.font_size ? `(${s.font_size}pt)` : ''}</span>
                          </div>
                        </div>
                        {s.location_detail && (
                          <div className="bg-zinc-50 p-4 rounded-2xl md:col-span-2">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Emplacement</div>
                            <div className="text-sm font-bold">{s.location_detail}</div>
                          </div>
                        )}
                        {(s.corners || s.marking_method) && (
                          <div className="bg-zinc-50 p-4 rounded-2xl md:col-span-2">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Finition</div>
                            <div className="text-sm font-bold">
                              {[s.corners && `Coins: ${s.corners}`, s.marking_method && `Marquage: ${s.marking_method}`].filter(Boolean).join(' / ')}
                            </div>
                          </div>
                        )}
                        {stripSignageMeta(s.notes) && (
                          <div className="bg-zinc-50 p-4 rounded-2xl md:col-span-2">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Notes</div>
                            <div className="text-sm font-medium text-zinc-600">{stripSignageMeta(s.notes)}</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-6 pt-6 border-t border-zinc-50 flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="text-center">
                            <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Avant</div>
                            {s.image_data ? (
                              <img src={s.image_data} className="w-16 h-16 object-cover rounded-lg border border-black/5" />
                            ) : (
                              <div className="w-16 h-16 bg-zinc-50 rounded-lg border border-dashed border-black/10 flex items-center justify-center text-zinc-300">
                                <Camera size={16} />
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Apres</div>
                            {s.after_image_data ? (
                              <img src={s.after_image_data} className="w-16 h-16 object-cover rounded-lg border border-black/5" />
                            ) : (
                              <label className="w-16 h-16 bg-zinc-50 rounded-lg border border-dashed border-black/10 flex items-center justify-center text-zinc-300 cursor-pointer hover:bg-zinc-100 transition-all">
                                <Plus size={16} />
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleAfterPhoto(s.id, e)} />
                              </label>
                            )}
                          </div>
                        </div>
                        {s.after_image_data && (
                          <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                            <CheckCircle2 size={14} /> Installe
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                ) : (
                  <div className="mt-2 bg-zinc-50 border border-black/5 rounded-2xl p-3 md:p-4 overflow-x-auto">
                    <div className="min-w-max flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                      <div className="bg-white border border-black/5 rounded-xl px-3 py-2 font-semibold whitespace-nowrap">
                        <span className="text-zinc-400 mr-2 uppercase tracking-widest text-[9px]">Plaquette</span>
                        <span>{s.material || 'Standard Plachet'}</span>
                      </div>
                      <div className="bg-white border border-black/5 rounded-xl px-3 py-2 font-semibold whitespace-nowrap">
                        <span className="text-zinc-400 mr-2 uppercase tracking-widest text-[9px]">Pose</span>
                        <span>{MOUNT_TYPE_LABELS[s.mount_type] || s.mount_type || 'Standard Plachet'}</span>
                      </div>
                      <div className="bg-white border border-black/5 rounded-xl px-3 py-2 font-semibold whitespace-nowrap">
                        <span className="text-zinc-400 mr-2 uppercase tracking-widest text-[9px]">Emplacement</span>
                        <span>{s.location_detail || 'Emplacement repere et valide par Plachet'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Signage Modal */}
      {isAddingSignage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-12 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 md:mb-10">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase">{editingSignageId ? "Modifier l'Element technique" : "Ajouter un Element technique"}</h2>
              <button onClick={() => { setIsAddingSignage(false); setEditingSignageId(null); }} className="text-zinc-400 hover:text-black"><X size={24} /></button>
            </div>
            <div className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Categorie</label>
                  <select 
                    value={newSignage.category}
                    onChange={(e) => setNewSignage({...newSignage, category: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none appearance-none font-bold text-sm"
                  >
                    <option value="mailbox">Boite aux lettres</option>
                    <option value="intercom">Parlophone</option>
                    <option value="elevator">Ascenseur</option>
                    <option value="door">Porte / Appartement</option>
                    <option value="directory">Tableau indicateur</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Type de pose</label>
                  <select 
                    value={newSignage.mount_type}
                    onChange={(e) => setNewSignage({...newSignage, mount_type: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none appearance-none font-bold text-sm"
                  >
                    {materialConfig.mountTypes.map((mountType) => (
                      <option key={mountType} value={mountType}>{MOUNT_TYPE_LABELS[mountType] || mountType}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Matiere</label>
                  <select 
                    value={newSignage.material}
                    onChange={(e) => applyMaterialConfig(e.target.value)}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none appearance-none font-bold text-sm"
                  >
                    <option value="PVC">PVC</option>
                    <option value="alu">Alu</option>
                    <option value="plexi">Plexiglas</option>
                    <option value="dibond">Dibond</option>
                    <option value="imprime">Imprime</option>
                    <option value="dymo">Dymo</option>
                    <option value="laiton">Laiton</option>
                  </select>
                </div>
              </div>

              <div className="bg-zinc-50 border border-black/5 rounded-2xl p-4 md:p-6">
                <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Configuration matiere</div>
                <div className="text-sm font-bold mb-1">{materialConfig.label}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{materialConfig.helper}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Largeur (mm)</label>
                  <input 
                    type="number" 
                    value={newSignage.width}
                    onChange={(e) => setNewSignage({...newSignage, width: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Hauteur (mm)</label>
                  <input 
                    type="number" 
                    value={newSignage.height}
                    onChange={(e) => setNewSignage({...newSignage, height: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Epaisseur</label>
                  <select 
                    value={newSignage.thickness}
                    onChange={(e) => setNewSignage({...newSignage, thickness: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm appearance-none" 
                  >
                    <option value="">Selectionner...</option>
                    {materialConfig.thicknesses.map((thickness) => (
                      <option key={thickness} value={thickness}>{thickness}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Police / Typo</label>
                  <select 
                    value={newSignage.font}
                    onChange={(e) => setNewSignage({...newSignage, font: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm appearance-none" 
                  >
                    <option value="">Selectionner une police...</option>
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Taille Police (pt)</label>
                  <input 
                    type="number" 
                    value={newSignage.font_size}
                    onChange={(e) => setNewSignage({...newSignage, font_size: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Lignes max autorisees</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={newSignage.max_lines}
                    onChange={(e) => setNewSignage({ ...newSignage, max_lines: e.target.value })}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2 col-span-2 sm:col-span-4">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Format conseille (proche fournisseur)</label>
                  <select
                    value=""
                    onChange={(e) => {
                      const [width, height] = e.target.value.split('x');
                      if (!width || !height) return;
                      setNewSignage({ ...newSignage, width, height });
                    }}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm appearance-none"
                  >
                    <option value="">Selectionner un format recommande...</option>
                    {dimensionPresets.map((preset) => (
                      <option key={`${newSignage.category}-${preset.width}-${preset.height}`} value={`${preset.width}x${preset.height}`}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                {materialConfig.showShape && (
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Forme</label>
                    <select 
                      value={newSignage.shape}
                      onChange={(e) => setNewSignage({...newSignage, shape: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm appearance-none" 
                    >
                      <option value="">Selectionner...</option>
                      {materialConfig.shapes.map((shape) => (
                        <option key={shape} value={shape}>{shape}</option>
                      ))}
                    </select>
                  </div>
                )}
                {materialConfig.showCorners && (
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Coins</label>
                    <select 
                      value={newSignage.corners}
                      onChange={(e) => setNewSignage({...newSignage, corners: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm appearance-none" 
                    >
                      <option value="">Selectionner...</option>
                      {materialConfig.corners.map((corner) => (
                        <option key={corner} value={corner}>{corner}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Marquage</label>
                  <select 
                    value={newSignage.marking_method}
                    onChange={(e) => setNewSignage({...newSignage, marking_method: e.target.value})}
                    className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm appearance-none" 
                  >
                    <option value="">Selectionner...</option>
                    {materialConfig.markingMethods.map((markingMethod) => (
                      <option key={markingMethod} value={markingMethod}>{MARKING_METHOD_LABELS[markingMethod] || markingMethod}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-black text-white rounded-2xl p-4 md:p-6">
                <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3">Resume technique</div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-white/50">Matiere :</span> <span className="font-bold">{materialConfig.label}</span></div>
                  <div><span className="text-white/50">Pose :</span> <span className="font-bold">{MOUNT_TYPE_LABELS[newSignage.mount_type] || '-'}</span></div>
                  <div><span className="text-white/50">Epaisseur :</span> <span className="font-bold">{newSignage.thickness || '-'}</span></div>
                  <div><span className="text-white/50">Marquage :</span> <span className="font-bold">{MARKING_METHOD_LABELS[newSignage.marking_method] || '-'}</span></div>
                  <div><span className="text-white/50">Typo :</span> <span className="font-bold">{newSignage.font || '-'} {newSignage.font_size ? `(${newSignage.font_size}pt)` : ''}</span></div>
                  <div><span className="text-white/50">Format :</span> <span className="font-bold">{newSignage.width && newSignage.height ? `${newSignage.width} x ${newSignage.height} mm` : '-'}</span></div>
                  <div><span className="text-white/50">Lignes max :</span> <span className="font-bold">{newSignage.max_lines || '2'}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Couleur Fond</label>
                  <div className="flex gap-2 items-center">
                    <div 
                      className="w-12 h-12 rounded-xl border border-black/10 shrink-0" 
                      style={{ backgroundColor: getColorHex(newSignage.color_bg) }}
                    />
                    <input 
                      type="text" 
                      value={newSignage.color_bg}
                      onChange={(e) => setNewSignage({...newSignage, color_bg: e.target.value})}
                      placeholder="Ex: Noir, Or, #FFFFFF"
                      className="flex-1 bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PREDEFINED_COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => setNewSignage({...newSignage, color_bg: c.name})}
                        className="w-6 h-6 rounded-md border border-black/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Couleur Texte</label>
                  <div className="flex gap-2 items-center">
                    <div 
                      className="w-12 h-12 rounded-xl border border-black/10 shrink-0" 
                      style={{ backgroundColor: getColorHex(newSignage.color_text) }}
                    />
                    <input 
                      type="text" 
                      value={newSignage.color_text}
                      onChange={(e) => setNewSignage({...newSignage, color_text: e.target.value})}
                      placeholder="Ex: Blanc, Noir, #000000"
                      className="flex-1 bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PREDEFINED_COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => setNewSignage({...newSignage, color_text: c.name})}
                        className="w-6 h-6 rounded-md border border-black/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Localisation precise (Apt, Etage...)</label>
                <input 
                  type="text" 
                  value={newSignage.location_detail}
                  onChange={(e) => setNewSignage({...newSignage, location_detail: e.target.value})}
                  className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" 
                />
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Notes techniques</label>
                <textarea
                  value={newSignage.notes}
                  onChange={(e) => setNewSignage({...newSignage, notes: e.target.value})}
                  rows={3}
                  className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none resize-none text-sm"
                />
              </div>

              <button 
                onClick={handleAddSignage}
                disabled={isSavingSignage}
                className="w-full bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Save size={18} /> {isSavingSignage ? 'Enregistrement...' : 'Enregistrer l\'Element technique'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {isOrdering && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-[24px] md:rounded-[40px] p-6 md:p-12 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 md:mb-10">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Nouvelle Commande</h2>
              <button
                onClick={() => {
                  setIsOrdering(false);
                  setOrderRequesterQuality('owner');
                  setOwnerContact({ name: '', email: '' });
                  setOwnerReference('');
                  setSelectedOwnerId('');
                }}
                className="text-zinc-400 hover:text-black"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6 md:space-y-8">
              <p className="text-xs md:text-sm text-zinc-500">Selectionnez les elements a commander pour <strong className="text-black">{building.name}</strong>.</p>
              
              <div className="bg-zinc-50 p-6 rounded-2xl border border-black/5">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px]">1</span>
                  Numero de boite
                </h3>
                <p className="text-xs text-zinc-500 mb-6">Ces informations servent uniquement au suivi de la commande. Elles ne seront pas gravees.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numero de boite</label>
                    <input 
                      id="lot_number"
                      placeholder="Ex: Boite 42"
                      className="w-full bg-white border-none rounded-xl px-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-black outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom a remplacer</label>
                    <input 
                      id="name_to_replace"
                      placeholder="Ex: M. et Mme Plachet"
                      className="w-full bg-white border-none rounded-xl px-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-black outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Qualite du demandeur</label>
                    <select 
                      id="requester_quality"
                      value={orderRequesterQuality}
                      onChange={(e) => setOrderRequesterQuality(e.target.value as 'owner' | 'syndic')}
                      className="w-full bg-white border-none rounded-xl px-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-black outline-none appearance-none"
                    >
                      <option value="owner">Proprietaire</option>
                      <option value="syndic">Syndic</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-4">
                  <div className="space-y-1.5 md:space-y-2 sm:col-span-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Proprietaire lie a cette ACP</label>
                    <select
                      value={selectedOwnerId}
                      onChange={(e) => {
                        setSelectedOwnerId(e.target.value);
                        const selectedOwner = buildingOwners.find((owner) => String(owner.owner_id) === e.target.value);
                        if (!selectedOwner) return;
                        setOwnerContact({ name: selectedOwner.name, email: selectedOwner.email || '' });
                        setOwnerReference(selectedOwner.reference || '');
                      }}
                      className="w-full bg-white border-none rounded-xl px-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-black outline-none appearance-none"
                      disabled={isLoadingOwners}
                    >
                      <option value="">Selectionner un proprietaire enregistre...</option>
                      {buildingOwners.map((owner) => (
                        <option key={owner.owner_id} value={owner.owner_id}>
                          {owner.name} {owner.reference ? `(${owner.reference})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom du proprietaire</label>
                    <input
                      type="text"
                        value={ownerContact.name}
                        onChange={(e) => {
                          setSelectedOwnerId('');
                          setOwnerContact({ ...ownerContact, name: e.target.value });
                        }}
                      placeholder="Ex: M. et Mme Plachet"
                      className="w-full bg-white border-none rounded-xl px-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  {orderRequesterQuality === 'owner' && (
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email du proprietaire</label>
                      <input
                        type="email"
                        value={ownerContact.email}
                        onChange={(e) => {
                          setSelectedOwnerId('');
                          setOwnerContact({ ...ownerContact, email: e.target.value });
                        }}
                        placeholder="Ex: pl@chet.be"
                        className="w-full bg-white border-none rounded-xl px-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reference proprietaire</label>
                    <input
                      type="text"
                      value={ownerReference}
                      onChange={(e) => {
                        setSelectedOwnerId('');
                        setOwnerReference(e.target.value);
                      }}
                      placeholder="Ex: PLA-001"
                      className="w-full bg-white border-none rounded-xl px-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                </div>

                {buildingOwners.length > 0 && (
                  <div className="bg-white border border-black/5 rounded-xl p-4 mt-4">
                    <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Proprietaires enregistres</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {buildingOwners.map((savedOwner) => (
                        <div key={savedOwner.owner_id} className="flex items-center justify-between gap-2 bg-zinc-50 rounded-lg px-3 py-2 border border-black/5">
                          <button
                            type="button"
                            onClick={() => {
                              setOwnerContact({ name: savedOwner.name, email: savedOwner.email || '' });
                              setOwnerReference(savedOwner.reference || '');
                              setSelectedOwnerId(String(savedOwner.owner_id));
                            }}
                            className="text-left min-w-0 flex-1"
                          >
                            <div className="text-sm font-bold truncate">{savedOwner.name}</div>
                            <div className="text-xs text-zinc-500 truncate">
                              {savedOwner.email || 'Email non renseigne'} {savedOwner.reference ? `a Ref: ${savedOwner.reference}` : ''}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeOwnerFromBuilding(savedOwner.owner_id)}
                            className="shrink-0 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer ce proprietaire"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {orderRequesterQuality === 'syndic' && (
                  <div className="bg-white border border-black/5 rounded-xl p-4 mt-4">
                    <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Gestionnaire de la demande</div>
                    <div className="text-sm font-bold">{user.name || 'Non renseigne'}</div>
                    <div className="text-xs text-zinc-500">{user.email || 'Non renseigne'}</div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl border border-black/5">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px]">2</span>
                  Texte a graver
                </h3>
                <p className="text-xs text-zinc-500 mb-6">Indiquez ci-dessous le texte exact qui devra apparaitre sur les plaquettes.</p>
                
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom par defaut a graver (applique a la selection)</label>
                  <input 
                    id="global_engraving_name"
                    type="text"
                    placeholder="Ex: M. et Mme Plachet"
                    className="w-full bg-white border-none rounded-xl px-4 py-3 md:py-4 text-sm focus:ring-2 focus:ring-black outline-none font-bold"
                    onChange={(e) => {
                      const newName = e.target.value;
                      setOrderItems((items) =>
                        items.map((item) => {
                          const maxLines = clampMaxLinesForOrder(item.max_lines);
                          const editorLines = buildOrderEditorLines(item.text_lines, item.name || '', maxLines);
                          editorLines[0] = newName;
                          return { ...item, text_lines: editorLines, name: editorLines.map((line) => line.trim()).filter(Boolean).join(' / ') };
                        })
                      );
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Plaquettes a commander</label>
                {building.signage?.map((s: any) => {
                  const item = orderItems.find(i => i.signage_id === s.id);
                  const isSelected = !!item;
                  const globalName = (document.getElementById('global_engraving_name') as HTMLInputElement)?.value || '';
                  const maxLines = clampMaxLinesForOrder(extractSignageMetaFromNotes(s.notes).maxLines);
                  const editorLines = buildOrderEditorLines(item?.text_lines, item?.name || globalName, maxLines);
                  const previewLines = normalizeOrderLines(editorLines, item?.name || globalName).slice(0, maxLines);
                  const currentName = previewLines.join(' / ');
                  const hasTwoLineLayout = maxLines > 1;
                  const fontPt = parseFloat(String(s.font_size || '16'));
                  const fontPtValue = Number.isFinite(fontPt) ? fontPt : 16;
                  const fontMm = fontPtValue * getCalibratedPtToMm(s.font);
                  const lineHeight = fontMm * 1.15;
                  const estimatedTextWidth = previewLines.reduce((max, line) => Math.max(max, line.length * (fontMm * 0.6)), 0);
                  const estimatedTextHeight = Math.max(fontMm, Math.max(1, previewLines.length) * lineHeight);
                  
                  let textFits = true;
                  if (s.width && s.font_size && currentName) {
                    const widthNum = parseFloat(s.width);
                    if (!isNaN(widthNum)) {
                      const horizontalMarginMm = 3;
                      if (estimatedTextWidth > Math.max(6, widthNum - horizontalMarginMm)) {
                        textFits = false;
                      }
                    }
                  }

                  return (
                    <div key={s.id} className={`p-6 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-zinc-50 border-black' : 'bg-white border-black/5 hover:border-black/20'}`}
                         onClick={() => {
                           if (isSelected) {
                             setOrderItems(orderItems.filter(i => i.signage_id !== s.id));
                           } else {
                             const initialLines = maxLines > 1 ? [globalName || '', ''] : [globalName || ''];
                             setOrderItems([...orderItems, { 
                               signage_id: s.id, 
                               name: initialLines.map((line) => line.trim()).filter(Boolean).join(' / '),
                               text_lines: initialLines,
                               max_lines: maxLines,
                               quantity: 1, 
                               category: s.category, 
                               width: s.width, 
                               height: s.height,
                               material: s.material,
                               mount_type: s.mount_type,
                               marking_method: s.marking_method,
                               color_bg: s.color_bg,
                               color_text: s.color_text,
                               font: s.font,
                               font_size: s.font_size
                             }]);
                           }
                         }}>
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-black border-black text-white' : 'border-black/20'}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{s.category}</p>
                            {hasTwoLineLayout && (
                              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                                2+ lignes
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold">{s.location_detail || s.mount_type}</p>
                          {user.role === 'admin' && (
                            <p className="text-xs text-zinc-500 mt-1">{s.width}x{s.height}mm a {s.material}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Qte</label>
                            <input 
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => setOrderItems(orderItems.map(i => i.signage_id === s.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))}
                              className="w-16 bg-white border border-black/10 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-black text-center"
                            />
                          </div>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                          <div className="mb-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Texte a graver (lignes)</label>
                              <span className="text-[9px] text-zinc-500">{previewLines.length}/{maxLines}</span>
                            </div>
                            {Array.from({ length: Math.max(1, editorLines.length) }).map((_, lineIndex) => (
                              <div key={lineIndex} className="flex items-center gap-2">
                                <input 
                                  type="text"
                                  value={editorLines[lineIndex] || ''}
                                  onChange={(e) => {
                                    const nextLines = [...editorLines];
                                    nextLines[lineIndex] = e.target.value;
                                    setOrderItems(orderItems.map(i => i.signage_id === s.id ? { ...i, text_lines: nextLines, name: nextLines.map((line) => line.trim()).filter(Boolean).join(' / ') } : i));
                                  }}
                                  className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black"
                                />
                                {editorLines.length > (maxLines > 1 ? 2 : 1) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextLines = editorLines.filter((_, idx) => idx !== lineIndex);
                                      setOrderItems(orderItems.map(i => i.signage_id === s.id ? { ...i, text_lines: nextLines, name: nextLines.map((line) => line.trim()).filter(Boolean).join(' / ') } : i));
                                    }}
                                    className="p-2 rounded-lg border border-black/10 text-zinc-500 hover:text-red-500 hover:border-red-200 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                if (editorLines.length >= maxLines) return;
                                const nextLines = [...editorLines, ''];
                                setOrderItems(orderItems.map(i => i.signage_id === s.id ? { ...i, text_lines: nextLines, name: nextLines.map((line) => line.trim()).filter(Boolean).join(' / ') } : i));
                              }}
                              disabled={editorLines.length >= maxLines}
                              className={`w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                                editorLines.length >= maxLines
                                  ? 'border-zinc-200 text-zinc-300 cursor-not-allowed'
                                  : 'border-black/15 text-black hover:bg-zinc-50'
                              }`}
                            >
                              <Plus size={14} /> + Ligne
                            </button>
                          </div>
                          
                          {currentName && (
                            <>
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex flex-col sm:flex-row justify-between gap-1">
                                <span>Texte: {currentName || '-'}</span>
                                <span>Typo: {fontPtValue} pt</span>
                                <span>Taille estimee: {Math.round(estimatedTextWidth)} x {Math.round(estimatedTextHeight)} mm</span>
                              </div>
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex flex-col sm:flex-row justify-between gap-1">
                                <span>Apercu visuel</span>
                                {!textFits && <span className="text-amber-500 flex items-center gap-1"><AlertCircle size={10} /> Le texte risque d&apos;etre trop long (tolerance 3mm)</span>}
                              </div>
                              <div className="w-full flex justify-center bg-zinc-100/50 p-4 rounded-lg border border-black/5">
                                <div 
                                  className="flex items-center justify-center overflow-hidden relative shadow-sm w-full"
                                  style={{ 
                                    maxWidth: s.width ? `${Math.max(300, s.width * 2)}px` : '300px',
                                  }}
                                >
                                  <svg 
                                    viewBox={`0 0 ${s.width || 300} ${s.height || 60}`} 
                                    className="w-full h-auto drop-shadow-sm" 
                                    style={{ backgroundColor: getColorHex(s.color_bg) || '#ffffff', borderRadius: '4px' }}
                                  >
                                    <text 
                                      x="50%" 
                                      y={`${(s.height || 60) / 2 - ((previewLines.length - 1) * lineHeight) / 2}`}
                                      dominantBaseline="middle" 
                                      textAnchor="middle" 
                                      fill={getColorHex(s.color_text) || '#000000'} 
                                      fontFamily={s.font || 'sans-serif'} 
                                      fontSize={fontMm}
                                      fontWeight="bold"
                                    >
                                      {previewLines.map((line, idx) => (
                                        <tspan key={idx} x="50%" dy={idx === 0 ? 0 : lineHeight}>{line}</tspan>
                                      ))}
                                    </text>
                                  </svg>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={async () => {
                  if (isSubmittingOrder) return;
                  try {
                    setIsSubmittingOrder(true);
                    const lotNumber = (document.getElementById('lot_number') as HTMLInputElement)?.value;
                    const nameToReplace = (document.getElementById('name_to_replace') as HTMLInputElement)?.value;
                    const globalName = (document.getElementById('global_engraving_name') as HTMLInputElement)?.value;
                    
                    if (!lotNumber) return alert('Veuillez renseigner le numero de boite.');
                    if (!ownerContact.name.trim()) return alert('Veuillez renseigner le nom du proprietaire.');
                    if (orderItems.length === 0) return alert('Veuillez selectionner au moins une plaquette.');

                    const finalItems = orderItems.map((item) => {
                      const maxLines = clampMaxLinesForOrder(item.max_lines);
                      const lines = normalizeOrderLines(item.text_lines, item.name || globalName || ownerContact.name.trim()).slice(0, maxLines);
                      return {
                        ...item,
                        max_lines: maxLines,
                        text_lines: lines,
                        name: lines.join(' / ')
                      };
                    });
                    const hasMissingItemName = finalItems.some((item) => !Array.isArray(item.text_lines) || item.text_lines.length === 0);
                    if (hasMissingItemName) {
                      return alert('Veuillez renseigner au moins une ligne de texte pour chaque plaquette selectionnee.');
                    }
                    const finalOwnerReference = ownerReference.trim() || buildFallbackOwnerReference();
                    const payloadRequesterName = orderRequesterQuality === 'owner' ? ownerContact.name.trim() : (user.name || '');
                    const payloadRequesterEmail = orderRequesterQuality === 'owner'
                      ? ownerContact.email.trim()
                      : (user.email || '');

                    const orderRes = await fetch('/api/orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        building_id: building.id,
                        requester_name: payloadRequesterName,
                        requester_email: payloadRequesterEmail,
                        requester_quality: orderRequesterQuality,
                        owner_name: ownerContact.name.trim(),
                        owner_email: ownerContact.email.trim() || null,
                        owner_reference: finalOwnerReference,
                        lot_number: lotNumber,
                        name_to_replace: nameToReplace,
                        details: finalItems,
                        isAdminAction: user.role === 'admin'
                      })
                    });

                    const orderData = await orderRes.json().catch(() => ({}));
                    if (!orderRes.ok) {
                      throw new Error(orderData.error || "Impossible d'envoyer la commande.");
                    }

                    void saveOwnerForBuilding(ownerContact.name, ownerContact.email, finalOwnerReference).catch((saveError) => {
                      console.warn("Owner save skipped:", saveError);
                    });

                    alert('Commande envoyee avec succes s !');
                    setIsOrdering(false);
                    setOrderItems([]);
                    setOrderRequesterQuality('owner');
                    setOwnerContact({ name: '', email: '' });
                    setOwnerReference('');
                    setSelectedOwnerId('');
                    onRefresh();
                  } catch (error: any) {
                    alert(error.message || "Impossible d'envoyer la commande.");
                  } finally {
                    setIsSubmittingOrder(false);
                  }
                }}
                disabled={isSubmittingOrder}
                className="w-full bg-emerald-600 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingOrder
                  ? 'Envoi en cours...'
                  : `Confirmer la commande (${orderItems.length} article${orderItems.length > 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AdminDashboard };
