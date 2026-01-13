// // import { defineConfig } from 'vite'
// // import react from '@vitejs/plugin-react'

// // // https://vite.dev/config/
// // export default defineConfig({
// //   plugins: [react()],
// // })

// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 5173
//   }
// });

import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig } from "vite";

// Try to load the optional screen graph plugin only when available.
// This prevents Vite from failing when the package isn't installed.
export default defineConfig(async ({ mode }) => {
  let screenGraphPluginFunc = null;
  try {
    const mod = await import("@animaapp/vite-plugin-screen-graph");
    // plugin may be a named export or default
    screenGraphPluginFunc = mod.screenGraphPlugin ?? mod.default ?? null;
  } catch (e) {
    // plugin not installed or failed to load — silently ignore so dev server still starts
    screenGraphPluginFunc = null;
  }

  const plugins = [react()];
  if (mode === "development" && screenGraphPluginFunc) {
    try {
      plugins.push(screenGraphPluginFunc());
    } catch (e) {
      // if plugin factory throws, don't block startup
    }
  }

  return {
    plugins,
    publicDir: "public",
    base: "./",
    css: {
      postcss: {
        plugins: [tailwind()],
      },
    },
  };
});
