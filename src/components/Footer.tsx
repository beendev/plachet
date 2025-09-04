// components/Footer.tsx
"use client";

import { Great_Vibes } from "next/font/google";
const script = Great_Vibes({ subsets: ["latin"], weight: "400" });

export default function Footer() {
  return (
    <footer className="mt-16 bg-gradient-to-b border-t from-white to-neutral-50 relative">
      {/* ligne subtile en haut du footer */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-300/40 to-transparent" />

      {/* Contenu principal */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Gauche : marque + slogan */}
        <div className="space-y-2 text-center md:text-left">
          <p className={`${script.className} text-[clamp(28px,5vw,44px)] leading-none text-neutral-900`}>
            Plachet
          </p>
          <p className="text-sm text-neutral-600">Vos Plaques et vos chachets</p>
        </div>

        {/* Droite : coordonnées avec icônes */}
        <div className="text-sm text-neutral-800 text-center md:text-right space-y-2">
          <Item icon={<MapPinIcon className="h-4 w-4" />}>
            Avenue des Saisons 114 — 1050 Bruxelles
          </Item>
          <Item icon={<LandmarkIcon className="h-4 w-4" />}>
            TVA&nbsp;: <span className="font-medium">BE 0664.465.341</span>
          </Item>
          <Item icon={<MailIcon className="h-4 w-4" />}>
            <a className="underline underline-offset-2 hover:text-neutral-900" href="mailto:info@plachet.be">
              info@plachet.be
            </a>
          </Item>
        </div>
      </div>

      {/* Barre légale du bas — centrée */}
      <div className="">
        <div className="max-w-6xl mx-auto px-6 py-5 text-center text-xs sm:text-sm text-neutral-600">
          <p>
            © 2025 Copyright:{" "}
            <a
              href="https://bendev.be"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 font-semibold hover:text-neutral-800"
            >
              BenDev
            </a>
          </p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/* --- petits helpers --- */
function Item({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="inline-flex md:flex items-center gap-2 justify-center md:justify-end">
      <span className="text-neutral-500">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

/* --- Icônes inline (pas de lib externe nécessaire) --- */
function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M12 22s-7-7.5-7-12.2A7 7 0 1 1 19 9.8C19 14.5 12 22 12 22Z"
        fill="currentColor"
        opacity="0.22"
      />
      <circle cx="12" cy="9.5" r="2.5" fill="currentColor" />
    </svg>
  );
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LandmarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M4 9h16M6 9v9m4-9v9m4-9v9m4-9v9M3 20h18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 4l8 3H4l8-3Z" fill="currentColor" opacity="0.15" />
      <path d="M12 4l8 3H4l8-3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
