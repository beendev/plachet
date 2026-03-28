import React, { useState } from 'react';
import { Download, Smartphone, X, Mail, MapPin, Phone } from 'lucide-react';
import { usePwaInstall } from '../../lib/usePwaInstall';

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else window.location.href = `/#${id}`;
};

export const Footer = ({ onPortalClick }: { onPortalClick: () => void }) => {
  const { canInstall, install, isInstalled } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <footer className="bg-[#0a0a0a] text-white">
      {/* Install app banner */}
      {!isInstalled && (
        <div className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-black font-bold text-2xl">P</span>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg md:text-xl font-bold mb-1">Télécharger l'application Plachet</h3>
                <p className="text-sm text-zinc-400">
                  Installez Plachet sur votre téléphone pour un accès rapide, même hors connexion.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {canInstall ? (
                  <button
                    onClick={install}
                    className="flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 active:scale-95 transition-all"
                  >
                    <Download size={16} />
                    Installer
                  </button>
                ) : (
                  <button
                    onClick={() => setShowGuide(true)}
                    className="flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 active:scale-95 transition-all"
                  >
                    <Smartphone size={16} />
                    Comment installer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install guide modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setShowGuide(false)}>
          <div className="bg-white text-black w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Installer Plachet</h3>
              <button onClick={() => setShowGuide(false)} className="p-2 rounded-xl hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            {isIos ? (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">iPhone / iPad</div>
                <div className="space-y-3">
                  <Step n={1} text="Ouvrez cette page dans Safari" />
                  <Step n={2} text={<>Appuyez sur l'icône <strong>Partager</strong> <ShareIcon /> en bas de l'écran</>} />
                  <Step n={3} text={<>Faites défiler et appuyez sur <strong>« Sur l'écran d'accueil »</strong></>} />
                  <Step n={4} text={<>Appuyez <strong>« Ajouter »</strong></>} />
                </div>
                <div className="bg-zinc-50 rounded-xl p-3 text-xs text-zinc-500">
                  L'app Plachet apparaîtra sur votre écran d'accueil comme une application native.
                </div>
              </div>
            ) : isAndroid ? (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">Android</div>
                <div className="space-y-3">
                  <Step n={1} text="Ouvrez cette page dans Chrome" />
                  <Step n={2} text={<>Appuyez sur les <strong>3 points</strong> en haut à droite</>} />
                  <Step n={3} text={<>Appuyez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong></>} />
                  <Step n={4} text={<>Confirmez en appuyant <strong>« Installer »</strong></>} />
                </div>
                <div className="bg-zinc-50 rounded-xl p-3 text-xs text-zinc-500">
                  L'app Plachet se lancera en plein écran, sans barre d'adresse.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">Ordinateur / Navigateur</div>
                <div className="space-y-3">
                  <Step n={1} text="Ouvrez cette page dans Chrome, Edge ou Safari" />
                  <Step n={2} text={<>Cherchez l'icône <strong>d'installation</strong> dans la barre d'adresse</>} />
                  <Step n={3} text={<>Cliquez sur <strong>« Installer »</strong></>} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-base">P</span>
              </div>
              <span className="text-xl font-bold tracking-tight uppercase">Plachet</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">
              Expertise signalétique immobilière à Bruxelles. De la commande à la pose, une méthodologie sans faille.
            </p>
            <button
              onClick={onPortalClick}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all"
            >
              Connexion Syndic
            </button>
          </div>

          {/* Navigation */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Navigation</div>
            <ul className="space-y-3">
              <li><button onClick={() => scrollTo('process')} className="text-sm text-zinc-400 hover:text-white transition-colors">Services</button></li>
              <li><button onClick={() => scrollTo('syndic')} className="text-sm text-zinc-400 hover:text-white transition-colors">Méthode</button></li>
              <li><a href="/cachets" className="text-sm text-zinc-400 hover:text-white transition-colors">Cachets</a></li>
              <li><button onClick={() => scrollTo('contact')} className="text-sm text-zinc-400 hover:text-white transition-colors">Contact</button></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Légal</div>
            <ul className="space-y-3">
              <li><a href="/mentions-legales" className="text-sm text-zinc-400 hover:text-white transition-colors">Mentions légales</a></li>
              <li><a href="/confidentialite" className="text-sm text-zinc-400 hover:text-white transition-colors">Politique de confidentialité</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Contact</div>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-zinc-400">
                <Mail size={14} className="shrink-0 text-zinc-500" />
                <a href="mailto:info@plachet.be" className="hover:text-white transition-colors">info@plachet.be</a>
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-400">
                <MapPin size={14} className="shrink-0 text-zinc-500" />
                <span>Bruxelles, Belgique</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            © {new Date().getFullYear()} Plachet Bruxelles — Expertise Signalétique Immobilière
          </div>
          <div className="text-[10px] text-zinc-600">
            Tous droits réservés.
          </div>
        </div>
      </div>
    </footer>
  );
};

const Step = ({ n, text }: { n: number; text: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">{n}</div>
    <div className="text-sm pt-1">{text}</div>
  </div>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-text-bottom mx-0.5">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);
