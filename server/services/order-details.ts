export const parseOrderDetailsPayload = (raw: unknown) => {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return { items: parsed, meta: {} as Record<string, unknown> };
    }
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).items)) {
      return {
        items: (parsed as any).items,
        meta: ((parsed as any).meta || {}) as Record<string, unknown>,
      };
    }
  } catch (_error) {
    return { items: [], meta: {} as Record<string, unknown> };
  }

  return { items: [], meta: {} as Record<string, unknown> };
};

export const serializeOrderDetailsPayload = (details: unknown, meta: Record<string, unknown> = {}) => {
  const parsed = parseOrderDetailsPayload(details);
  if (Object.keys(meta).length === 0) {
    if (Array.isArray(details)) return JSON.stringify(details);
    if (typeof details === "string") return details;
    return JSON.stringify(parsed.items);
  }

  const items = Array.isArray(details) ? details : parsed.items;
  return JSON.stringify({ items, meta });
};
