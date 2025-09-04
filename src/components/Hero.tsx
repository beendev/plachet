"use client";

import { motion } from "framer-motion";
import { Great_Vibes } from "next/font/google";

const script = Great_Vibes({ subsets: ["latin"], weight: "400" });

export default function Hero() {
  return (
    <header className="relative isolate min-h-[85svh] md:min-h-[75svh] flex items-center overflow-hidden bg-white">
      {/* Dégradé linéaire discret — pleine largeur, centré (recouvre les deux colonnes) */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-0 -z-10
          bg-[linear-gradient(90deg,white_0%,#f6f7f9_20%,#eceff1_50%,#f6f7f9_80%,white_100%)]
        "
      />
      {/* transition douce avec la section suivante */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-white"
      />

      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-10 md:gap-14 lg:gap-20">
          {/* Gauche : logo + slogan (très visibles sur mobile) */}
          <div className="md:col-span-6  flex flex-col items-center md:items-start md:pl-6 lg:pl-10">
            <motion.h1
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`${script.className}
                leading-[0.86] tracking-tight text-neutral-900 
                text-[clamp(56px,18vw,220px)]
              `}
            >
              Plachet
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="
                mt-3 text-center md:text-left
                text-[clamp(18px,5vw,30px)]
                text-neutral-700
              "
            >
              Vos Plaques et vos chachets
            </motion.p>
          </div>

          {/* Droite : texte marketing avec plus d'air en haut sur mobile */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="md:col-span-6 md:pl-6 lg:pl-10"
          >
            <h2
              className="
                mt-8 md:mt-0
                mb-4 sm:mb-5
                text-xl sm:text-2xl md:text-3xl font-semibold text-neutral-900
              "
            >
              Des supports prêts à l’emploi pour vos besoins de communication.
            </h2>

            <p className="text-neutral-700 leading-relaxed max-w-[64ch]">
              Chez <strong>PLACHET</strong>, on va à l’essentiel&nbsp;: une commande simple,
              un suivi clair et une expérience fluide du premier clic jusqu’à la réception.
              Vous vous concentrez sur votre activité, on s’occupe du reste.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-neutral-700">
              <Feature>Commande intuitive et récap immédiat</Feature>
              <Feature>Traitement rapide dans les 24&nbsp;heures</Feature>
              <Feature>Livraison partout en Belgique</Feature>
            </ul>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 backdrop-blur px-3 py-1.5 text-xs text-neutral-700 shadow-sm">
              <span>✓</span> Prise en charge 24&nbsp;h • Livraison BE 4,99€
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" className="mt-0.5 flex-none">
        <path
          d="M20 6L9 17l-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-600"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}
