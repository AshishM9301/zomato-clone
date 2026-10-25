# 12 — React Native toolchain setup (Windows)

> One-time manual setup for the `customer-app/` (and any future) React Native CLI app on Windows 11. You only need this if you don't already have Node 20, JDK 17, and the Android SDK installed.
>
> **Goal**: run `npx react-native run-android` from `E:\projects\endev\zomato-clone\customer\` and see the app launch on a USB-connected Android device.
>
> **Not needed for**: the backend (`backend/`) or the web dashboard (`web/`). Those only need Node + npm.

## 0. Pre-flight

Open **PowerShell as your normal user** (no admin needed for steps 1–4). You'll switch to an **admin PowerShell** for step 5 (long path support). All commands below assume PowerShell.

Verify your starting point:

```powershell
node -v       # any version is fine; we'll install 20 in step 1
java -version # if this errors, you have no JDK; step 2 will install one
adb          # if this errors, you have no Android SDK; step 3 will install one
```

If `node -v` already shows `v20.x` and `adb` works from any directory, skip steps 1 and 3.

## 1. Node 20 LTS

```powershell
winget install OpenJS.NodeJS.LTS
# close + reopen PowerShell after this
node -v   # → v20.x
```

If you don't have `winget`, download the Windows MSI from <https://nodejs.org/en/download> and run it. Choose the LTS build (currently 20.x).

## 2. JDK 17 (Temurin)

React Native 0.74–0.76 Gradle plugin requires **JDK 17**, not 21 or 25. Use Temurin (Adoptium).

```powershell
winget install EclipseAdoptium.Temurin.17.JDK
# close + reopen PowerShell after this
java -version   # → openjdk 17.x
```

Set `JAVA_HOME` so Gradle picks it up. Open **System Properties → Environment Variables → System variables → New**:

| Variable | Value |
|---|---|
| `JAVA_HOME` | `C:\Program Files\Eclipse Adoptium\jdk-17.x.y.z` |

The exact folder name has the version. Run this to verify:

```powershell
[Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")
# Should print the JDK 17 path, not empty
```

## 3. Android SDK (cmdline-tools, no Android Studio)

The cmdline-tools give you `sdkmanager`, `adb`, and the emulator without the full Android Studio IDE.

**3a. Download** the Windows zip from <https://developer.android.com/studio#command-line-tools-only>. Look for "Command line tools only" near the bottom of the page; download the Windows `.zip`.

**3b. Extract** to `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\`:

```powershell
# Adjust the version in the zip name to match what you downloaded
Expand-Archive "$env:USERPROFILE\Downloads\commandlinetools-win-*.zip" -DestinationPath "$env:LOCALAPPDATA\Android\Sdk\tmp"

# Move the inner folder to "latest" (sdkmanager requires this exact name)
Move-Item "$env:LOCALAPPDATA\Android\Sdk\tmp\cmdline-tools" "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest"

Remove-Item "$env:LOCALAPPDATA\Android\Sdk\tmp" -Recurse
```

**3c. Environment variables** (System Properties → Environment Variables → System variables):

| Variable | Value |
|---|---|
| `ANDROID_HOME` | `C:\Users\<you>\AppData\Local\Android\Sdk` |
| `ANDROID_SDK_ROOT` | (same value, for older tooling) |

Replace `<you>` with your Windows username. Verify:

```powershell
[Environment]::GetEnvironmentVariable("ANDROID_HOME", "Machine")
```

**3d. PATH** — System Properties → Environment Variables → `Path` → Edit → Add (in order):

```
%ANDROID_HOME%\cmdline-tools\latest\bin
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

Close + reopen PowerShell, then verify:

```powershell
sdkmanager --version
adb --version
```

**3e. Install SDK packages** — the minimum for React Native 0.76+ targeting Android 14:

```powershell
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

Accept the license when prompted (`y` for each). This downloads ~500 MB the first time.

Verify:

```powershell
sdkmanager --list_installed | Select-String -Pattern "platform-tools|android-34|build-tools;34"
```

## 4. USB device (no emulator needed)

On your **Android phone**:

1. **Settings → About phone** → tap **Build number** 7 times. You'll see "You are now a developer!"
2. **Settings → System → Developer options** (or it might be at the bottom of Settings) → enable **USB debugging**.
3. Plug the phone into your PC via USB. The first time, the phone shows a popup "Allow USB debugging?" — tap **Allow** (check "Always allow from this computer" if you trust the PC).
4. Verify from PowerShell:

```powershell
adb devices
# List of devices attached
# <serial>    device
```

If you see `unauthorized` instead of `device`, the phone hasn't accepted the RSA fingerprint — unplug, replug, and re-accept.

For physical-device development, the phone and the PC must share the **same Wi-Fi network** so the app can reach your PC's backend at `http://<your-LAN-IP>:4000`. Find your PC's LAN IP:

```powershell
ipconfig | Select-String -Pattern "IPv4"
# Wireless LAN adapter Wi-Fi:
#    IPv4 Address. . . . . . . . . . . : 192.168.1.42
```

That IP goes in `customer-app/.env` as `API_BASE_URL=http://192.168.1.42:4000/api/v1` (replace `192.168.1.42` with yours). The `10.0.2.2` address only works on the AVD emulator, not on USB.

## 5. Long paths + PowerShell execution policy (admin shell)

Open **PowerShell as Administrator** (right-click → Run as administrator).

```powershell
# Long path support — required for deeply nested node_modules paths
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1

# PowerShell execution policy — so npx can run scripts
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Close the admin shell; back to normal PowerShell.

## 6. Windows Defender exclusions (recommended)

Gradle and Metro scan every file in `node_modules` and `.gradle`. Defender slows them to a crawl. Add these to Defender's exclusion list:

**Settings → Privacy & security → Windows Security → Virus & threat protection → Exclusions → Add or remove exclusions → Add an exclusion → Folder**:

- `E:\projects\endev\zomato-clone` (the repo)
- `E:\projects\endev\zomato-clone\customer\node_modules` (after `npm install`)
- `C:\Users\<you>\.gradle`

This step is optional but turns a 10-minute first build into a 90-second build.

## 7. Sanity check

```powershell
node -v         # v20.x
java -version   # openjdk 17.x
adb --version   # 1.0.x (from platform-tools)
sdkmanager --version
adb devices     # shows your phone
```

Then in the repo root:

```powershell
npx --yes @react-native-community/cli@latest --version
# Any version is fine; the init command itself does the rest
```

## Gotchas

- **Watchman is not available on Windows.** Metro works without it. If file watching flakes during dev, restart Metro with `npx react-native start --reset-cache`.
- **First `gradlew assembleDebug` is huge** — ~500 MB download, then Gradle daemon caches ~1 GB. Subsequent builds are fast.
- **JDK 21 / 25 will break the build.** Stay on 17. Check `java -version` if Gradle errors mention `JAVA_HOME` or `compileSdk`.
- **Cleartext HTTP** — the customer app talks to `http://` (your LAN backend). The dev build enables this via `usesCleartextTraffic="true"` in `AndroidManifest.xml`. Production builds will be HTTPS-only.
- **`adb` from the wrong shell** — if `adb devices` returns nothing but the phone is plugged in, kill stale adb servers: `adb kill-server && adb start-server`.
- **PowerShell `npm` script hangs** — occasionally Metro/Gradle prints colors that PowerShell doesn't render. Use Windows Terminal (the new terminal app), not `conhost`.
- **Antivirus other than Defender** (Norton, McAfee, Kaspersky) is worse than Defender on this — exclude the repo aggressively or disable real-time scanning for the project folder.

## What you can skip

- **Android Studio** — not needed. The cmdline-tools + Gradle CLI is enough.
- **An emulator** — a USB device is faster to set up and more representative of real conditions.
- **iOS** — impossible on Windows. macOS only.

## When you're done

Go back to `docs/08-progress-customer.md` and follow the "Verification" section.