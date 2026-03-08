import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail } from "lucide-react";

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
        toast.info("Email này đã đăng ký rồi!");
      } else {
        toast.error("Có lỗi xảy ra, vui lòng thử lại.");
      }
    } else {
      toast.success("Đăng ký thành công! Cảm ơn bạn.");
      setEmail("");
    }
    setLoading(false);
  };

  return (
    <section className="bg-gradient-hero rounded-2xl p-8 md:p-12 text-center">
      <div className="max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
          <Mail className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
          Nhận tin tức & khuyến mại
        </h2>
        <p className="text-primary-foreground/70 text-sm mb-6 leading-relaxed">
          Đăng ký để nhận thông tin về các công cụ AI mới nhất, deal khuyến mại và review chuyên sâu.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Email của bạn..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 focus:border-accent"
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-accent text-accent-foreground hover:opacity-90 transition-opacity shrink-0"
          >
            {loading ? "..." : "Đăng ký"}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default EmailSubscribe;
