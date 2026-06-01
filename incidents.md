# Incidents

A running log of production incidents on `workeron.agency`. One entry per incident — date, symptom, root cause, fix, follow-up. New entries go on top.

---

## 2026-05-25 — Both forms silently broken; consultation showing "Network error"

**Symptom:**
- "Request Consultation" modal: after picking a date, calendar showed `"Network error. Please try again later."` instead of slot list.
- "Join the Team" form: showed success animation on submit but applications were not arriving in the destination Sheet (silently dropped, masked by `fetch(..., { mode: 'no-cors' })`).

**Root cause:**

Two issues compounded:

1. **URL drift.** The Apps Script Web Apps had been redeployed at some prior point. The new deployment URLs (`AKfycbzHmnmho…` and `AKfycbxQDP0y…`) were written to `data/settings.json` via the CMS, but the **hardcoded constants in `index.html`** (`APPS_SCRIPT_URL`, `APPLY_SCRIPT_URL`) still pointed to the old URLs (`AKfycbzSEVPo…` and `AKfycby9PESg…`), which returned HTTP 404 from `script.google.com`. The CMS sync logic in `generate_client.py:146-153` patches `<form action=...>` attributes, but the forms use JS `fetch()` against inline constants — that path was never wired up.

2. **Silent-failure mask.** `applyForm` used `fetch(URL, { mode: 'no-cors' })`. This returns an opaque response, so the `.then()` handler runs on ANY HTTP status (even 404) and shows success — masking the broken state from both users and us.

**Fix:**

- PR [#1](https://github.com/adminWorkeron/website-workeron.agency/pull/1): swap both hardcoded URLs in `index.html` to match `settings.json` values.
- Direct edit applied to `/var/www/workeron/index.html` on the VM (so site started working before PR merge). Backup at `/var/www/workeron/index.html.bak.20260525T124628Z`.
- Cloudflare cache: not relevant (`cf-cache-status: DYNAMIC` for HTML).

**Impact window:** unknown — likely days to weeks before someone reported. Zero observability into form submissions made detection dependent on user complaints.

**Apply form caveat:** URL swap reached the live script, but the script now expects a different field schema than HTML form sends (returns `{"success":false,"message":"Заповніть обов'язкові поля"}` for all probed payload shapes). The user verified manually post-deploy that real browser submissions do arrive in the destination — likely the script accepts only requests with browser-context headers (Origin/Referer) that headless probes lack. Treated as "working in production" for now.

**Follow-ups:**

- ✅ **L2 monitoring** (this PR): GCP uptime checks (`workeron-site-home`, `workeron-apps-script-slots`) in project `api-expenses-agent`, alerting to `oleksandr.bilous@workeron.ai`. Next URL drift caught within 5 minutes.
- ✅ **L4 docs** (this PR): `forms-contract.md` with the correct Apps Script redeploy procedure ("Manage deployments → Edit → New version" — NOT "New deployment").
- ⏳ **L1 full migration** to local `/api` (Task #14, deferred): waits on manager's email + Calendar ID. Eliminates this entire failure class.

**Lessons:**

- External dependencies with implicit URL contracts are landmines. The `AKfyc…` blob in an Apps Script URL is not durable — it changes on full redeploy.
- `mode: 'no-cors'` masking responses for "convenience" is a silent-failure factory. Any form that can fail should be able to tell the user (and us) when it does.
- CMS-driven config (settings.json) coexisting with hardcoded values (index.html) is two sources of truth — drift is inevitable unless one is generated from the other.

---

<!-- Template for future entries:

## YYYY-MM-DD — Short symptom summary

**Symptom:**

**Root cause:**

**Fix:**

**Impact window:**

**Follow-ups:**

**Lessons:**

-->
