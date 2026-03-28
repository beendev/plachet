import React, { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';

type NavbarProps = {
  onPortalClick?: () => void;
  onRegisterClick?: () => void;
  onCachetsClick?: () => void;
  onHomeClick?: () => void;
};

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const Navbar = ({ onPortalClick, onRegisterClick, onCachetsClick, onHomeClick }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Services', onClick: () => scrollTo('process') },
    { name: 'Méthode', onClick: () => scrollTo('syndic') },
    { name: 'Cachets', onClick: onCachetsClick },
    { name: 'Contact', onClick: () => scrollTo('contact') },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled || isMenuOpen ? 'bg-white border-b border-black/5 py-4' : 'bg-transparent py-4 md:py-8'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
        <div className="flex flex-col cursor-pointer" onClick={onHomeClick}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight uppercase">Plachet</span>
          </div>
          <span className="hidden md:block text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-400 mt-1">Vos plaques et vos cachets</span>
        </div>

        <div className="hidden md:flex items-center gap-10 text-[10px] font-bold uppercase tracking-widest">
          {navLinks.map((link) => (
            <button key={link.name} onClick={link.onClick} className="hover:text-emerald-600 transition-colors uppercase tracking-widest">{link.name}</button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onPortalClick}
            className="hidden sm:flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <LogIn size={14} />
            Connexion Syndic
          </button>
          <button onClick={onRegisterClick} className="hidden sm:block border border-black px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all">
            Devenir Partenaire
          </button>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5">
            <div className={`w-5 h-0.5 bg-black transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-5 h-0.5 bg-black transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-5 h-0.5 bg-black transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-black/5 p-6 space-y-6 animate-in slide-in-from-top duration-300 shadow-xl">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => { setIsMenuOpen(false); link.onClick?.(); }}
              className="block text-xs font-bold uppercase tracking-widest border-b border-zinc-50 pb-4 w-full text-left"
            >
              {link.name}
            </button>
          ))}
          <button
            onClick={() => { setIsMenuOpen(false); onPortalClick?.(); }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest"
          >
            <LogIn size={16} />
            Connexion Syndic
          </button>
          <button onClick={() => { setIsMenuOpen(false); onRegisterClick?.(); }} className="w-full bg-black text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest">
            Devenir Partenaire
          </button>
        </div>
      )}
    </nav>
  );
};
