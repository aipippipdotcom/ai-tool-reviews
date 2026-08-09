import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo, { BASE_URL, SITE_NAME } from "@/components/Seo";
import { Mail, Linkedin, Facebook } from "lucide-react";

const AboutPage = () => {
  return (
    <>
      <Seo
        title={`About Us — ${SITE_NAME}`}
        description="AIPipPip.net is a global review platform dedicated to discovering, analyzing, and curating the most practical and high-value AI tools."
        canonical={`${BASE_URL}/about`}
        schema={[
          {
            "@type": "AboutPage",
            url: `${BASE_URL}/about`,
            description:
              "AIPipPip.net is a global review platform dedicated to discovering, analyzing, and curating the most practical and high-value AI tools.",
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
              {
                "@type": "ListItem",
                position: 2,
                name: "About",
                item: `${BASE_URL}/about`,
              },
            ],
          },
        ]}
      />
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-8">
          About <span className="text-gradient">AI</span><span className="text-foreground">PipPip</span>
        </h1>

        <div className="space-y-6 text-muted-foreground leading-relaxed text-base">
          <p>
            AIPipPip.net is a global review platform dedicated to discovering, analyzing, and curating the most practical and high-value AI tools for creators, marketers, startups, and digital professionals.
          </p>
          <p>
            We focus on tools that truly make an impact – across SEO &amp; Marketing, Video &amp; Image Generation, Writing Assistants, Music &amp; Voice, Productivity &amp; Automation, AI Assistants, Coding Tools, and No-Code/AI Builders.
          </p>
          <p>
            Our mission is to help users work smarter, save time, and achieve better results by choosing AI solutions that deliver real performance and value – not trends, but tools that empower creativity, streamline workflows, and drive sustainable growth.
          </p>
          <p>
            At AIPipPip.net, every review is crafted with clarity, transparency, and practical insight – enabling creators, entrepreneurs, and business owners to confidently adopt AI and unlock new opportunities for innovation.
          </p>
        </div>

        <div className="mt-14 border-t border-border pt-10">
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">
            Collaboration &amp; Partnerships
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            For product reviews, media inquiries, or long-term affiliate partnerships – feel free to reach out:
          </p>

          <div className="flex flex-col gap-4">
            <a
              href="mailto:admin@aipippip.net"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Mail className="h-5 w-5" />
              admin@aipippip.net
            </a>

            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/company/110898699"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                LinkedIn
              </a>
              <a
                href="https://www.facebook.com/aipippip/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Facebook className="h-5 w-5" />
                Facebook
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AboutPage;
