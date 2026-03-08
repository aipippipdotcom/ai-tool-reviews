import logo from "@/assets/logo.png";
import { Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card mb-16">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      {/* Glow orb */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/10 blur-[100px] animate-pulse-glow" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-primary/5 blur-[80px] animate-pulse-glow" />

      <div className="relative px-8 py-16 md:px-16 md:py-24 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6">
            <Sparkles className="h-3 w-3" />
            Honest AI Tool Reviews
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-5">
            Find the best
            <br />
            <span className="text-gradient">AI tools</span> for your
            <br />
            workflow
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-lg">
            In-depth reviews, side-by-side comparisons, and expert insights on the top digital products and AI tools.
          </p>
        </div>

        <div className="flex-shrink-0 hidden lg:block">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full" />
            <img
              src={logo}
              alt="AIPipPip"
              className="relative w-48 h-48 rounded-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
