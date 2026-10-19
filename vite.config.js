import { defineConfig } from "vite";
import { globSync } from "node:fs";
import { resolve } from "node:path";

// MPA: every HTML file is a build entry. Add a new page under / or /work and it is included.
const htmlPages = globSync(["*.html", "work/*.html"]);

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'none'",
  "frame-src 'none'",
  "media-src 'none'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = {
  "Content-Security-Policy": csp,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy":
    "accelerometer=(), camera=(), display-capture=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
  "X-Permitted-Cross-Domain-Policies": "none",
};

export default defineConfig({
  appType: "mpa",
  build: {
    sourcemap: false,
    rollupOptions: {
      input: Object.fromEntries(
        htmlPages.map((file) => [
          file.replace(/\.html$/, "").replace(/[\\/]/g, "-"),
          resolve(__dirname, file),
        ])
      ),
    },
  },
  preview: {
    headers: securityHeaders,
  },
});
