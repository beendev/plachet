"use client";

import { useEffect, useState } from "react";
import ProductSelector from "@/components/ProductSelector";
import PlaquetteConfigurator from "@/components/PlaquetteConfigurator";

type Tab = "panneaux" | "plaquettes";

export default function CatalogSwitcher() {
  const [tab, setTab] = useState<Tab>("panneaux");

  // Init depuis l'ancre d'URL (#plaquettes / #panneaux)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hash.replace("#", "");
    if (h === "plaquettes" || h === "panneaux") setTab(h as Tab);
  }, []);

  function switchTab(next: Tab) {
    setTab(next);
    if (typeof window !== "undefined") {
      const hash = next === "plaquettes" ? "#plaquettes" : "#panneaux";
      history.replaceState(null, "", hash);
    }
  }

  return (
    <div>
      {/* Tabs minimalistes */}
      <div className="flex items-center gap-6 text-lg">
        <TabButton active={tab === "panneaux"} onClick={() => switchTab("panneaux")}>
          Panneaux
        </TabButton>
        <TabButton active={tab === "plaquettes"} onClick={() => switchTab("plaquettes")}>
          Plaquettes
        </TabButton>
      </div>

      <div className="mt-6">
        {tab === "panneaux" ? <ProductSelector /> : <PlaquetteConfigurator />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`relative pb-1 transition-colors ${
        active ? "text-black" : "text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
      <span
        className={`absolute left-0 -bottom-[2px] h-[2px] w-full ${
          active ? "bg-black" : "bg-transparent"
        }`}
      />
    </button>
  );
}
