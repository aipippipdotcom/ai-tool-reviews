import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Plugin tự động tạo api/index-html.js sau khi build xong
function injectIndexHtmlPlugin() {
  return {
    name: "inject-index-html",
    closeBundle() {
      const html = fs.readFileSync("dist/index.html", "utf-8");
      const escaped = JSON.stringify(html);
      const content = `export const indexHtml = ${escaped};\n`;
      fs.writeFileSync("api/index-html.js", content);
      console.log("✅ api/index-html.js generated");
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    injectIndexHtmlPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
}));
