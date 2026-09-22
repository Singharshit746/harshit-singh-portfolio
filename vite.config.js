import { defineConfig } from "vite";
import { globSync } from "node:fs";
import { resolve } from "node:path";

// MPA: every HTML file is a build entry. Add a new page under / or /work and it is included.
const htmlPages = globSync(["*.html", "work/*.html"]);

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; upgrade-insecure-requests",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
};

export default defineConfig({
  appType: "mpa",
  preview: {
    headers: securityHeaders,
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        htmlPages.map((file) => [
          file.replace(/\.html$/, "").replace(/[\\/]/g, "-"),
          resolve(__dirname, file),
        ])
      ),
    },
  },
});
