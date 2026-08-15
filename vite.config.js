import { resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

const mobileDashboardFixes = {
  name: "mobile-dashboard-fixes",
  transformIndexHtml: {
    order: "post",
    handler(html, ctx) {
      if (!ctx?.filename?.endsWith("dashboard.html")) return html;
      return {
        html,
        tags: [
          {
            tag: "link",
            attrs: { rel: "stylesheet", href: "/src/mobile-fixes.css" },
            injectTo: "head"
          },
          {
            tag: "script",
            attrs: { type: "module", src: "/src/mobile-sidebar.js" },
            injectTo: "body"
          }
        ]
      };
    }
  }
};

export default defineConfig({
  plugins: [mobileDashboardFixes],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
