import { defineConfig } from "astro/config";

// GitHub Pages: https://brightwav3.github.io/Assistant-mark-II/
export default defineConfig({
  site: "https://brightwav3.github.io",
  base: "/Assistant-mark-II",
  trailingSlash: "ignore",
  build: { format: "directory" },
});
