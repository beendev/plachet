import React from 'react';

type Building = { id: number; name: string; address?: string };

export const BuildingAccessPicker = ({
  buildings,
  selectedIds,
  hasFullAccess,
  onToggleFullAccess,
  onToggleBuilding,
  emptyLabel = "Aucun immeuble disponible."
}: {
  buildings: Building[];
  selectedIds: number[];
  hasFullAccess: boolean;
  onToggleFullAccess: (next: boolean) => void;
  onToggleBuilding: (buildingId: number, next: boolean) => void;
  emptyLabel?: string;
}) => (
  <div className="bg-zinc-50 rounded-[24px] border border-black/5 p-5 md:p-6 space-y-4">
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={hasFullAccess}
        onChange={(e) => onToggleFullAccess(e.target.checked)}
        className="mt-1 w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
      />
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-700">Accès à tous les immeubles</div>
        <p className="text-xs text-zinc-500 mt-1">Cochez pour donner l'accès complet. Sinon, sélectionnez les immeubles un par un.</p>
      </div>
    </label>

    {!hasFullAccess && (
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Immeubles accessibles</div>
        <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
          {buildings.map((building) => {
            const checked = selectedIds.includes(building.id);
            return (
              <label key={building.id} className="flex items-center gap-3 bg-white border border-black/5 rounded-2xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onToggleBuilding(building.id, e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{building.name}</div>
                  <div className="text-xs text-zinc-500 truncate">{building.address}</div>
                </div>
              </label>
            );
          })}
          {buildings.length === 0 && (
            <div className="text-xs text-zinc-500 bg-white border border-dashed border-black/10 rounded-2xl px-4 py-4">
              {emptyLabel}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);
