/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// When deploying to GitHub Pages without a custom domain, the site lives at
// `<user>.github.io/<repo>/`. Setting NEXT_PUBLIC_BASE_PATH in the build env
// prefixes all internal asset paths so the staging URL renders correctly.
// In production with CNAME (jameskocher.com), leave it empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // In production we statically export. In dev we run a normal Next server
  // so we can use rewrites to serve bundled sub-site index.html files
  // (rewrites are not compatible with `output: 'export'`).
  ...(isDev ? {} : { output: 'export' }),
  images: { unoptimized: true },
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  ...(isDev
    ? {
        async rewrites() {
          return [
            { source: '/kids-games', destination: '/kids-games/index.html' },
            { source: '/kids-games/', destination: '/kids-games/index.html' },
            {
              source: '/netflix-resume',
              destination: '/netflix-resume/index.html',
            },
            {
              source: '/netflix-resume/',
              destination: '/netflix-resume/index.html',
            },
            { source: '/rpg-skills', destination: '/rpg-skills/index.html' },
            { source: '/rpg-skills/', destination: '/rpg-skills/index.html' },
          ];
        },
      }
    : {}),
};

export default nextConfig;
