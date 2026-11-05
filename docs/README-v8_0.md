# Find My Way: Southampton General Hospital, RouteLoop v8.0

For the Superspree tech team. Written by the RouteLoop build team on 5 November 2026.

## What this is

v8.0 of the Southampton General Hospital wayfinding app, made by Superspree. It covers Levels A to G, every device start on the hospital's master list, and every public lift lobby and entrance.

It is a **static site**. There is no build step on the host and no database. It is hosted as v7.9 was: a GitHub repository deployed by Railway, with a small Node file server. The same site files also serve as they are on GitHub Pages.

## What is in this zip

| Path | What it is |
|---|---|
| `server.js`, `package.json`, `railway.json` | The Railway web server, unchanged since v7.8: Node 20 or later, no packages. It serves the files in `public/` and nothing else. |
| `public/index.html` | The page. It loads the app and shows a short loading screen until the app starts. |
| `public/404.html` | A copy of `index.html`, for GitHub Pages: a mistyped address still opens the app. |
| `public/.nojekyll` | An empty file. It stops GitHub Pages running Jekyll, which would otherwise skip some files. |
| `public/sgh-v7_8-app.min.js` | The app, compiled (React included). The file name is the one the page has always loaded; the page loads it as `sgh-v7_8-app.min.js?v=8.0`, and the build name inside is **v8.0**. |
| `public/routes/sgh-routes-<CODE>.json` | The directions, one file per start (77 files). The app fetches only the file for the start in use. |
| `public/routes_back/sgh-back-<CODE>.json` | The routes back, one file per destination (226 files), for the "Route back to where you started" button on the arrival screen. |
| `docs/README-v8_0.md` | This file. |
| `docs/sgh-v8_0-device-tag-register.csv` | The device tag register: **the only source for programming tags** (see "The tag addresses"). |
| `MANIFEST.md5` | The md5 of every other file in this zip. Check it with `md5sum -c MANIFEST.md5` after you unpack. |

**`docs/` is for you, not for the site. Never publish it.** It holds this README and the device register. Only the contents of `public/` are the site.

## Where to put it

**Railway (as v7.9):** put `server.js`, `package.json`, `railway.json` and the `public/` folder at the root of the GitHub repository behind the Railway service, exactly as they are in this zip. Do not commit `docs/`. Railway runs `node server.js` (from `railway.json`) on each commit. The deploy log ends with the server's "listening" line, giving the number of files it serves.

**GitHub Pages:** copy the **contents of `public/`** (not the folder itself, and not `docs/`) to the folder Pages serves: the repository root, the repository's `docs/` folder if Pages is set to serve from there, or a project sub path such as `https://<org>.github.io/<repo>/`. `server.js`, `package.json` and `railway.json` are not needed on Pages.

Every address in the page and in the app is relative (`sgh-v7_8-app.min.js`, `routes/...`, never `/routes/...`), so the site works in any of these places with no change. Keep `routes/` and `routes_back/` as folders next to `index.html`.

## HTTPS

Tag URLs must be written as `https://`. Railway serves HTTPS by default. On GitHub Pages, tick "Enforce HTTPS"; with a custom domain, wait until its certificate is issued before any tag is written. Read aloud and the feedback sending expect a secure page.

## How each host serves the files

| | Railway (`server.js`) | GitHub Pages |
|---|---|---|
| Caching | Every file is sent "no-cache" with an ETag: phones check for a new version on every open, so a new upload is seen at once. | Files may be cached for about 10 minutes. After an upload, wait 10 minutes (or reload the page) before testing. |
| An address with no file ending (for example `/wrong?tag=CC380`) | Serves the app (`index.html`). | Serves `404.html`, which is the app, one folder deep. Two or more folders deep it stays on the loading screen. |
| A missing file with an ending (for example a route file) | 404 "Not found"; the app shows "Directions did not load". | 404. |
| Other methods | Only GET and HEAD; anything else gets 405. | As Pages does. |

The page loads the app as `sgh-v7_8-app.min.js?v=8.0`, so a phone that cached an earlier app file fetches this one. The next version changes `v=` the same way.

## The tag addresses

**Programme every tag from the "tag URL" column of `docs/sgh-v8_0-device-tag-register.csv`, as it stands, replacing only `<host>` with the site address (for example `https://<your site>`).** Do not build a tag address from the Location Code column or from the device list spreadsheet: for 5 devices they differ (UK-SGH-022 is `?tag=WF1`, not WF10; UK-SGH-074 to 077 have placement words in their Location Code, not a code).

Each address has this form:

```
https://<your site>/?tag=EC197&d=UK-SGH-001
```

- `tag` is where the app opens. A tag that is a start opens at that start. A tag with no start of its own opens at the nearest start named in the register (the app's `TAG_FALLBACK`).
- `d` is the Superspree Device Allocation Code. It changes nothing on screen; the app carries it into the feedback rows (the Sheet's "device" column). **Always write `&d=`**: four tag codes are shared by more than one device (CC381, NA001, OB8 and CC390), and `d` is the only thing that tells those devices apart.
- An unknown tag does not show a message. The app resumes a journey from the last 30 minutes in that browser tab if there is one; otherwise it opens at the Main Entrance.

Example: `?tag=EC197&d=UK-SGH-001` is the device at Acute Oncology (MAOS). It opens at the East Wing Lift Lobby on Level C.

## Feedback (the three faces and the comment box)

When someone finishes a journey, the app sends the three faces answer and the "How were these directions?" comment straight from the phone to a Google Sheet, through a small Apps Script web app.

**This is live in this build.** The app carries the web app address of the Sheet Stu set up on 5 November.

- One rating row is sent per arrival: the first face tapped.
- A comment needs text: "Send feedback" stays off until something is typed.
- A send that fails is silent; the person sees the same thank you.
- **The address is built into the app.** A new Apps Script deployment ("New deployment") gives a new address, and the app keeps sending to the old one until the app is rebuilt with the new address in `FEEDBACK_SHEET_URL`. The RouteLoop team does that rebuild and sends a new `public/sgh-v7_8-app.min.js`; only that file changes. To change the script without changing the address, edit the current deployment instead (Deploy, Manage deployments, New version).

## Checks after you deploy

- `md5sum -c MANIFEST.md5` reports every file OK.
- The site address opens over `https://`, shows the loading screen and then the app.
- `https://<your site>/routes/sgh-routes-CC380.json` opens as JSON (a wrong web root shows the loading screen for ever).
- `?tag=CC380` opens at the Main Entrance, and `?tag=CFL0` opens at the West Wing Lift Lobby on Level F.
- A route works: from the Main Entrance to Radiotherapy Reception, the cards run through to the arrival card.
- One full register address with `&d=` (for example UK-SGH-001's) leads to a feedback row in the Sheet with the device code filled in.
