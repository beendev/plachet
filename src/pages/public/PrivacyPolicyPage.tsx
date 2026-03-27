import React from 'react';

export const PrivacyPolicyPage = () => (
  <section className="min-h-screen bg-white pt-28 pb-16 md:pt-36 md:pb-24">
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-6">Politique de confidentialite</h1>
      <div className="space-y-6 text-sm md:text-base text-zinc-700 leading-relaxed">
        <p>
          Cette page presente les principes de traitement des donnees personnelles. Le texte final doit etre valide
          juridiquement avant publication definitive.
        </p>
        <p>
          Finalites: creation de compte, gestion des immeubles, traitement des commandes, support client, notifications
          de service.
        </p>
        <p>
          Base legale: execution du contrat, interet legitime (securite/suivi), obligations legales, consentement lorsque
          requis.
        </p>
        <p>
          Duree de conservation: limitee a la duree necessaire aux finalites, avec anonymisation/suppression lorsque
          possible.
        </p>
        <p>
          Droits des personnes: acces, rectification, suppression, limitation, opposition, portabilite, reclamation
          aupres de l'autorite competente.
        </p>
        <p>Contact RGPD: info@plachet.be</p>
      </div>
    </div>
  </section>
);

