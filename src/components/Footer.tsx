export default function Footer() {
  return (
    <footer className="border-t mt-10">
      <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-gray-600 flex flex-col md:flex-row items-center md:justify-between gap-4">
        <p>© {new Date().getFullYear()} Plachet</p>
        <p>Contact : <a className="underline underline-offset-2" href="mailto:info@plachet.be">info@plachet.be</a></p>
      </div>
    </footer>
  );
}
