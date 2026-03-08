import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send } from "lucide-react";

const EmailSubscribe = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from("email_subscribers")
      .insert({ email: email.trim() });

    if (error) {
      if (error.code === "23505") {
        toast.info("This email is already subscribed!");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } else {
      toast.success("You're in! Thanks for subscribing.");
      setEmail("");
    }
    setLoading(false);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-0 right-0 w-60 h-60 bg-primary/10 blur-[80px] rounded-full" />

      <div className="relative px-8 py-14 md:px-16 md:py-16 text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
          Stay ahead of the curve
        </h2>
        <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
          Get the latest AI tool reviews, exclusive deals, and product launches straight to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-sm mx-auto">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow shrink-0 gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {loading ? "..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default EmailSubscribe;
