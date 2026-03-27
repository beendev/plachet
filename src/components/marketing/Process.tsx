import { Camera, Database, FileText, Wrench } from 'lucide-react';

export const Process = () => {
  const steps = [
    {
      icon: <FileText size={28} />,
      title: 'Commande Simplifiée',
      desc: "Un portail dédié pour chaque syndic. Transmettez vos demandes en quelques clics, sans perte d'information."
    },
    {
      icon: <Database size={28} />,
      title: 'Archivage Strict',
      desc: 'Chaque immeuble a sa charte. Nous mémorisons vos standards (typos, couleurs, dimensions) pour un résultat toujours identique.'
    },
    {
      icon: <Wrench size={28} />,
      title: 'Intervention Rapide',
      desc: "Nos techniciens se déplacent sur site avec l'équipement adéquat. Une pose propre, rapide et certifiée."
    },
    {
      icon: <Camera size={28} />,
      title: 'Suivi Transparent',
      desc: 'Recevez une confirmation visuelle dès l&apos;installation terminée. Votre historique reste accessible 24/7.'
    }
  ];

  return (
    <section id="process" className="py-16 md:py-32 bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-12 md:mb-20 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 md:mb-6">Une méthodologie sans faille.</h2>
          <p className="text-zinc-500 text-sm md:text-base">La confiance se construit sur la précision. Voici comment nous sécurisons chaque étape de votre projet.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {steps.map((step, idx) => (
            <div key={idx} className="relative group bg-white sm:bg-transparent p-6 sm:p-0 rounded-2xl sm:rounded-none border border-black/5 sm:border-none">
              <div className="mb-6 md:mb-8 text-emerald-600">{step.icon}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-3 md:mb-4">Phase 0{idx + 1}</div>
              <h3 className="text-lg font-bold mb-3 md:mb-4 tracking-tight">{step.title}</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
