import React from 'react';

export const LegalNoticePage = () => (
  <section className="min-h-screen bg-white pt-28 pb-16 md:pt-36 md:pb-24">
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-6">Mentions legales</h1>
      <div className="space-y-6 text-sm md:text-base text-zinc-700 leading-relaxed">
        <p>Editeur: Plachet (informations legales completes a finaliser avant la mise en ligne definitive).</p>
        <p>Contact: info@plachet.be</p>
        <p>Hebergement: a completer (fournisseur, adresse, contact technique).</p>
        <p>
          Propriete intellectuelle: l'ensemble du contenu (textes, visuels, marque, interfaces) est protege et ne peut
          etre reproduit sans autorisation.
        </p>
        <p>
          Responsabilite: l'editeur met en oeuvre les moyens raisonnables pour assurer l'exactitude des informations et
          la disponibilite du service.
        </p>
      </div>
    </div>
  </section>
);

