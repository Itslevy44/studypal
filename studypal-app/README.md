# StudyPal — React Native App

Android app built with Expo + Expo Router. Uses the StudyPal Next.js backend API.

## Setup

```bash
cd studypal-app
npm install
```

## Configuration

Edit `constants/index.ts` and set:
```ts
export const API_BASE_URL = 'https://your-deployed-url.vercel.app';
```

Edit `app.json` and replace:
- `"YOUR_PROJECT_ID"` → your Expo project ID (from `npx eas init`)
- `"YOUR_EXPO_USERNAME"` → your Expo account username

## Build APK (EAS Cloud — no Java needed locally)

### 1. Login to Expo
```bash
npx eas login
```

### 2. Initialize EAS for this project (first time only)
```bash
npx eas init
```
This creates a project on expo.dev and fills in your project ID.

### 3. Build the APK
```bash
npx eas build -p android --profile preview
```
- EAS builds it in the cloud (~10-15 min)
- You get a download link for the `.apk` file
- Share that link on your website

### 4. Production AAB (for Google Play)
```bash
npx eas build -p android --profile production
```

## Update System

When you release a new version:
1. Bump `APP_VERSION` and `APP_VERSION_CODE` in `constants/index.ts`
2. Bump `version` and `versionCode` in `app.json`
3. Build new APK with EAS
4. Update `app/api/app/version/route.ts` in the web project with the new version info and APK URL
5. Users will see an in-app update prompt automatically

See `RELEASES.md` for the full release checklist.

## Project Structure

```
studypal-app/
├── app/
│   ├── _layout.tsx          Root layout + auth provider
│   ├── index.tsx            Auth redirect
│   ├── (auth)/              Login + Register screens
│   └── (app)/               Main app tabs
│       ├── _layout.tsx      Tab bar + update banner
│       ├── dashboard.tsx    Home screen
│       ├── papers.tsx       Browse & download papers
│       ├── marketplace.tsx  Marketplace + notices
│       ├── downloads.tsx    Offline downloaded papers
│       └── profile.tsx      Profile + settings + update check
├── components/
│   ├── UpdateBanner.tsx     In-app update modal
│   ├── MpesaModal.tsx       M-Pesa payment sheet
│   └── ui/                  GradientButton, Input, Card, Badge
├── constants/index.ts       API URL, version, colors, tokens
├── context/AuthContext.tsx  Auth state + JWT management
├── lib/
│   ├── api.ts               All API calls
│   ├── storage.ts           AsyncStorage wrappers
│   └── useUpdateChecker.ts  Version polling + update logic
└── RELEASES.md              Release checklist
```
