# Pickle Time (GitHub-only version)

Hosted entirely on GitHub: **GitHub Pages** serves the site, **GitHub Actions** confirm bookings, and `data/bookings.json` is the database.

## Setup
1. Create a **public** repo (e.g. `pickle-time`) and upload everything in this folder (keep `.github/` and `data/`).
2. Repo **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
3. Repo **Settings → Actions → General → Workflow permissions** → *Read and write permissions* → Save.
4. Repo **Settings → General → Features**: make sure **Issues** is ticked.
5. Open `https://<username>.github.io/<repo>/` (admin: `.../admin.html`).

## Admin sign-in
Create a fine-grained token (GitHub → Settings → Developer settings → Fine-grained tokens), only for this repo, **Contents: Read and write**. Paste it on the admin page.

## How booking works
Customer picks hours → the site opens a pre-filled GitHub issue → customer presses *Submit new issue* → the Action validates it, saves it to `data/bookings.json`, comments the reference and closes the issue.
Customers need a free GitHub account, and name/phone are visible in the (public) issue.
