import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Square, AlertTriangle, CheckCircle2, Globe } from "lucide-react";
import {
  parseReviewDraft,
  reviewDraftIssues,
  countWords,
  isTrackerUrl,
  type ReviewDraft,
} from "@/lib/reviewDraft";

export interface GeneratedReview {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  excerpt: string;
  content: string;
  /** The generator's own category choice, so the editor does not start empty. */
  categoryId: string;
}

interface AiReviewGeneratorProps {
  categories: { id: string; name: string }[];
  /** Pushes the finished draft into the editor fields. */
  onApply: (review: GeneratedReview) => void;
}

const AiReviewGenerator = ({ categories, onApply }: AiReviewGeneratorProps) => {
  const [mode, setMode] = useState<"review" | "roundup">("review");
  const [count, setCount] = useState(7);
  const [productName, setProductName] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [salesPageUrl, setSalesPageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");

  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [research, setResearch] = useState<{ ok: boolean; note: string } | null>(null);
  const [minWords, setMinWords] = useState(2000);

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  const draft: ReviewDraft = parseReviewDraft(raw);
  const words = countWords(draft.content);
  const issues = running || !raw ? [] : reviewDraftIssues(draft, minWords, mode);
  const trackerWarning = !salesPageUrl.trim() && isTrackerUrl(affiliateUrl);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  };

  const generate = async () => {
    // Every post needs one to save, so ask now rather than after the writing.
    if (!categoryId) {
      toast.error("Pick a category first.");
      return;
    }
    if (mode === "review" && (!productName.trim() || !affiliateUrl.trim())) {
      toast.error("Product name and affiliate URL are both required.");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      toast.error("Your session expired. Sign in again.");
      return;
    }

    setRaw("");
    setError("");
    setResearch(null);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/generate-review", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode,
          count,
          categoryId,
          productName: productName.trim(),
          affiliateUrl: affiliateUrl.trim(),
          salesPageUrl: salesPageUrl.trim(),
          notes,
          categoryName: (categories.find((c) => c.id === categoryId)?.name ?? "").replace(
            /^Review\s+/i,
            ""
          ),
        }),
      });

      if (!res.ok || !res.body) {
        const { error } = await res.json().catch(() => ({ error: `Request failed (${res.status}).` }));
        throw new Error(error);
      }

      // Whether the sales page was actually read decides how much to trust the
      // product facts, so surface it rather than letting it fail silently.
      setResearch({
        ok: res.headers.get("x-research-ok") === "1",
        note: decodeURIComponent(res.headers.get("x-research-note") ?? ""),
      });
      setMinWords(Number(res.headers.get("x-min-words")) || 2000);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setRaw((prev) => prev + decoder.decode(value, { stream: true }));
        outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
      }

      toast.success("Draft ready — review it before applying.");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // Kept on screen rather than only in a toast: these messages name the
        // actual fault and are the whole diagnosis when generation fails.
        const message = (err as Error).message || "Generation failed.";
        setError(message);
        toast.error("Generation failed — details below.");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const apply = () => {
    onApply({
      title: draft.title,
      slug: draft.slug,
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      metaKeywords: draft.metaKeywords,
      excerpt: draft.excerpt,
      content: draft.content,
      categoryId,
    });
    toast.success("Applied. Add your images, then save as a draft.");
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex gap-2">
          {(
            [
              ["review", "Single review", "One product, researched from its sales page"],
              ["roundup", "Roundup (Best of)", "Ranks products you have already reviewed"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              title={hint}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {mode === "review" ? (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Product name *</label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="StoryCraft Kids"
                className="bg-secondary border-border"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-1.5 block">How many products</label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm"
              >
                {[5, 7, 10].map((n) => (
                  <option key={n} value={n}>
                    Top {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm"
            >
              <option value="">— pick one —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mode === "roundup" && (
          <p className="rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            Built from your most-viewed published reviews in this category. Each entry
            reuses that review's own affiliate link and links back to it, so the roundup
            feeds the pages it draws from. Reviews with no outbound link are skipped.
          </p>
        )}

        <div className={mode === "roundup" ? "hidden" : undefined}>
          <label className="text-sm font-medium mb-1.5 block">Affiliate URL *</label>
          <Input
            value={affiliateUrl}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            placeholder="https://warriorplus.com/o2/a/xxxxx/0"
            className="bg-secondary border-border"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Your commission link. Goes into every button in the article, verbatim.
          </p>
        </div>

        <div className={mode === "roundup" ? "hidden" : undefined}>
          <label className="text-sm font-medium mb-1.5 block">
            Sales page URL{" "}
            <span className="text-muted-foreground font-normal">
              (what the AI reads for facts)
            </span>
          </label>
          <Input
            value={salesPageUrl}
            onChange={(e) => setSalesPageUrl(e.target.value)}
            placeholder="https://the-vendor-site.com/"
            className="bg-secondary border-border"
          />
          {trackerWarning ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
              <span>
                Affiliate networks serve a bot-guarded page with no readable text, so
                reading your commission link would teach the AI nothing. Paste the
                vendor's own sales page here — otherwise the article can only use
                your notes.
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1.5">
              Leave blank to read the affiliate URL instead. The page's real copy is
              what stops the model inventing prices and features.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Your notes <span className="text-muted-foreground font-normal">(optional, but they win over the sales page)</span>
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder={
              "Anything you know first-hand:\n- what you actually used it for\n- the real front-end price if the page hides it\n- what annoyed you\n- who should skip it"
            }
            className="bg-secondary border-border"
          />
        </div>

        <div className="flex items-center gap-3">
          {running ? (
            <Button onClick={stop} variant="destructive" className="gap-2">
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button onClick={generate} className="gap-2 glow">
              <Sparkles className="h-4 w-4" />
              {mode === "roundup" ? `Generate top ${count} roundup` : "Generate review"}
            </Button>
          )}
          {running && (
            <span className="text-sm text-muted-foreground">
              Writing… {words} words so far. This takes a minute or two.
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-2.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">Generation failed</p>
              <p className="mt-1 break-words font-mono text-xs leading-relaxed opacity-90">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {research && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
            research.ok
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/5 text-amber-300"
          }`}
        >
          <Globe className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {research.ok ? "Sales page read" : "Sales page could NOT be read"}
            </p>
            <p className="opacity-80 break-all">{research.note}</p>
            {!research.ok && (
              <p className="mt-1 opacity-80">
                The model only had your notes. Check every price and feature before publishing.
              </p>
            )}
          </div>
        </div>
      )}

      {raw && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/50 px-4 py-2.5">
            <div className="flex items-center gap-3 text-sm">
              <span className={words >= minWords ? "text-emerald-400" : "text-amber-400"}>
                {words} / {minWords} words
              </span>
              {draft.title && (
                <span className="text-muted-foreground truncate max-w-[22rem]">{draft.title}</span>
              )}
            </div>
            <Button size="sm" onClick={apply} disabled={running || !draft.content}>
              Apply to editor
            </Button>
          </div>

          {issues.length > 0 && (
            <div className="flex items-start gap-2.5 border-b border-border bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Check these before publishing</p>
                <ul className="mt-1 space-y-0.5 opacity-90">
                  {issues.map((issue) => (
                    <li key={issue}>· {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!running && raw && issues.length === 0 && (
            <div className="flex items-center gap-2.5 border-b border-border bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Structure, length and conversion blocks all check out.
            </div>
          )}

          <pre
            ref={outputRef}
            className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-muted-foreground"
          >
            {raw}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AiReviewGenerator;
