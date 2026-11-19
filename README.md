# sunandbean.github.io

Source for [sunandbean.com](https://sunandbean.com), a list of things I make.
Longer write-ups live on [sunbin.kim](https://sunbin.kim).

## How it works

- `projects.json` holds every card: title, kicker, description, three facts, image, links, and optional `stats`.
- `src/template.html` is the page shell. `public/` holds static files (404 page, icons, card images, CNAME).
- `scripts/build.mjs` renders `_site/` from those three. With `stats`, it adds GitHub stars (when above 0), Hugging Face downloads (when above 0) and the latest update date to the card.
- `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`, every Monday (to refresh the numbers), and on demand.
- `.github/workflows/check-links.yml` checks every link each Monday and opens or updates a `broken-links` issue when something breaks.

## Add a project

1. Put a 16:9 image in `public/assets/`.
2. Add an entry to `projects.json` (card order follows the array).
3. Preview with `node scripts/build.mjs` and open `_site/index.html` through any local server.
4. Push to `main`.

## Credits

Favicon: the sun emoji (U+2600) from [Noto Emoji](https://github.com/googlefonts/noto-emoji) by Google, used under the Apache License 2.0.
Analytics: Cloudflare Web Analytics, no cookies.
