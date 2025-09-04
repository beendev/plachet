import PromoBar from "@/components/PromoBar";
import Hero from "@/components/Hero";
import CatalogSwitcher from "@/components/CatalogSwitcher";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main className="bg-white text-gray-900 min-h-screen">
      <PromoBar />
      <Hero />
      <section id="catalog" className="max-w-6xl mx-auto px-6 py-10">
        <CatalogSwitcher />
      </section>
      <Footer />
    </main>
  );
}