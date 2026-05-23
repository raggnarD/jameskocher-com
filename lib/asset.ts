/**
 * Prefix an absolute asset path with the deploy basePath, if any.
 *
 * Next.js automatically prefixes <Link href> and <Image src> with basePath,
 * but plain <img src> and inline `background-image: url(...)` strings do not
 * get rewritten. Use asset('/assets/foo.jpg') for any such reference so the
 * URL resolves correctly under both staging (raggnard.github.io/<repo>/...)
 * and production (jameskocher.com/...).
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function asset(path: string): string {
  if (!path.startsWith('/')) return path;
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_PATH}${path}`;
}
