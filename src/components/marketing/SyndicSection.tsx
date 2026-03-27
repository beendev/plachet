import { ArrowRight, Building2, CheckCircle2 } from 'lucide-react';

export const SyndicSection = ({ onRegisterClick }: { onRegisterClick: () => void }) => (
  <section id="syndic" className="py-16 md:py-32 bg-[#0a0a0a] text-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <Building2 className="text-emerald-400" size={20} />
          <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-emerald-400">Solutions pour Syndics</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 md:mb-10">
          Déléguez votre signalétique en toute sérénité.
        </h2>
        <p className="text-zinc-400 text-base md:text-lg mb-10 md:mb-12 leading-relaxed">
          Nous comprenons les enjeux de la gestion de copropriété. Notre système d&apos;archivage par bâtiment élimine tout risque d&apos;erreur esthétique lors des remplacements.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-16 mb-12 md:mb-16">
          {[
            { title: 'Base de données', desc: 'Historique complet des spécifications par adresse.' },
            { title: 'Suivi Visuel', desc: 'Preuve de pose et état des lieux photo systématique.' },
            { title: 'Réactivité', desc: 'Traitement prioritaire de vos demandes d&apos;intervention.' },
            { title: 'Simplicité', desc: 'Facturation claire et adaptée aux besoins comptables.' }
          ].map((item, i) => (
            <div key={i} className="flex gap-4 bg-white/5 p-4 rounded-2xl sm:bg-transparent sm:p-0 sm:rounded-none">
              <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold mb-1 md:mb-2 uppercase tracking-widest text-[10px] md:text-[11px]">{item.title}</h4>
                <p className="text-zinc-400 md:text-zinc-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onRegisterClick} className="w-full sm:w-auto bg-emerald-500 text-white px-8 py-4 md:px-10 md:py-5 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 group">
          Devenir partenaire
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  </section>
);
