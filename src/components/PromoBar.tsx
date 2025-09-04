export default function PromoBar() {
  return (
    <div className="w-full bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-2.5 text-sm">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          <Item text="Prise en charge sous 24 h" />
          <Item text="Livraison partout en Belgique" />
          <Item text="Finitions : adhésif ou 4 ventouses" />
        </ul>
      </div>
    </div>
  );
}

function Item({ text }: { text: string }) {
  return (
    <li className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15 text-green-400">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4A1 1 0 1 1 4.707 9.293L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
        </svg>
      </span>
      <span>{text}</span>
    </li>
  );
}