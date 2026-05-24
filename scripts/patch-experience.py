#!/usr/bin/env python3
"""
Patch the /experience bundle.

The bundle in public/experience/ is the static build output of an archived
Next.js project (raggnarD/resume-website), so every piece of content lives
in THREE places that must stay in sync. If you edit only the rendered HTML,
React rehydrates from the embedded RSC and your edit disappears.

The three places:
  1. Rendered HTML in index.html — what the browser paints first.
  2. Embedded RSC in index.html — <script>self.__next_f.push([1,"..."])</script>
     tags React reads on hydration. The payload is a JS-double-quoted
     string, so any " in the content appears as \" and \ appears as \\.
  3. index.txt — same RSC, raw (not JS-string-escaped). Used when the
     page is reached via client-side navigation.

This script applies an old→new substitution to all three.

Usage:
  scripts/patch-experience.py 'OLD' 'NEW'                # single swap
  scripts/patch-experience.py --pairs pairs.json         # batch from file
  cat pairs.json | scripts/patch-experience.py --pairs - # batch from stdin
  scripts/patch-experience.py --dry-run 'OLD' 'NEW'      # show counts only

pairs.json format: [["old1", "new1"], ["old2", "new2"], ...]
Substitutions apply in order, so later pairs can reference text that
earlier pairs produced.

What this script CAN do:
  - Plain text content swaps (company name, role title, dates, bullets).
  - Multi-piece swaps via batched pairs.

What this script CANNOT do (needs hand surgery in the RSC tree):
  - Adding or removing whole <li> entries (you'd also have to update the
    parent's children array, which references rows by hex id like $L22).
  - Changing the JSON structure (adding/removing fields, nesting).
  - Substitutions whose rendered-HTML form differs from the RSC form
    (e.g. mobile date `Jan 2015<!-- --> — <!-- -->May 2019` vs RSC
    `"Jan 2015"," — ","May 2019"`). For those, call the script twice
    with the two different old→new pairs.

Run from anywhere; resolves paths relative to the script's repo root.
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML_PATH = ROOT / 'public/experience/index.html'
TXT_PATH = ROOT / 'public/experience/index.txt'


def js_escape(s: str) -> str:
    """Escape `s` for embedding inside a JS double-quoted string literal."""
    return s.replace('\\', '\\\\').replace('"', '\\"')


def apply_pair(html: str, txt: str, old: str, new: str):
    """Apply one substitution to all three contexts. Returns (html, txt, counts)."""
    # 1. Rendered HTML in index.html (raw form).
    rendered_hits = html.count(old)
    html = html.replace(old, new)

    # 2. Embedded RSC in index.html (JS-string-escaped form). If escaping
    #    is a no-op (no quotes/backslashes), step 1 already caught these
    #    occurrences and this is 0 — that's fine.
    old_esc = js_escape(old)
    new_esc = js_escape(new)
    if old_esc != old:
        embedded_hits = html.count(old_esc)
        html = html.replace(old_esc, new_esc)
    else:
        embedded_hits = 0  # already covered by step 1

    # 3. index.txt RSC (raw form).
    txt_hits = txt.count(old)
    txt = txt.replace(old, new)

    return html, txt, {
        'index.html (rendered+raw-RSC)': rendered_hits,
        'index.html (escaped-RSC)': embedded_hits,
        'index.txt': txt_hits,
    }


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument('old', nargs='?', help='text to find')
    p.add_argument('new', nargs='?', help='replacement text')
    p.add_argument('--pairs', metavar='FILE',
                   help='JSON [[old,new],...] from file or - for stdin')
    p.add_argument('--dry-run', action='store_true',
                   help='show counts but do not write files')
    args = p.parse_args()

    if args.pairs:
        src = sys.stdin if args.pairs == '-' else open(args.pairs)
        pairs = json.load(src)
        if not (isinstance(pairs, list) and all(
            isinstance(x, list) and len(x) == 2 for x in pairs
        )):
            p.error('--pairs must be a JSON array of [old, new] pairs')
    elif args.old is not None and args.new is not None:
        pairs = [[args.old, args.new]]
    else:
        p.error('provide OLD and NEW, or --pairs FILE')

    html = HTML_PATH.read_text()
    txt = TXT_PATH.read_text()
    grand_total = {
        'index.html (rendered+raw-RSC)': 0,
        'index.html (escaped-RSC)': 0,
        'index.txt': 0,
    }
    for old, new in pairs:
        html, txt, counts = apply_pair(html, txt, old, new)
        for k, v in counts.items():
            grand_total[k] += v
        print(f'  {old!r:<60} -> {new!r}: {counts}', file=sys.stderr)

    print(f'\ntotals: {grand_total}', file=sys.stderr)
    if sum(grand_total.values()) == 0:
        print('WARNING: no matches found — check the OLD text spelling/whitespace.',
              file=sys.stderr)

    if args.dry_run:
        print('dry-run: files not written.', file=sys.stderr)
        return

    HTML_PATH.write_text(html)
    TXT_PATH.write_text(txt)
    print('files updated.', file=sys.stderr)


if __name__ == '__main__':
    main()
