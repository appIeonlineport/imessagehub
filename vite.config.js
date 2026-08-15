import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        dashboard: "dashboard.html",
        admin: "admin.html",
        contacts: "contacts.html" // Naya page add kiya
      },
    },
  },
});
