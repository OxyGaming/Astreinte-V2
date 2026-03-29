/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Empêche l'inclusion dans une iframe (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Empêche le MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limite l'information envoyée dans le Referer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Désactive les fonctionnalités navigateur inutiles
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(self), payment=()",
          },
          // Content Security Policy — strict pour une app interne sans CDN externe
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js requiert unsafe-inline et unsafe-eval en dev ; en prod le build génère des nonces
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          // HSTS — activé ici, mais la valeur authoritative doit aussi être dans le reverse proxy
          // Ne pas activer includeSubDomains si d'autres sous-domaines ne sont pas HTTPS
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
