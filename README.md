# Farm Manager — Mobile App (React Native / Expo)

This is the iPad companion app for your existing Flask farm management system.  
It requires **no new backend endpoints** — every page and form is rendered directly from the same Flask server you already run.

---

## Table of Contents

1. [How it works](#1-how-it-works)
2. [Prerequisites](#2-prerequisites)
3. [Project setup](#3-project-setup)
4. [Configure the backend URL](#4-configure-the-backend-url)
5. [Share with Expo Go](#5-share-with-expo-go)
6. [Regenerate branding assets](#6-regenerate-branding-assets)
7. [Build a shareable Expo preview app](#7-build-a-shareable-expo-preview-app)
8. [Share and install the preview build](#8-share-and-install-the-preview-build)
9. [App features](#9-app-features)
10. [Troubleshooting](#10-troubleshooting)
11. [Security notes](#11-security-notes)

---

## 1. How it works

```
iPad  ──►  Farm Manager app (React Native)
                │
                │  HTTP / HTTPS   (your local network or internet)
                ▼
       Flask server (your existing farm_app)
       All routes stay exactly the same.
```

The mobile app is a thin native shell that:
- Opens your existing Flask pages inside a **WebView** (the same web pages running in a browser today).
- Stores the **login session cookie** so you stay logged in across opens.
- Adds **Face ID / Touch ID** unlock before the screen is shown.
- Shows an **offline banner** when the iPad has no network.
- Provides **Back / Forward / Refresh** navigation buttons and one-tap **quick links** to core sections.

Nothing changes on the Flask backend.

---

## 2. Prerequisites

You need all of the following before you begin.

### On your computer (Windows / Mac / Linux)

| Tool | How to install | Why it's needed |
|---|---|---|
| **Node.js 20+** | https://nodejs.org — choose LTS | Runs Expo and build tools |
| **npm 10+** | Comes with Node.js | Package management |
| **Expo CLI** | Installed automatically by `npx` | No separate install needed |
| **EAS CLI** | `npm install -g eas-cli` | Builds the app binary in Expo's cloud |
| **Git** | https://git-scm.com | Version control (recommended) |

### Apple account

You need a **paid Apple Developer account** ($99 USD / year) to build and install iOS apps outside the App Store.  
Sign up at: https://developer.apple.com/programs/

> If you only want to test via **Expo Go** (method in section 5), you do **not** need an Apple Developer account.  
> An Apple Developer account is only required for iPhone/iPad builds. Android preview builds can be shared as an `.apk` without an Apple account.

### Flask server running

Your existing Flask server must be running and reachable from the iPad over the network before you open the app.  
The iPad and the computer running Flask must be on the **same Wi-Fi network** (or the Flask server must have a public internet address).

---

## 3. Project setup

Open a terminal, navigate to this folder, and install dependencies:

```bash
cd farm_mobile
npm install
```

This installs React Native, Expo, WebView, biometric auth, and all other packages listed in `package.json`.

---

## 4. Configure the backend URL

The app needs to know the address of your Flask server.

### Option 1: Local Network Access

**Step 1 — Find your computer's local IP address**

On Windows, open Command Prompt and run:
```
ipconfig
```
Look for `IPv4 Address` under your Wi-Fi adapter. It will look like `192.168.1.XXX`.

On Mac/Linux:
```bash
ifconfig | grep "inet "
```

**Step 2 — Create a `.env` file**

Copy the example file:
```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Open `.env` in any text editor and replace the IP with yours:

```
EXPO_PUBLIC_FARM_WEB_URL=http://192.168.1.42:5000/login
```

> Important rules:
> - Use your computer's IP address, **not** `localhost` or `127.0.0.1` — those refer to the iPad itself, not your computer.
> - Include the port (`5000` by default for Flask).
> - Include `/login` at the end so the app opens the login page first.

### Option 2: Public Internet Access (Recommended for Mobile Deployment)

For deploying the app to iPads not on your local network, make your Flask server accessible over the internet using Cloudflare Tunnel (free, unlimited alternative to ngrok).

**Step 1 — Install Cloudflare Tunnel**

Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/
Or using Chocolatey: `choco install cloudflared`

**Step 2 — Authenticate with Cloudflare**

```bash
cloudflared tunnel login
```
- This opens your browser for login (create a free Cloudflare account if needed).

**Step 3 — Create and Start Tunnel**

```bash
ssh -R 80:localhost:5000 serveo.net
```
- This immediately gives you a free URL like `https://abc123.serveousercontent.com`
- Keep this command running to maintain the tunnel.

**Alternative: Cloudflare Tunnel**

If you prefer Cloudflare:
```bash
cloudflared tunnel login
cloudflared tunnel create farm-backend
cloudflared tunnel run --url http://localhost:5000 farm-backend
```
- This provides a URL like `https://abc123.cfargotunnel.com`

**Step 4 — Update .env file**

Use the tunnel URL:
```
EXPO_PUBLIC_FARM_WEB_URL=https://abc123.cfargotunnel.com/login
```

**Step 3 — Start your Flask server**

In the `farm_app` folder, make sure Flask is running:
```bash
python run.py
```

Leave it running. The mobile app connects to it live.

---

## 5. Share with Expo Go

This is the fastest way to let someone see the app without building an `.apk` or `.ipa`. The other person only needs the **Expo Go** app. No Apple Developer account is needed.

> This is not a standalone app build. Expo Go runs the app from your computer while the Expo dev server is open. Keep the terminal running while the other person is testing.

### Same Wi-Fi network

Use this when your computer and the phone/tablet are on the same Wi-Fi:

```bash
npm start
```

or:

```bash
npm run start:lan
```

Expo shows a QR code in the terminal or browser. On iPhone/iPad, open the Camera app and scan the QR code. On Android, open Expo Go and scan it from inside the app.

### Different network or remote tester

Use this when you want to send the Expo Go link to someone who is not on your Wi-Fi:

```bash
npm run share:expo-go
```

This runs `expo start --tunnel`. Expo creates a tunnel and shows a QR code plus an `exp://...` link. Send the QR code or link to the tester. They open it on a phone/tablet that has Expo Go installed.

On Windows PowerShell, if `npx` is blocked by the execution policy, use the npm scripts above instead of typing `npx expo ...` directly.

### Backend URL for Expo Go sharing

Before sharing, make sure `.env` points to a backend URL the tester's device can reach:

```bash
EXPO_PUBLIC_FARM_WEB_URL=https://your-public-server-or-tunnel-url/login
```

For a remote tester, a local IP like `192.168.x.x` usually will not work. Use a public HTTPS URL, Cloudflare Tunnel, Serveo, ngrok, or a deployed server.

If you change `.env`, stop Expo with `Ctrl+C` and start it again so the new URL is included.

> Expo Go is perfect for quick review/testing. Use section 7 only when you want a real installable app outside Expo Go.

---

## 6. Regenerate branding assets

The icon, splash screen, and favicon are auto-generated from the script in `scripts/generate-assets.js`.  
If you want to customise the colours or shapes, edit that script and then run:

```bash
npm run generate-assets
```

This overwrites the files in `assets/` with your updated versions. The generated PNGs are:

| File | Size | Used for |
|---|---|---|
| `assets/icon.png` | 1024×1024 | App icon on the iPad home screen |
| `assets/adaptive-icon.png` | 1024×1024 | Android adaptive icon (not used on iPad) |
| `assets/splash-icon.png` | 1284×2778 | Image shown while the app loads |
| `assets/favicon.png` | 192×192 | Icon in web browsers |

---

## 7. Build a shareable Expo preview app

Expo EAS Build creates a real installable app in Expo's cloud. You do **not** need a Mac for the build itself.

For the easiest sharing path, build Android first. The `preview` profile creates an `.apk`, which you can send to someone as a link. For iPhone/iPad, Apple requires the tester's device to be registered first unless you use TestFlight.

### Step 1 - Install dependencies

```bash
npm install
```

### Step 2 - Log in to Expo

If you do not have an Expo account, create one at https://expo.dev/signup.

```bash
npx eas login
```

On Windows PowerShell, if `npx` is blocked by the execution policy, run `npx.cmd eas login` instead.

### Step 3 - Confirm the backend URL

Before building, make sure `.env` points to a URL the other person can reach:

```bash
EXPO_PUBLIC_FARM_WEB_URL=https://your-public-server-or-tunnel-url/login
```

For someone outside your Wi-Fi network, do not use `localhost` or a local IP like `192.168.x.x`. Use a public HTTPS URL, Cloudflare Tunnel, Serveo, ngrok, or a deployed server.

### Step 4 - Build an Android APK to share

```bash
npm run build:preview:android
```

This runs:

```bash
eas build -p android --profile preview
```

When the build finishes, Expo gives you a URL and QR code. Send that link to the tester. On Android, they can download and install the `.apk` directly. They may need to allow installing apps from their browser.

### Step 5 - Build an iOS preview for a registered iPhone/iPad

Apple requires each iPhone or iPad to be registered before it can install an internal `.ipa`.

Register the tester's device:

```bash
npx eas device:create
```

On Windows PowerShell, if `npx` is blocked, run `npx.cmd eas device:create` instead.

Then build:

```bash
npm run build:preview:ios
```

This runs:

```bash
eas build -p ios --profile preview
```

The `preview` profile uses internal distribution. EAS will help create the Apple certificate and provisioning profile the first time you build. When the build completes, share the Expo build URL with the tester. The install only works on devices that were registered before the build was created.

### Optional - Production store builds

Use these only when you are ready to publish through Google Play or the Apple App Store:

```bash
npm run build:production:android
npm run build:production:ios
```

---

## 8. Share and install the preview build

### Android

1. Open the completed build on https://expo.dev.
2. Copy the build URL or download the `.apk`.
3. Send the URL or `.apk` to the tester.
4. The tester opens it on their Android device and installs it.

### iPhone/iPad with EAS internal distribution

1. Register the tester's device with `npx eas device:create`.
2. Run `npm run build:preview:ios` after the device is registered.
3. Open the completed build on https://expo.dev.
4. Send the install URL to the tester.
5. The tester opens the link in Safari on the registered device and follows the install prompts.

If the install fails, the most common reason is that the device was not registered before the build. Register it, then create a new iOS preview build.

### iPhone/iPad with TestFlight

TestFlight is better when you want to share with more iOS testers without registering every UDID manually.

1. Create the app in App Store Connect using bundle ID `com.farm.mobile`.
2. Build a production iOS app with `npm run build:production:ios`.
3. Upload the build to App Store Connect.
4. Add testers in the TestFlight tab.

Internal TestFlight testers must be added to your App Store Connect team. External testers and public links usually require Apple's beta review before people can install the app.

> TestFlight builds expire after 90 days, but you can upload a new build any time.

---

## 9. App features

All features below work on top of your existing Flask server with **no backend changes**.

| Feature | Description |
|---|---|
| **Biometric unlock** | When you open the app, Face ID or Touch ID is required before the screen is shown. Falls back silently if biometrics are not enrolled on the device. |
| **Session cookies** | Logging in through the app stores the session cookie natively. You stay logged in across app restarts, just like a browser with "Remember Me". |
| **Offline banner** | If the iPad loses Wi-Fi, a yellow banner appears at the top so you know the server is unreachable. |
| **Back / Forward** | Tap these to navigate through page history without a browser address bar. |
| **Refresh** | Forces the current page to reload from the server. |
| **Quick links** | One tap takes you to Dashboard, Animals, Breeding, or Users — no need to navigate menus. |
| **Pull to refresh** | On iOS, swipe down on any page to reload it. |
| **External links** | Tapping any link that goes outside your Flask server opens it in Safari, keeping the app clean. |
| **Error screen** | If the server is unreachable, a clear error message and a **Retry** button are shown instead of a blank screen. |
| **iPad layout** | Orientation is unlocked so the app works in both portrait and landscape on any iPad model. |

### Role-based access

The mobile app inherits your Flask role system automatically:
- **admin** — sees all pages including Users and Import.
- **super_user** — can add and edit animals, breeding seasons, and mating events.
- **readonly** — can view all data but cannot create, edit, or delete records.

No changes needed; Flask controls this on the server.

---

## 10. Troubleshooting

**"Unable to reach your Flask server"**  
- Confirm Flask is running (`python run.py`).  
- Confirm iPad and computer are on the same Wi-Fi network.  
- Check `.env` has the correct IP address (not `localhost`).  
- On Windows, check Windows Firewall is not blocking port 5000.  
  To allow it: Control Panel → Windows Defender Firewall → Advanced Settings → Inbound Rules → New Rule → Port 5000 → Allow.

**App shows blank page after login**  
- Your Flask app may be using `redirect('/')` after login; the WebView follows this automatically.  
- If the page is white, try tapping Refresh.

**Biometric prompt does not appear**  
- The device must have Face ID or Touch ID enrolled in Settings → Face ID & Passcode.  
- If not enrolled, the app opens directly without prompting — this is intentional.

**Build fails on EAS with "missing provisioning profile"**  
- Re-run `eas device:create` and make sure the iPad UDID is registered.  
- Re-run `eas build -p ios --profile preview`. EAS automatically regenerates the provisioning profile.

**Build fails with "Apple credentials error"**  
- When EAS asks for your Apple ID during the build, make sure you enter the Apple ID that belongs to your paid Developer account.  
- If you have two-factor authentication, approve the sign-in request on your trusted Apple device.

**TestFlight app says "Build Expired"**  
- TestFlight builds expire after 90 days. Run `npm run build:production:ios` again, upload the new build, and submit it as a new TestFlight build.

---

## 11. Security notes

- **Use HTTPS in production.** The `.env` example uses `http://` for local network testing. When your Flask server has a domain name and TLS certificate, switch to `https://` in `.env` and remove `NSAllowsArbitraryLoads` from `app.json` to enforce secure connections.  
- **Biometric lock** protects the app screen on the device but does not replace your Flask login. Users still need valid credentials to log in.  
- **Session cookies** are stored inside the iOS WebView cookie store, which is sandboxed to this app and encrypted by iOS.  
- **The `.ipa` is signed** for your registered devices only. Someone who obtains the file cannot install it on an unregistered device.

