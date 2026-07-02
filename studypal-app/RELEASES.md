# StudyPal App — Release History

## Project Info
- **Expo project:** https://expo.dev/accounts/kiprotichlevy/projects/studypal-app
- **Project ID:** 3e16ba97-2ec3-4aae-8e70-edd841d588b1
- **Owner:** kiprotichlevy
- **Package:** com.studypal.app

---

## How to release a new version

### Step 1 — Bump the version numbers (2 files)

**`studypal-app/constants/index.ts`**
```ts
export const APP_VERSION = '1.1.0';   // ← new version string
export const APP_VERSION_CODE = 2;    // ← increment by 1 every release
```

**`studypal-app/app.json`**
```json
"version": "1.1.0",
"versionCode": 2
```

### Step 2 — Build the new APK

```bash
cd studypal-app
npx eas build -p android --profile preview
```

EAS builds it in the cloud (~10-15 min). When done you get a download link like:
`https://expo.dev/accounts/kiprotichlevy/projects/studypal-app/builds/<BUILD_ID>`

### Step 3 — Update the version API (web)

Edit `app/api/app/version/route.ts`:

```ts
const CURRENT_RELEASE = {
  latestVersion: '1.1.0',        // ← new version string
  latestVersionCode: 2,           // ← must match APP_VERSION_CODE in the app
  downloadUrl: 'https://expo.dev/accounts/kiprotichlevy/projects/studypal-app/builds/<NEW_BUILD_ID>',
  releaseNotes: '• Fixed X\n• Added Y\n• Improved Z',
  mandatory: false,               // ← set true to force all users to update
};
```

### Step 4 — Update the landing page (web)

Edit `app/page.tsx` (top of file):
```ts
const LATEST_VERSION = '1.1.0';
const APK_URL = 'https://expo.dev/accounts/kiprotichlevy/projects/studypal-app/builds/<NEW_BUILD_ID>';
```

### Step 5 — Deploy

```bash
git add .
git commit -m "release: v1.1.0"
git push
```

Vercel auto-deploys. All app users will see the update banner next time they open the app.

---

## Version Log

| Version | Code | Build ID | Date | Notes |
|---------|------|----------|------|-------|
| 1.0.0 | 1 | 6815f51f-527d-464a-aee6-547d3a70eeb0 | 2026-07-01 | Initial release |
| 1.1.0 | 2 | 5fb6e2e2-ed3e-44e4-a50b-d22bce6e13e2 | 2026-07-02 | Fix offline viewer, downloads naming, marketplace notices, update notifications |
