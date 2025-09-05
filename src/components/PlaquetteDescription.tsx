// components/PlaquetteDescription.tsx
export default function PlaquetteDescription() {
  return (
    <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-lg md:text-xl font-semibold text-gray-900">
        Plaquettes de sonnette en plexiglas : fixations & avantages
      </h3>

      <div className="mt-3 space-y-4 text-sm leading-relaxed text-gray-700">
        <p>
          Le <strong>plexiglas</strong>, léger et flexible, s’adapte à plusieurs fixations.
          L’<strong>adhésif autocollant</strong> standard est parfait pour une pose rapide :
          nettoyez la surface, appliquez et pressez. Pour une tenue renforcée, optez pour
          des <strong>vis avec entretoises</strong> (kit fourni), qui offrent un effet flottant élégant.
          La <strong>fixation magnétique</strong> convient si la boîte est métallique, tandis que la ventouse
          est moins adaptée au petit format des plaquettes. La légèreté du matériau simplifie
          l’installation sur tout type de boîte aux lettres.
        </p>

        <div>
          <h4 className="font-medium text-gray-900">Pourquoi le plexiglas ?</h4>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <strong>Léger & résistant</strong> : supporte les chocs modérés, facile à manipuler et à installer.
            </li>
            <li>
              <strong>Personnalisation avancée</strong> : teintes, contrastes, typographies — rendu net et propre.
            </li>
            <li>
              <strong>Alternative au métal/bois</strong> : look moderne, propre, entretien simple.
            </li>
            <li>
              <strong>Durable</strong> : résiste aux UV et à l’humidité, conserve son aspect neuf longtemps.
            </li>
            <li>
              <strong>Excellent rapport qualité-prix</strong>.
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Utilisation extérieure</h4>
          <p className="mt-2">
            Oui — le plexiglas est conçu pour l’extérieur : résistant aux UV, il jaunit peu et
            sa surface lisse repousse l’humidité. Un chiffon doux humide suffit pour l’entretien.
            Nous appliquons un <em>fini anti-rayures</em> pour une meilleure longévité.
          </p>
        </div>

        <p className="text-gray-700">
          Astuce : prévisualisez votre texte et la couleur plaque/texte, puis choisissez la fixation
          selon votre boîte aux lettres (adhésif pour la rapidité, entretoises pour l’esthétique, magnétique si compatible).
        </p>
      </div>
    </section>
  );
}
