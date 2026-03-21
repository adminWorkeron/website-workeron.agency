# Workspace: Request Consultation Website Form

## Overview
This workspace handles the backend logic for the Workeron.ai consultation booking form. It integrates directly with the Google Calendar of `sales@workeron.ai`.

## Backend API Configuration
The "API" for the website is the **Web App URL** generated after deploying the Google Apps Script.

### Credentials
- **Account:** sales@workeron.ai
- **Calendar ID:** `primary` (Primary calendar of the sales account)

### Deployment Settings
- **Execute as:** Me (sales@workeron.ai)
- **Who has access:** Anyone (Required for the website form to send data)

## Usage
1. Open the project in [script.google.com](https://script.google.com).
2. Create a new project named **"Workeron Booking"**.
3. Paste the content of `booking.gs`.
4. Click **Deploy** -> **New Deployment**.
5. Select type **Web App**.
6. Set Description: `v1`.
7. Set "Execute as": **Me**.
8. Set "Who has access": **Anyone**.
9. Copy the generated **Web App URL**.
10. Insert this URL into `index.html` at the `APPS_SCRIPT_URL` constant.
