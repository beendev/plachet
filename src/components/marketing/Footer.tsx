export const Footer = ({ onPortalClick }: { onPortalClick: () => void }) => (
  <footer className="bg-white border-t border-black/5 py-10 md:py-16">
    <div className="max-w-7xl mx-auto px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12 text-center md:text-left">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight uppercase">Plachet</span>
          </div>
          <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Vos plaques et vos cachets</span>
        </div>

        <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 order-3 md:order-2">
          (c) {new Date().getFullYear()} Plachet Bruxelles - Expertise Signaletique
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-[9px] md:text-[10px] font-bold uppercase tracking-widest order-2 md:order-3">
          <button onClick={onPortalClick} className="hover:text-emerald-600 transition-colors">Acces Syndic</button>
          <a href="/mentions-legales" className="hover:text-emerald-600 transition-colors">Mentions legales</a>
          <a href="/confidentialite" className="hover:text-emerald-600 transition-colors">Confidentialite</a>
        </div>
      </div>
    </div>
  </footer>
);

