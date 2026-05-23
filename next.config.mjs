/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  // In production we statically export. In dev we run a normal Next server
  // so we can use rewrites to serve bundled sub-site index.html files
  // (rewrites are not compatible with `output: 'export'`).
  ...(isDev ? {} : { output: 'export' }),
  images: { unoptimized: true },
  trailingSlash: true,
  ...(isDev
    ? {
        async rewrites() {
          return [
            { source: '/experience', destination: '/experience/index.html' },
            { source: '/experience/', destination: '/experience/index.html' },
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
