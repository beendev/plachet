import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const LegalNoticePage = () => (
  <section className="min-h-screen bg-white pt-28 pb-16 md:pt-36 md:pb-24">
    <div className="max-w-3xl mx-auto px-4 md:px-6">
      <a href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors mb-8">
        <ArrowLeft size={16} /> Retour
      </a>

      <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-2">Mentions légales</h1>
      <p className="text-sm text-zinc-400 mb-10">Dernière mise à jour : mars 2026</p>

      <div className="space-y-8 text-sm md:text-base text-zinc-700 leading-relaxed">

        <div>
          <h2 className="text-lg font-bold mb-2">1. Éditeur du site</h2>
          <p>
            Le site <strong>plachet.be</strong> est édité par Plachet, entreprise spécialisée dans la signalétique immobilière.
          </p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li>Dénomination : Plachet</li>
            <li>Siège social : Bruxelles, Belgique</li>
            <li>Email : <a href="mailto:info@plachet.be" className="text-black underline">info@plachet.be</a></li>
            <li>Numéro d'entreprise : à compléter (BCE)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">2. Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li>Railway Corp.</li>
            <li>San Francisco, CA, États-Unis</li>
            <li>Site : railway.app</li>
          </ul>
          <p className="mt-2">
            La base de données est hébergée par Supabase Inc. (infrastructure AWS, région Europe).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">3. Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu du site (textes, images, logos, interfaces, marque « Plachet ») est protégé par le droit d'auteur et le droit des marques. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">4. Responsabilité</h2>
          <p>
            Plachet met tout en œuvre pour assurer l'exactitude des informations publiées sur le site. Toutefois, Plachet ne saurait être tenu responsable des erreurs, omissions ou résultats obtenus suite à l'utilisation de ces informations.
          </p>
          <p className="mt-2">
            Le site peut être temporairement indisponible pour des raisons de maintenance ou de force majeure. Plachet ne garantit pas un accès ininterrompu au service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">5. Cookies</h2>
          <p>
            Le site utilise uniquement des cookies techniques nécessaires au fonctionnement de l'application (session d'authentification). Aucun cookie publicitaire ou de traçage n'est utilisé. Aucun outil d'analyse tiers n'est intégré.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">6. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit belge. En cas de litige, les tribunaux de Bruxelles seront seuls compétents.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">7. Contact</h2>
          <p>
            Pour toute question relative aux mentions légales, vous pouvez nous contacter à l'adresse : <a href="mailto:info@plachet.be" className="text-black underline">info@plachet.be</a>.
          </p>
        </div>
      </div>
    </div>
  </section>
);
