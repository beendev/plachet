import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, ExternalLink, Building2, Package } from 'lucide-react';

export interface RouteBuilding {
  name: string;
  address: string;
  orderCount: number;
}

interface RouteMapProps {
  buildings: RouteBuilding[];
}

const GOOGLE_MAPS_WAYPOINT_LIMIT = 10;

function buildGoogleMapsUrl(
  addresses: string[],
  userPosition?: { lat: number; lng: number } | null,
): string[] {
  if (addresses.length === 0) return [];

  const origin = userPosition
    ? `${userPosition.lat},${userPosition.lng}`
    : 'My+Location';

  // Split addresses into chunks respecting the waypoint limit
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += GOOGLE_MAPS_WAYPOINT_LIMIT) {
    chunks.push(addresses.slice(i, i + GOOGLE_MAPS_WAYPOINT_LIMIT));
  }

  return chunks.map((chunk) => {
    const destination = encodeURIComponent(chunk[chunk.length - 1]);
    const waypoints = chunk.length > 1
      ? chunk.slice(0, -1).map((a) => encodeURIComponent(a)).join('|')
      : '';

    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${destination}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    return url;
  });
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const RouteMap: React.FC<RouteMapProps> = ({ buildings }) => {
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoadingGeo(false);
      setGeoError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingGeo(false);
      },
      () => {
        setGeoError(true);
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Sort buildings: alphabetically (we don't have geocoded building coords to sort by proximity)
  const sorted = React.useMemo(
    () => [...buildings].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [buildings],
  );

  const totalOrders = React.useMemo(
    () => buildings.reduce((s, b) => s + b.orderCount, 0),
    [buildings],
  );

  const addresses = sorted.map((b) => b.address).filter(Boolean);
  const mapsUrls = buildGoogleMapsUrl(addresses, userPosition);

  if (buildings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Navigation size={32} className="text-zinc-300" />
        </div>
        <h2 className="text-lg font-bold mb-2">Aucun itineraire</h2>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
          Aucun immeuble a visiter pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex gap-3">
        <div className="flex-1 bg-white rounded-2xl border border-black/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Building2 size={16} className="text-zinc-400" />
            <span className="text-2xl font-bold">{buildings.length}</span>
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            Immeubles
          </div>
        </div>
        <div className="flex-1 bg-white rounded-2xl border border-black/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Package size={16} className="text-zinc-400" />
            <span className="text-2xl font-bold">{totalOrders}</span>
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            Commandes
          </div>
        </div>
      </div>

      {/* Geolocation status */}
      {loadingGeo && (
        <div className="bg-zinc-50 rounded-2xl border border-black/5 px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-xs text-zinc-500">Localisation en cours...</span>
        </div>
      )}
      {!loadingGeo && geoError && (
        <div className="bg-zinc-50 rounded-2xl border border-black/5 px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-zinc-300 rounded-full" />
          <span className="text-xs text-zinc-400">
            Position non disponible — l'itineraire partira de votre position Google Maps
          </span>
        </div>
      )}
      {!loadingGeo && userPosition && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          <span className="text-xs text-emerald-700">Position detectee</span>
        </div>
      )}

      {/* Building list */}
      <div className="space-y-2">
        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">
          Etapes de l'itineraire
        </div>
        {sorted.map((b, idx) => (
          <div
            key={`${b.name}-${idx}`}
            className="bg-white rounded-2xl border border-black/5 p-4 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{b.name}</div>
              <div className="text-[10px] text-zinc-400 truncate">{b.address || 'Adresse inconnue'}</div>
            </div>
            <div className="text-[10px] text-zinc-500 bg-zinc-50 px-2 py-1 rounded-lg border border-black/5 shrink-0">
              {b.orderCount} cmd{b.orderCount !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Open itinerary button(s) */}
      <div className="space-y-2 pt-2">
        {mapsUrls.map((url, idx) => (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full bg-black text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition-transform"
          >
            <Navigation size={18} />
            {mapsUrls.length > 1
              ? `Ouvrir l'itineraire (${idx + 1}/${mapsUrls.length})`
              : "Ouvrir l'itineraire"}
            <ExternalLink size={14} />
          </a>
        ))}
        {mapsUrls.length > 1 && (
          <p className="text-[10px] text-zinc-400 text-center px-4">
            L'itineraire est divise en {mapsUrls.length} parties en raison de la limite Google Maps.
          </p>
        )}
      </div>
    </div>
  );
};
