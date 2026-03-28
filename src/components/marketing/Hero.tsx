import { ArrowRight, MapPin } from 'lucide-react';

export const Hero = ({ onRegisterClick }: { onRegisterClick?: () => void }) => (
  <section className="relative min-h-[100svh] flex items-center pt-20 pb-10 md:pt-32 md:pb-20 bg-white">
    <div className="max-w-7xl mx-auto px-5 md:px-6 w-full relative z-10">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-5 md:mb-8">
          <div className="h-px w-6 md:w-8 bg-emerald-500" />
          <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-emerald-600">
            Expertise Signalétique Immobilière
          </span>
        </div>

        <h1 className="text-[2rem] leading-[1.15] sm:text-5xl md:text-7xl font-bold tracking-tight mb-5 md:mb-10">
          Votre partenaire{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">
            signalétique de confiance.
          </span>
        </h1>

        <p className="text-[15px] leading-relaxed sm:text-lg md:text-xl text-zinc-500 max-w-2xl mb-7 md:mb-12">
          Plachet libère les syndics de la gestion des plaques. De la commande à la pose, profitez d&apos;une méthodologie sans faille pour une harmonie parfaite de vos immeubles.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center">
          <button
            onClick={onRegisterClick}
            className="w-full sm:w-auto bg-black text-white px-8 py-4 md:px-10 md:py-5 rounded-full font-bold uppercase tracking-widest text-xs md:text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            Devenir partenaire <ArrowRight size={16} />
          </button>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-zinc-400">
            <MapPin size={14} className="text-emerald-500 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Service actif sur les 19 communes</span>
          </div>
        </div>
      </div>
    </div>

    {/* Background dots */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
  </section>
);
