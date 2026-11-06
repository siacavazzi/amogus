#!/usr/bin/env python3
"""Decide how much of the test suite a change needs.

Prints "site" when every changed file is on the site-only list below, otherwise "full".
Used by "Check a change", "Deploy to beta" and "Promote beta to prod".

  site  the marketing site, its images and copy, docs. The game can't be reached by these
        files, so the browser game suite is skipped and only the site pages are opened
        in Chromium and Safari (site.spec.js: every sitemap page, the 404 page, the home
        page getting a visitor into a room, the tutorial, How to Play).
  full  anything else, including any file this list doesn't name. New files are full until
        someone adds them here.

Usage: change-scope.py <base-commit> <head-commit>
       change-scope.py --files a b c      (classify a list of paths, for checking the rules)
       change-scope.py --full             (everything; for runs started by hand)
With GITHUB_OUTPUT set, also writes scope, the browser job matrix, and the specs it runs.
"""
import fnmatch
import json
import os
import subprocess
import sys

# The browser jobs each scope gets. Full: every spec, split into shards.
BROWSER_MATRIX = {
    'full': [
        {'name': 'Chromium 1/3', 'project': 'chromium', 'shard': '1/3'},
        {'name': 'Chromium 2/3', 'project': 'chromium', 'shard': '2/3'},
        {'name': 'Chromium 3/3', 'project': 'chromium', 'shard': '3/3'},
        {'name': 'Safari 1/2', 'project': 'webkit', 'shard': '1/2'},
        {'name': 'Safari 2/2', 'project': 'webkit', 'shard': '2/2'},
    ],
    'site': [
        {'name': 'site pages, Chromium', 'project': 'chromium', 'shard': '1/1'},
        {'name': 'site pages, Safari', 'project': 'webkit', 'shard': '1/1'},
    ],
}
BROWSER_SPECS = {'full': '', 'site': 'site.spec.js'}

# A file matching one of these always needs the full suite, even if it also matches SITE_ONLY.
# These live next to the site pages but the game imports them, or they start a game.
GAME_EVEN_IF_UNDER_SITE = [
    'client/src/pages/seo/gameDraft*',        # the lobby and game setup read the drafts these save
    'client/src/pages/seo/TaskGenerator*',    # hands a task list straight into a new room
    'client/src/pages/seo/taskPools*',        # task lists the generator puts in a room
    'client/src/pages/seo/cleanupTasks*',
    'client/src/pages/seo/taskLocales/*',
]

# Files only the marketing site uses. "*" also matches "/" here, so a folder pattern covers
# everything under it.
SITE_ONLY = [
    # Writing that isn't code
    '*.md',
    'docs/*',
    # Marketing pages: home page, SEO pages and their translations, How to Play, About/FAQ/404
    'client/src/pages/landing/*',
    'client/src/pages/seo/*',
    'client/src/pages/howToPlay/*',
    'client/src/pages/info/*',
    # The header, footer and logo mark on site pages, and the site page stylesheet
    'client/src/components/SiteChrome.js',
    'client/src/components/SusMark.js',
    'client/src/styles/SitePage.css',
    # Page titles, descriptions and language links for site pages
    'client/src/seo/usePageMeta*',
    'client/src/seo/translatedPages.js',
    # Screenshots and images on the site pages
    'client/public/images/landing/*',
    'client/public/images/gameplay/*',
    # Icons, social preview image, crawl files
    'client/public/favicon.ico',
    'client/public/apple-touch-icon.png',
    'client/public/logo.svg',
    'client/public/logo192.png',
    'client/public/logo512.png',
    'client/public/manifest.json',
    'client/public/og-image.jpg',
    'client/public/robots.txt',
    'client/public/sitemap.xml',
    # Scripts that make site screenshots and icons, and the site checks the fast job runs
    'client/scripts/screenshots/*',
    'client/scripts/gen-brand-assets.js',
    'client/scripts/check-seo.js',
    'client/scripts/check-built-app.js',
    'client/e2e/site.spec.js',
]


def is_site_only(path):
    if any(fnmatch.fnmatchcase(path, p) for p in GAME_EVEN_IF_UNDER_SITE):
        return False
    return any(fnmatch.fnmatchcase(path, p) for p in SITE_ONLY)


def scope(paths):
    paths = [p for p in paths if p]
    if not paths:
        return 'full', []
    game = [p for p in paths if not is_site_only(p)]
    return ('full' if game else 'site'), game


def changed_files(base, head):
    out = subprocess.run(['git', 'diff', '--name-only', f'{base}...{head}'],
                         check=True, capture_output=True, text=True).stdout
    return out.splitlines()


def write_github_output(result):
    path = os.environ.get('GITHUB_OUTPUT')
    if not path:
        return
    with open(path, 'a') as f:
        f.write(f'scope={result}\n')
        f.write(f'matrix={json.dumps({"include": BROWSER_MATRIX[result]})}\n')
        f.write(f'specs={BROWSER_SPECS[result]}\n')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as f:
            f.write('Site-only change: the browser game suite is skipped; site pages are opened in Chromium and Safari.\n'
                    if result == 'site' else 'This change can affect the game, so the full browser suite runs.\n')


def main(argv):
    if argv[:1] == ['--full']:
        print('Running everything.', file=sys.stderr)
        write_github_output('full')
        print('full')
        return
    if argv[:1] == ['--files']:
        paths = argv[1:]
    elif len(argv) == 2:
        try:
            paths = changed_files(*argv)
        except subprocess.CalledProcessError as e:
            print(f'Could not list the changed files ({e.stderr.strip().splitlines()[0] if e.stderr.strip() else e}), running everything.', file=sys.stderr)
            write_github_output('full')
            print('full')
            return
    else:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    result, game = scope(paths)
    print(f'{len(paths)} changed files.', file=sys.stderr)
    if result == 'full':
        shown = game[:20]
        print('Full suite, because these files can affect the game:' if game else 'Full suite (no changed files found).', file=sys.stderr)
        for p in shown:
            print(f'  {p}', file=sys.stderr)
        if len(game) > len(shown):
            print(f'  ...and {len(game) - len(shown)} more', file=sys.stderr)
    else:
        print('Site-only change: skipping the browser game suite.', file=sys.stderr)
    write_github_output(result)
    print(result)


if __name__ == '__main__':
    main(sys.argv[1:])
