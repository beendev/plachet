const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getPublicAppBaseUrl = () => {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }
  return '';
};

export const buildPublicOrderUrl = (token: unknown) => {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return '';
  const baseUrl = getPublicAppBaseUrl();
  return baseUrl ? `${baseUrl}/order/${cleanToken}` : `/order/${cleanToken}`;
};

export const getNominatimSearchUrl = () => {
  return String(import.meta.env.VITE_NOMINATIM_SEARCH_URL || 'https://nominatim.openstreetmap.org/search').trim();
};
