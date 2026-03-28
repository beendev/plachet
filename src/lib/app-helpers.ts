export const PREDEFINED_COLORS = [
  { name: 'Noir', hex: '#000000' },
  { name: 'Blanc', hex: '#FFFFFF' },
  { name: 'Or', hex: '#FFD700' },
  { name: 'Argent', hex: '#C0C0C0' },
  { name: 'Laiton', hex: '#B5A642' },
  { name: 'Alu', hex: '#A9A9A9' },
  { name: 'Rouge', hex: '#FF0000' },
  { name: 'Bleu', hex: '#0000FF' },
  { name: 'Vert', hex: '#008000' }
];

export const FRENCH_COLORS: Record<string, string> = {
  noir: '#000000',
  blanc: '#ffffff',
  or: '#ffd700',
  argent: '#c0c0c0',
  laiton: '#b5a642',
  alu: '#a9a9a9',
  rouge: '#ff0000',
  bleu: '#0000ff',
  vert: '#008000',
  jaune: '#ffff00',
  orange: '#ffa500',
  violet: '#800080',
  rose: '#ffc0cb',
  gris: '#808080',
  marron: '#a52a2a',
  brun: '#a52a2a',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  transparent: 'transparent'
};

export const getColorHex = (colorName: string) => {
  if (!colorName) return '#ffffff';
  if (colorName.startsWith('#')) return colorName;
  const lowerName = colorName.toLowerCase().trim();
  if (FRENCH_COLORS[lowerName]) return FRENCH_COLORS[lowerName];
  const found = PREDEFINED_COLORS.find((c) => c.name.toLowerCase() === lowerName);
  return found ? found.hex : colorName;
};

export const buildFullName = (firstName?: string, lastName?: string, fallback = '') => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || fallback;
};

export const isActiveFlag = (value: unknown) => value === true || value === 1 || value === '1';

export const getDisplayName = (entity: any) =>
  buildFullName(entity?.first_name, entity?.last_name, entity?.name || entity?.email || 'Compte');

export const normalizeSearchText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const OWNER_VALIDATION_PENDING_STATUSES = ['validation_proprietaire', 'en_attente_validation'];

export const parseOrderDetails = (raw: unknown) => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return { items: parsed, meta: {} as Record<string, any> };
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).items)) {
      return { items: (parsed as any).items, meta: ((parsed as any).meta || {}) as Record<string, any> };
    }
  } catch (error) {
    return { items: [], meta: {} as Record<string, any>, rawText: String(raw || '') };
  }

  return { items: [], meta: {} as Record<string, any>, rawText: typeof raw === 'string' ? raw : '' };
};

const SIGNAGE_META_PREFIX = '__plachet_meta__:';

export const extractSignageMetaFromNotes = (notes: unknown) => {
  const source = String(notes || '').trim();
  if (!source.startsWith(SIGNAGE_META_PREFIX)) {
    return { cleanNotes: source, maxLines: 2 };
  }

  const firstBreak = source.indexOf('\n');
  const metaRaw = (firstBreak === -1 ? source.slice(SIGNAGE_META_PREFIX.length) : source.slice(SIGNAGE_META_PREFIX.length, firstBreak)).trim();
  const remaining = firstBreak === -1 ? '' : source.slice(firstBreak + 1).trim();

  try {
    const parsed = JSON.parse(metaRaw);
    const maxLines = Math.max(1, Math.min(8, Number(parsed?.max_lines || 2)));
    return { cleanNotes: remaining, maxLines: Number.isFinite(maxLines) ? maxLines : 2 };
  } catch (_error) {
    return { cleanNotes: remaining || source, maxLines: 2 };
  }
};

export const injectSignageMetaInNotes = (notes: unknown, maxLines: unknown) => {
  const safeMaxLines = Math.max(1, Math.min(8, Number(maxLines || 2)));
  const clean = String(notes || '').trim();
  const meta = `${SIGNAGE_META_PREFIX}${JSON.stringify({ max_lines: safeMaxLines })}`;
  return clean ? `${meta}\n${clean}` : meta;
};

export const getOrderItemLines = (item: any) => {
  const explicitLines = Array.isArray(item?.text_lines)
    ? item.text_lines.map((line: unknown) => String(line || '').trim()).filter(Boolean)
    : [];
  if (explicitLines.length > 0) return explicitLines;

  const fallback = String(item?.name || '').trim();
  return fallback ? [fallback] : [];
};

export const getOrderStatusLabel = (status: string) => {
  switch (status) {
    case 'validation_proprietaire':
    case 'en_attente_validation':
      return 'Validation proprietaire';
    case 'reçue':
      return 'Recue';
    case 'en_traitement':
      return 'En traitement';
    case 'in_production':
      return 'En production';
    case 'en_pose':
      return 'En pose';
    case 'posée':
      return 'Posee';
    case 'facturée':
      return 'Facturee';
    case 'annulée':
      return 'Annulee';
    default:
      return status || 'Statut inconnu';
  }
};

export const getOrderStatusClass = (status: string) => {
  switch (status) {
    case 'validation_proprietaire':
    case 'en_attente_validation':
      return 'bg-red-100 text-red-700';
    case 'in_production':
      return 'bg-indigo-100 text-indigo-700';
    case 'en_pose':
      return 'bg-blue-100 text-blue-700';
    case 'posée':
      return 'bg-emerald-100 text-emerald-700';
    case 'facturée':
      return 'bg-emerald-100 text-emerald-700';
    case 'annulée':
      return 'bg-zinc-200 text-zinc-600';
    default:
      return 'bg-amber-100 text-amber-700';
  }
};

export const getRequesterQualityLabel = (quality: string) => {
  switch (quality) {
    case 'tenant':
      return 'Locataire';
    case 'owner':
      return 'Proprietaire';
    case 'syndic':
      return 'Syndic';
    default:
      return quality || 'Demandeur';
  }
};

export const getBuildingStatusLabel = (status: string) => {
  switch (status) {
    case 'pending_survey':
      return 'A mesurer';
    case 'survey_completed':
      return 'Mesure';
    case 'in_production':
      return 'En production';
    case 'installed':
      return 'Place';
    default:
      return status || 'Statut inconnu';
  }
};

export const getBuildingStatusClass = (status: string) => {
  switch (status) {
    case 'pending_survey':
      return 'bg-amber-100 text-amber-700';
    case 'survey_completed':
      return 'bg-blue-100 text-blue-700';
    case 'in_production':
      return 'bg-emerald-100 text-emerald-700';
    case 'installed':
      return 'bg-zinc-100 text-zinc-700';
    default:
      return 'bg-zinc-100 text-zinc-700';
  }
};

export const getNotificationCategory = (notification: any) => {
  if (notification.type === 'order') return 'commandes';
  if (
    notification.title === 'Mesurage effectué' ||
    notification.title === 'Commande en production' ||
    notification.title === 'Plaques installées'
  ) {
    return 'immeubles';
  }
  if (notification.type === 'welcome') return 'comptes';
  if (notification.type === 'contact') return 'contacts';
  return 'autres';
};

export const getNotificationCategoryLabel = (category: string) => {
  switch (category) {
    case 'commandes':
      return 'Commandes';
    case 'immeubles':
      return 'Immeubles';
    case 'comptes':
      return 'Comptes';
    case 'contacts':
      return 'Contacts';
    default:
      return 'Autres';
  }
};

export const ENABLE_NEW_SYNDIC_DASHBOARD = true;

export const getDashboardHook = () => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  const morningHooks = [
    "Bonjour. Quels immeubles doivent avancer aujourd'hui ?",
    'Bonne matinee. Quelles commandes devons-nous lancer ce matin ?',
    'Pret a envoyer un lien ACP ou a lancer une nouvelle commande ?',
    "Content de vous revoir. Que traitons-nous en priorite aujourd'hui ?",
  ];

  const afternoonHooks = [
    'Bon apres-midi. Ou en sommes-nous sur vos immeubles et vos commandes ?',
    'Un point rapide sur vos ACP, vos liens envoyes et vos demandes en cours.',
    'Quelles commandes restent a suivre cet apres-midi ?',
    "Il y a de l'avancement dans vos demandes. Que souhaitez-vous verifier maintenant ?",
  ];

  const eveningHooks = [
    "Bonsoir. Voici l'essentiel de vos immeubles et commandes du jour.",
    'Terminons la journee avec une vue claire sur vos ACP en cours.',
    'Un dernier point sur les liens envoyes et les commandes a suivre.',
    "Doit-on relancer Plachet sur un dossier en cours ?",
  ];

  const fridayHooks = [
    'Bon vendredi. Quels dossiers doivent encore etre lances avant la fin de semaine ?',
    'Fin de semaine : que reste-t-il a envoyer, commander ou valider ?',
  ];

  const mondayHooks = [
    'Bon debut de semaine. Quels immeubles mettons-nous en route aujourd\'hui ?',
    'Lundi : on relance vos ACP, vos commandes et vos priorites.',
  ];

  const sundayHooks = [
    'Bon dimanche. Un coup d\'oeil rapide sur vos ACP et commandes en attente.',
  ];

  if (day === 1) return mondayHooks[hour % mondayHooks.length];
  if (day === 5) return fridayHooks[hour % fridayHooks.length];
  if (day === 0) return sundayHooks[0];
  if (hour < 12) return morningHooks[day % morningHooks.length];
  if (hour < 18) return afternoonHooks[day % afternoonHooks.length];
  return eveningHooks[day % eveningHooks.length];
};
