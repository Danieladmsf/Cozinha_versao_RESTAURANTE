# Architecture & Data Flow Update

## Context
The project has transitioned from a direct Local API -> Client Portal connection to a cloud-synchronized architecture using Firebase. This document outlines the changes, the automated sync process, and the data structure improvements.

## 1. Architecture Change
- **Previous State**: The Client Portal requested data directly from a local API running on this machine.
  - *Issues*: Requires direct connectivity, firewall handling, and local machine uptime dependency for every request.
- **Current State**: A local Node.js agent (`SCRIPTS/sync-vr-to-firebase.js`) actively pushes data to Firebase Firestore (`vr_sales_sync` collection). The Client Portal now reads from Firebase.
  - *Benefits*: Decoupling. The portal works even if the local machine is temporarily offline (viewing last synced data).

## 2. Automation (The "Impasse")
- **Issue**: Previously, the Firebase update wasn't running automatically, leading to stale data.
- **Resolution**: The `sync-vr-to-firebase.js` script now includes a `setInterval` loop (every 10 seconds) and is designed to run continuously as a background service.
  - *Status*: The configuration error (`MODULE_NOT_FOUND`) preventing startup has been fixed.

## 3. Data Structure (Daily Breakdown)
- **Issue**: The previous sync logic aggregated sales into a single "total" over a period, ignoring day-by-day granularity. This made it impossible to see sales per specific day in the portal.
- **Resolution**: The sync logic has been refactored (aligned with the upstream changes):
  - It now builds a `daily` object for each product:
    ```json
    {
      "codigo": 123,
      "daily": {
        "2023-10-01": 5,
        "2023-10-02": 3
      },
      "quantidade_total": 8
    }
    ```
  - This structure allows the frontend to display sales for specific dates correctly, rather than just a lump sum.

## Next Steps
- Verify that `SCRIPTS/sync-vr-to-firebase.js` is running in your terminal to keep Firebase updated.
