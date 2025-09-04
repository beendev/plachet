"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <header
      className="relative isolate min-h-[50vh] flex items-center overflow-hidden"
    >
      {/* Gradient moderne */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_-10%_-20%,#8b5cf6_0%,transparent_60%)),linear-gradient(180deg,#ffffff,rgba(255,255,255,0.85))]" />
      </div>

      <div className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Colonne gauche : titre géant centré */}
          <div className="flex items-center justify-center md:justify-center">
            <motion.h1
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="leading-none tracking-tight font-semibold text-center
                         text-[clamp(56px,12vw,140px)]"
            >
              PLACHET
            </motion.h1>
          </div>

          {/* Colonne droite : texte marketing, avec espace clair */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
            className="relative z-10 md:pl-6"
          >
            <h2 className="text-2xl md:text-3xl font-semibold">
              Commandez vos panneaux ou plaquettes
            </h2>
            <p className="mt-3 text-gray-800 max-w-xl">plaquettes nominatives PLACHET assorties pour vos interphones et boîtes aux lettres.
            </p>
          </motion.div>
        </div>
      </div>
    </header>
  );
}