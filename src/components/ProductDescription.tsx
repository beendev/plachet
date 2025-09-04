export default function ProductDescription() {
  return (
    <section className="prose prose-neutral max-w-none">
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h3 className="font-bold">Avantages du produit</h3>
            <ul>
              <li>Disponible en trois tailles populaires.</li>
              <li>Matériau léger, résistant aux intempéries et durable.</li>
              <li>Pose rapide au choix : ruban adhésif double face ou ventouses.</li>
              <li>Réutilisable et facile à stocker.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold">Impression de panneaux immobiliers</h3>
            <p>
              Les panneaux immobiliers, appelés aussi panneaux de fenêtre ou panneaux en V, sont conçus pour être
              visibles des deux côtés. Leur structure alvéolaire les rend légers et robustes : parfaite combinaison pour
              un usage extérieur récurrent. Ils se fixent aisément sur des surfaces lisses (fenêtres, vitrines, etc.)
              à l’aide d’un ruban adhésif double face ou de ventouses.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Inspirez‑vous des différentes applications</h3>
            <p>
              Idéals pour promouvoir une mise en vente ou une location à court terme, ces panneaux attirent l’attention
              des passants. Choisissez parmi les trois formats standards pour s’adapter au mieux à la fenêtre et au
              message à afficher.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Matériau respectueux de l’environnement</h3>
            <p>
              Fabriqués en panneau alvéolaire recyclable, ils résistent à la pluie, au vent et au soleil tout en restant
              suffisamment légers pour être manipulés et réutilisés plusieurs fois.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Plusieurs options de fixation</h3>
            <p>
              Deux systèmes au choix : un modèle avec incision et ruban adhésif double face prédécollé, ou un modèle
              pré‑percé prêt pour l’ajout de <strong>4 ventouses</strong>. Les ventouses permettent une fixation amovible et
              propre, tandis que l’adhésif offre une mise en place ultra rapide.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Caractéristiques</h3>
            <ul>
              <li>Tailles : 50 × 140 cm, 100 × 70 cm, 100 × 140 cm.</li>
              <li>Finitions : ruban adhésif double face ou 4 ventouses.</li>
              <li>Impression recto/verso, couleurs vives et nettes.</li>
              <li>Usage : vitres et surfaces lisses (intérieur/extérieur).</li>
              <li>Conditionnement : vendus par lots de 10.</li>
            </ul>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-gray-50 p-4">
            <h4 className="m-0">Conseils de pose</h4>
            <ul className="mt-2">
              <li>Nettoyez et séchez la surface avant la fixation.</li>
              <li>Positionnez à plat, puis marouflez du centre vers les bords.</li>
              <li>Pour ventouses : pressez fermement et vérifiez l’étanchéité.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
