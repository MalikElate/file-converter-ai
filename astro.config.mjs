import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import clerk from "@clerk/astro";
import vercel from "@astrojs/vercel/serverless";
import partytown from "@astrojs/partytown";

import db from "@astrojs/db";

export default defineConfig({
  output: "server",
  site: "https://astro-article.netlify.app/",
  adapter: vercel({
    analytics: true,
    maxDuration: 60,
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    clerk(),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
    db(),
  ],
  build: {
    minify: true,
  },
  compressHTML: true,
});
