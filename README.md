# KAVACH-REX — Prototype Site

Pure frontend demo of the KAVACH-REX case-file UI. No build step, no backend —
the pipeline is simulated in the browser (`script.js`).

## Run locally

Open `index.html` directly, or serve the folder:

```bash
npx serve site
```

## Deploy to Netlify

**Option A — drag & drop (fastest):** zip or drag the `site/` folder to
https://app.netlify.com/drop

**Option B — CLI:**

```bash
cd site
npx netlify-cli deploy --prod --dir .
```

**Option C — Git:** push the repo, set the site's base directory to `site/`
and leave the build command empty (publish directory is handled by `site/netlify.toml`).
