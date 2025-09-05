// app/…/CatalogSwitcher.tsx
"use client";

import { useState } from "react";
import ProductSelector from "@/components/ProductSelector";
import PlaquetteConfigurator from "@/components/PlaquetteConfigurator";
import PanneauDescription from "@/components/PanneauDescription";
import PlaquetteDescription from "@/components/PlaquetteDescription";

export default function CatalogSwitcher() {
  const [tab, setTab] = useState<"panneaux" | "plaquettes">("panneaux");

  return (
    <div>
      <div className="flex items-center gap-6 text-lg">
        <TabButton active={tab==="panneaux"} onClick={() => setTab("panneaux")}>Panneaux</TabButton>
        <TabButton active={tab==="plaquettes"} onClick={() => setTab("plaquettes")}>Plaquettes</TabButton>
      </div>

      <div className="mt-6 space-y-10">
        {tab === "panneaux" ? (
          <>
            <ProductSelector />
            <PanneauDescription />   {/* ⬅️ description ré-affichée */}
          </>
        ) : (
          <>
            <PlaquetteConfigurator />
            <PlaquetteDescription /> {/* ⬅️ description sous la config */}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative pb-1 transition-colors ${active ? "text-black" : "text-gray-500 hover:text-gray-800"}`}
    >
      {children}
      <span className={`absolute left-0 -bottom-[2px] h-[2px] w-full ${active ? "bg-black" : "bg-transparent"}`} />
    </button>
  );
}
