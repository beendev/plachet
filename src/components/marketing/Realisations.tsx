import { History, Layers, Mail, Phone } from 'lucide-react';

export const Realisations = () => {
  const items = [
    {
      title: 'Boîtes aux Lettres',
      desc: "Gravure inaltérable. Modèle signature avec inscription 'Plachet' pour une harmonie parfaite.",
      icon: <Mail size={32} className="md:w-10 md:h-10" />
    },
    {
      title: 'Parlophones',
      desc: "Gravure sur-mesure pour platines classiques. Remplacement à l'identique selon vos archives.",
      icon: <Phone size={32} className="md:w-10 md:h-10" />
    },
    {
      title: 'Platines Bticino',
      desc: 'Expertise spécifique pour les systèmes électroniques. Plaquettes aux dimensions exactes.',
      icon: <Layers size={32} className="md:w-10 md:h-10" />
    },
    {
      title: 'Archive Digitale',
      desc: 'Base de données visuelle garantissant la continuité esthétique de votre parc immobilier.',
      icon: <History size={32} className="md:w-10 md:h-10" />
    }
  ];

  return (
    <section id="realisations" className="py-16 md:py-40 bg-[#fcfcfc]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-12 md:mb-24">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-4 md:mb-6">Nos Standards</h2>
          <p className="text-zinc-500 text-base md:text-lg">La précision technique au service de l&apos;esthétique de vos immeubles.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {items.map((item, i) => (
            <div key={i} className="bg-white p-8 md:p-12 rounded-[24px] md:rounded-[40px] border border-black/5 hover:border-black/20 transition-all duration-500 group">
              <div className="mb-8 md:mb-12 text-zinc-300 group-hover:text-black transition-colors duration-500">{item.icon}</div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 tracking-tight">{item.title}</h3>
              <p className="text-zinc-500 leading-relaxed text-sm md:text-base">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
