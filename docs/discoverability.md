# Discoverability checks

The public pages contain task examples, setup instructions, and links to a usable task generator.
The generator transfers its exact list into host setup through first-party session storage.
The host imports the list through the existing task-list API.

## Search Console

1. Open [Google Search Console](https://search.google.com/search-console).
2. Select the existing property for susparty.com.
3. If no property exists, add a Domain property for susparty.com.
4. Complete the DNS verification step through the domain provider.
5. Submit https://susparty.com/sitemap.xml in Sitemaps.
6. Inspect the homepage and the three Among us IRL resource pages.
7. Open Performance, then compare equal date ranges.
8. Review Queries and Pages for impressions, clicks, and click-through rate.
9. Check high-impression queries that receive few clicks.
10. Match each page title and introduction to its actual useful answer.

Search Console access and DNS changes require access to the owner accounts.
The repository does not contain these credentials.
Use the [Google report guide](https://support.google.com/webmasters/answer/17010961?hl=en) for query and page filters.

## Source counts

Open /dashboard with the configured admin password.
Read the Discovery → playable games table.
Compare rooms created with rooms that start a round with at least three players.
Use the source and entry page to find the pages that produce playable games.
Export a snapshot before each content release to compare counter changes across equal periods.

The server stores aggregate counters in server/stats.json.
The deploy workflow excludes stats.json and its temporary write file from rsync cleanup.
Source counts begin with this release. Earlier records lack source metadata.
The counters describe rooms and rounds, rather than unique people.
A room contributes once to Rooms that start. Replays contribute to Rounds started.
No referrer includes bookmarks, untagged app shares, and links that omit the referrer.
Unknown includes old clients and unavailable browser storage.
The server accepts only known source categories and public page paths.
It does not store raw referrer URLs or query parameters for these counters.

## Real-game demo

1. Record a short setup and task example at your next game.
2. Get permission from people before you publish identifiable footage.
3. Show the physical task, phone controls, and meeting flow.
4. Link the demo to the task generator.
5. Tag the source with a supported utm_source value.

Example: https://susparty.com/among-us-irl-task-generator?venue=house&players=8&utm_source=instagram

Supported tags: google, bing, chatgpt, facebook, instagram, snapchat, reddit, youtube, shared-link, other.
The generator also supplies a Copy setup link action for venue, areas, players, movement, and task style.
It shares settings, rather than a private saved task list or live room.

## Crawl checks

Keep public guides in prerendered HTML.
Make sure that each page contains one H1, an accurate title, a canonical URL, and useful internal links.
Keep /play and /dashboard excluded in robots.txt.
Run npm run build from client, then run node scripts/check-built-app.js.
Read the generated page HTML before a release.

Google AI search uses the same SEO foundations and requires no special AI file or schema.
See [Google AI search guidance](https://developers.google.com/search/docs/appearance/ai-features).
ChatGPT search uses OAI-SearchBot.
The wildcard public-page allowance in robots.txt permits this crawler.
See [OpenAI crawler guidance](https://developers.openai.com/api/docs/bots).
