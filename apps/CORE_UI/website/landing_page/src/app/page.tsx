import LandingPage from "@/components/LandingPage";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <LandingPage />
      <Footer />
    </main>
  );
}