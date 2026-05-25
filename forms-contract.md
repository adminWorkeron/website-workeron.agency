# Forms Contract

Operational reference for the two HTML forms on `https://workeron.agency/`. Read this **before** redeploying any Apps Script, editing form URLs, or changing payload schema.

## Forms on the site

| Form | DOM id | Modal trigger | Backend type |
|------|--------|--------------|--------------|
| Request Consultation | `consultInfoForm` (step 1) + `confirmBookingBtn` (step 3) | "Request Consultation" buttons in contact section / hero | Google Apps Script Web App (consultation script) |
| Join the Team | `applyForm` | "Join the Team" buttons in careers section | Google Apps Script Web App (apply script) |

## Endpoints

Both URLs are **hardcoded as JS constants** in `index.html` (search `APPS_SCRIPT_URL` and `APPLY_SCRIPT_URL`). They are also stored in `data/settings.json` (`consultationFormUrl`, `applyFormUrl`) — but **the runtime path is the hardcoded constant**, not the JSON value. The two MUST be kept in sync manually until L1 migration to `/api`.

| Constant in index.html | Same key in settings.json | Used for |
|------------------------|---------------------------|----------|
| `APPS_SCRIPT_URL` | `consultationFormUrl` | `?action=slots&date=...` (GET) + `{action:"book", ...}` (POST) |
| `APPLY_SCRIPT_URL` | `applyFormUrl` | apply submission (POST) |

## Payload schema

### Consultation booking (POST APPS_SCRIPT_URL)

Content-Type: `text/plain;charset=utf-8` (intentionally — avoids CORS preflight on Apps Script).

```json
{
  "action": "book",
  "name": "string",
  "email": "string (RFC 5322)",
  "message": "string (optional)",
  "date": "YYYY-MM-DD",
  "startTime": "HH:mm"
}
```

Response shape:
```json
{"success": true} | {"success": false, "error": "..."}
```

### Slot query (GET APPS_SCRIPT_URL)

`GET {APPS_SCRIPT_URL}?action=slots&date=YYYY-MM-DD`

Response:
```json
{"date":"YYYY-MM-DD","slots":[{"start":"HH:mm","end":"HH:mm","iso":"..."}]}
```

Empty `slots` array is valid (no availability that day).

### Apply (POST APPLY_SCRIPT_URL)

Content-Type: `application/json` (current behavior; `mode: 'no-cors'` suppresses CORS).

Payload (browser-derived from form fields):
```json
{
  "name": "string",
  "email": "string",
  "role": "string (one of dropdown options)",
  "linkedin": "string (optional URL)",
  "timestamp": "ISO 8601"
}
```

Response: opaque from browser due to `mode: 'no-cors'`. Server logic returns `{success: true|false, message: ...}` JSON in body, but the page can't read it. **Known limitation**: any backend error appears as success in UI.

## Ownership & access

- Apps Script projects: owned by the `admin@workeron.agency` Google account (footer email). Source code lives in Google Apps Script editor — NOT in this repo.
- GCP project hosting workeron.agency VM: `webite-workeron-agency` (Cloud DNS, Compute Engine instance `workeronagency`).
- Cloudflare zone: `workeron.agency` — `cf-cache-status: DYNAMIC` for HTML, no CF cache.
- Monitoring (uptime checks + alerts): GCP project `api-expenses-agent`. Notification channel `api-expenses alert email` → `oleksandr.bilous@workeron.ai`.

## How to redeploy an Apps Script **without breaking the site**

The trap: clicking "New deployment" in Apps Script generates a **new URL** (the long `AKfyc…/exec` blob changes). If you do this, the hardcoded constants in `index.html` will keep calling the old URL → 404 → broken form.

**Correct procedure** (preserves URL):

1. Open the Apps Script project in https://script.google.com.
2. Top-right → **Deploy** → **Manage deployments**.
3. Find the existing Web App deployment in the list.
4. Click the pencil (edit) icon next to it.
5. Under "Version", select **New version**.
6. Click **Deploy**.
7. The URL stays the same. Your changes are live.

**Wrong procedure** (changes URL — avoid):

- Deploy → **New deployment** → creates a fresh Web App with a new URL.

If you accidentally did "New deployment":

1. Either delete the new one and re-edit the existing deployment.
2. OR update `index.html` (search and replace both URL constants) AND `data/settings.json` (`consultationFormUrl`, `applyFormUrl`).
3. Verify locally before committing: see [Verification](#verification) section.

## Verification (manual — after any URL or schema change)

```bash
# 1. GET slots — must return JSON, status 200
node -e '
fetch("https://script.google.com/macros/s/AKfycbzHmnmho93fEV0XAmN0ZM0zMyA596O9aQiBf5W8T4ssKxuubtQCtO3chGpxY2sl5xMETw/exec?action=slots&date=2026-12-31")
  .then(r => r.json())
  .then(d => console.log("slots count:", d.slots?.length ?? "ERROR", d.error || ""));
'

# 2. Make sure URL in index.html matches what you expect
grep -n "APPS_SCRIPT_URL\|APPLY_SCRIPT_URL" index.html | head -2

# 3. After deploying to VM, hard-refresh https://workeron.agency/, open
#    Request Consultation modal, click any future date, verify slots load
#    (not "Network error. Please try again later.").
```

⚠️ **Do NOT verify with curl alone.** curl's default redirect handling on Apps Script's POST→302→echo flow can produce false 405 errors that don't reflect real browser behavior. Use Node fetch or the browser DevTools.

## Monitoring (L2 — synthetic uptime checks)

Two uptime checks in GCP project `api-expenses-agent`:

| Check name | What it probes | Alert policy |
|-----------|----------------|--------------|
| `workeron-site-home` | `GET https://workeron.agency/` — matches "Request Consultation" in body | `workeron.agency site uptime` |
| `workeron-apps-script-slots` | `GET {APPS_SCRIPT_URL}?action=slots&date=2026-12-31` — matches `"slots":` in body | `workeron.agency Apps Script slots endpoint` |

Both 5-min period, both alert to `oleksandr.bilous@workeron.ai` via existing `api-expenses alert email` notification channel.

**If you redeploy Apps Script and the URL changes**, also update `workeron-apps-script-slots` uptime check:

```bash
gcloud monitoring uptime update workeron-apps-script-slots-Nk8fJgDE6BA \
  --project=api-expenses-agent \
  --path="/macros/s/<NEW_URL_PATH>/exec?action=slots&date=2026-12-31"
```

(otherwise the check will keep alerting on the old URL = false-positive alert spam.)

## Long-term plan

This Apps Script setup is **transitional**. The plan is to migrate both forms to a local `/api` in `server.js` so URLs can't drift, schema is owned by us, and silent-failure is impossible. See [incidents.md](incidents.md) and the `feature/local-form-api` branch (PR #1) for details.
