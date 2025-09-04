"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <header
      className="
        relative isolate min-h-[75svh] flex items-center overflow-hidden bg-white
      "
    >
      {/* Un SEUL dégradé gris, discret, centré sur la zone du titre */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-0 -z-10
          bg-[linear-gradient(180deg,white_0%,white_16%,#f6f7f9_32%,#eceef1_50%,#f6f7f9_68%,white_84%,white_100%)]
        "
      />

      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-10 md:gap-14 lg:gap-20">
          {/* Gauche : titre (un peu plus petit, pas collé au bord) */}
          <div className="md:col-span-6 flex items-center justify-center md:justify-start md:pl-6 lg:pl-10">
            <motion.h1
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="
                leading-[0.9] tracking-tight font-extrabold
                text-[clamp(64px,8.9vw,116px)]
                bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-700
              "
            >
              PLACHET
            </motion.h1>
          </div>

          {/* Droite : message général marketing */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="md:col-span-6 md:pl-6 lg:pl-10"
          >
            <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900">
              Des supports prêts à l’emploi pour vos besoins de communication.
            </h2>

            <p className="mt-2 text-neutral-700 leading-relaxed max-w-[64ch]">
              Chez <strong>PLACHET</strong>, on va à l’essentiel&nbsp;: une commande simple,
              un suivi clair et une expérience fluide du premier clic jusqu’à la réception.
              Vous vous concentrez sur votre activité, on s’occupe du reste.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-neutral-700">
              <Feature>Commande intuitive et récap immédiat</Feature>
              <Feature>Traitement rapide dans les 24&nbsp;heures</Feature>
              <Feature>Livraison partout en Belgique</Feature>
            </ul>

            {/* Badge déplacé sous la liste */}
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
