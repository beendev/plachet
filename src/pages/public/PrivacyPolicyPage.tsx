import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPolicyPage = () => (
  <section className="min-h-screen bg-white pt-28 pb-16 md:pt-36 md:pb-24">
    <div className="max-w-3xl mx-auto px-4 md:px-6">
      <a href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors mb-8">
        <ArrowLeft size={16} /> Retour
      </a>

      <h1 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-zinc-400 mb-10">Dernière mise à jour : mars 2026</p>

      <div className="space-y-8 text-sm md:text-base text-zinc-700 leading-relaxed">

        <div>
          <h2 className="text-lg font-bold mb-2">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles est Plachet, dont le siège social est situé à Bruxelles, Belgique.
          </p>
          <p className="mt-2">
            Contact DPO : <a href="mailto:info@plachet.be" className="text-black underline">info@plachet.be</a>
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">2. Données collectées</h2>
          <p>Dans le cadre de l'utilisation de la plateforme Plachet, nous collectons :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
            <li><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
            <li><strong>Données professionnelles :</strong> nom de société, fonction (syndic, placeur)</li>
            <li><strong>Données de commande :</strong> adresses d'immeubles, spécifications de plaques, photos d'intervention</li>
            <li><strong>Données de géolocalisation :</strong> coordonnées GPS lors des prises de photos (avec consentement)</li>
            <li><strong>Données techniques :</strong> adresse IP, type de navigateur, pages consultées</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">3. Finalités du traitement</h2>
          <p>Les données sont traitées pour les finalités suivantes :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
            <li>Création et gestion de votre compte utilisateur</li>
            <li>Gestion des immeubles et commandes de signalétique</li>
            <li>Suivi des interventions de pose (photos avant/après)</li>
            <li>Communication relative au service (notifications, emails)</li>
            <li>Support client et traitement des signalements</li>
            <li>Établissement de factures et comptabilité</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">4. Base légale</h2>
          <ul className="space-y-1 list-disc list-inside text-zinc-600">
            <li><strong>Exécution du contrat :</strong> gestion des commandes, livraison du service</li>
            <li><strong>Intérêt légitime :</strong> sécurité de la plateforme, amélioration du service, statistiques anonymisées</li>
            <li><strong>Obligation légale :</strong> conservation des factures, obligations fiscales</li>
            <li><strong>Consentement :</strong> géolocalisation, formulaire de contact, cookies non essentiels</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">5. Durée de conservation</h2>
          <ul className="space-y-1 list-disc list-inside text-zinc-600">
            <li><strong>Données de compte :</strong> conservées pendant la durée de la relation commerciale, puis 3 ans après la dernière activité</li>
            <li><strong>Données de commande :</strong> 10 ans (obligations comptables belges)</li>
            <li><strong>Photos d'intervention :</strong> 5 ans après la pose</li>
            <li><strong>Données de contact (formulaire) :</strong> 1 an après le dernier échange</li>
            <li><strong>Signalements de bugs :</strong> 1 an après résolution</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">6. Destinataires des données</h2>
          <p>Vos données peuvent être partagées avec :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
            <li>Les placeurs assignés à vos interventions (données de commande uniquement)</li>
            <li>Notre hébergeur (Railway Corp., Supabase Inc.) en tant que sous-traitants</li>
            <li>Notre prestataire d'envoi d'emails (Resend Inc.)</li>
          </ul>
          <p className="mt-2">
            Aucune donnée n'est vendue ou cédée à des tiers à des fins commerciales.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">7. Transferts hors UE</h2>
          <p>
            Certains sous-traitants (Railway, Supabase, Resend) sont basés aux États-Unis. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne et/ou le Data Privacy Framework.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">8. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
            <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
            <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
            <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
            <li><strong>Droit à la limitation :</strong> restreindre le traitement dans certains cas</li>
            <li><strong>Droit d'opposition :</strong> vous opposer au traitement basé sur l'intérêt légitime</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits : <a href="mailto:info@plachet.be" className="text-black underline">info@plachet.be</a>
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">9. Cookies</h2>
          <p>
            Plachet utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de l'application (authentification, session). Aucun cookie de traçage publicitaire n'est utilisé. Aucun outil d'analyse tiers (Google Analytics, etc.) n'est intégré.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">10. Sécurité</h2>
          <p>
            Plachet met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement en transit (HTTPS/TLS), authentification sécurisée, mots de passe hashés (bcrypt), contrôle d'accès par rôle, hébergement sécurisé.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">11. Réclamation</h2>
          <p>
            Si vous estimez que le traitement de vos données n'est pas conforme, vous pouvez introduire une réclamation auprès de l'Autorité de protection des données (APD) :
          </p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li>Autorité de protection des données</li>
            <li>Rue de la Presse, 35 — 1000 Bruxelles</li>
            <li>Email : contact@apd-gba.be</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">12. Modifications</h2>
          <p>
            Plachet se réserve le droit de modifier la présente politique de confidentialité à tout moment. Toute modification sera publiée sur cette page avec indication de la date de mise à jour.
          </p>
        </div>
      </div>
    </div>
  </section>
);
