# Farm Manager — Mobile App (React Native / Expo)

This is the iPad companion app for your existing Flask farm management system.  
It requires **no new backend endpoints** — every page and form is rendered directly from the same Flask server you already run.

---

## Table of Contents

1. [How it works](#1-how-it-works)
2. [Prerequisites](#2-prerequisites)
3. [Project setup](#3-project-setup)
4. [Configure the backend URL](#4-configure-the-backend-url)
5. [Run in Expo Go (Quick test on iPad)](#5-run-in-expo-go-quick-test-on-ipad)
6. [Regenerate branding assets](#6-regenerate-branding-assets)
7. [Build a standalone iOS app (no App Store)](#7-build-a-standalone-ios-app-no-app-store)
8. [Install the app on your iPad](#8-install-the-app-on-your-ipad)
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
| **EAS CLI** | `npm install -g eas-cli` | Builds the iOS binary in Expo's cloud |
| **Git** | https://git-scm.com | Version control (recommended) |

### Apple account

You need a **paid Apple Developer account** ($99 USD / year) to build and install apps outside the App Store.  
Sign up at: https://developer.apple.com/programs/

> If you only want to test via **Expo Go** (method in section 5), you do **not** need an Apple Developer account.  
> An Apple Developer account is only required to build a standalone `.ipa` file (section 7 onward).

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
> - If your Flask server has an HTTPS address, use `https://` instead.

**Step 3 — Start your Flask server**

In the `farm_app` folder, make sure Flask is running:
```bash
python run.py
```

Leave it running. The mobile app connects to it live.

---

## 5. Run in Expo Go (Quick test on iPad)

This is the fastest way to see the app on your iPad. No Apple Developer account needed.

**Step 1** — Install **Expo Go** on your iPad from the App Store (free app by Expo).

**Step 2** — In the `farm_mobile` folder on your computer, run:
```bash
npm start
```

You will see a QR code in the terminal.

**Step 3** — On your iPad, open the Camera app and point it at the QR code.  
Tap the notification that appears. Expo Go opens and loads the app.

> Expo Go is for testing only. It cannot be used as a permanent standalone app. Continue to section 7 for the real iPad install.

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

## 7. Build a standalone iOS app (no App Store)

This produces a `.ipa` file you can install directly on your iPad without App Store review.  
Expo EAS (Expo Application Services) builds the iOS binary in the cloud for you — you do **not** need a Mac.

### Step 1 — Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2 — Log in to your Expo account

If you don't have an Expo account, create one free at https://expo.dev/signup

```bash
eas login
```

Enter your Expo username and password when prompted.

### Step 3 — Link the project to EAS

Run this once inside the `farm_mobile` folder:

```bash
eas build:configure
```

When asked *"Which platforms would you like to configure?"*, choose **iOS**.  
When asked about the bundle identifier, press Enter to keep `com.farm.mobile` (or type your own).  
This updates `app.json` automatically.

### Step 4 — Register your iPad's UDID

Apple requires every device to be registered before it can install an Ad Hoc (non-App-Store) app.

**Find your iPad's UDID:**
1. Connect the iPad to your computer with a cable.
2. Open iTunes (Windows) or Finder (Mac).
3. Click on the iPad. Click the device model name repeatedly until you see a long string of letters and numbers — that is the UDID.
4. Right-click it and copy it.

**Register it with EAS:**
```bash
eas device:create
```

Follow the prompts. EAS will ask you to either enter the UDID manually or scan a QR code on the iPad to register it over Wi-Fi. The QR code method is easiest if you don't have a cable.

### Step 5 — Start the iOS build

```bash
eas build -p ios --profile preview
```

What happens next:
- EAS uploads your project code to Expo's cloud build servers.
- Apple's certificate and provisioning profile are generated automatically using your Apple Developer account credentials (EAS will ask you for them the first time).
- The build takes approximately **10–20 minutes** on EAS servers.
- You will receive an email when the build is complete.
- You can also watch progress at https://expo.dev — log in, open your project, then **Builds**.

> The `preview` profile in `eas.json` uses **internal distribution**, which means the `.ipa` is signed for Ad Hoc install (specific registered devices only). This is how you install outside the App Store.

### Step 6 — Download the .ipa

When the build finishes:
1. Go to https://expo.dev → your account → your project → **Builds**
2. Click the completed iOS build
3. Click **Download build artifact** to download the `.ipa` file to your computer

---

## 8. Install the app on your iPad

You have two options after downloading the `.ipa`.

### Option A — Apple Configurator 2 (requires a Mac + USB cable)

1. Install **Apple Configurator 2** from the Mac App Store (free).
2. Connect your iPad to the Mac with a USB cable.
3. Open Apple Configurator 2. Your iPad appears.
4. Drag the `.ipa` file onto the iPad icon. Click **Add** when prompted.
5. The app installs. Find it on your iPad home screen.

### Option B — TestFlight internal testing (no USB cable needed)

TestFlight is Apple's official way to distribute pre-release apps. It is **not** the public App Store — no review process is required for internal testers.

**Step 1** — Go to https://appstoreconnect.apple.com and sign in with your Apple ID.

**Step 2** — Click **My Apps** → **+** (new app) and fill in the details:
- Platform: iOS
- Bundle ID: `com.farm.mobile` (must match your `app.json`)
- Primary Language: English
- Name: Farm Manager

**Step 3** — Upload your `.ipa` using **Transporter** (free Mac app) or **Xcode Organizer**.

**Step 4** — In App Store Connect, go to **TestFlight** tab → your build → **Internal Testing** → **+** → add your Apple ID as an internal tester.

**Step 5** — On your iPad, install the free **TestFlight** app from the App Store.

**Step 6** — You will get an email invitation. Open it on the iPad and tap **Start Testing**.  
The app installs via TestFlight and appears on your home screen.

> TestFlight apps expire after **90 days** but can be re-built and re-uploaded any time.

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
- TestFlight builds expire after 90 days. Run `eas build -p ios --profile preview` again, upload the new `.ipa`, and submit it as a new TestFlight build.

---

## 11. Security notes

- **Use HTTPS in production.** The `.env` example uses `http://` for local network testing. When your Flask server has a domain name and TLS certificate, switch to `https://` in `.env` and remove `NSAllowsArbitraryLoads` from `app.json` to enforce secure connections.  
- **Biometric lock** protects the app screen on the device but does not replace your Flask login. Users still need valid credentials to log in.  
- **Session cookies** are stored inside the iOS WebView cookie store, which is sandboxed to this app and encrypted by iOS.  
- **The `.ipa` is signed** for your registered devices only. Someone who obtains the file cannot install it on an unregistered device.

