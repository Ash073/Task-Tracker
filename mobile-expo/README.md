# TaskTracker Mobile (Expo React Native)

## Setup

### 1. Install Dependencies
```bash
cd mobile-expo
npm install
```

### 2. Configure Backend URL
Edit `src/config/api.js` and set your computer's local IP:
```js
const API_BASE_URL = 'http://192.168.1.5:5000/api';
```

Find your IP:
- **Windows**: `ipconfig` → look for IPv4 Address
- **Mac/Linux**: `ifconfig` or `ip addr`

### 3. Start Backend
```bash
cd ../backend
npm run dev
```

### 4. Run on Android
```bash
npx expo start
# Press 'a' to open in Android emulator/device
```

Or run directly:
```bash
npx expo run:android
```

## Build APK

### Option 1: Local Build
```bash
npx expo prebuild
npx expo run:android --variant release
```

### Option 2: EAS Build (Cloud)
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
This generates a downloadable APK.

## Project Structure
```
mobile-expo/
├── app/                    # Expo Router screens
│   ├── _layout.jsx         # Root layout
│   ├── index.jsx           # Entry redirect
│   ├── login.jsx           # Login screen
│   ├── register.jsx        # Register screen
│   └── (tabs)/             # Tab navigation
│       ├── _layout.jsx     # Tab bar config
│       ├── index.jsx       # Dashboard
│       ├── tasks.jsx       # Task management
│       ├── simple.jsx      # Simple mode reminders
│       ├── shopping.jsx    # Shopping lists
│       ├── profile.jsx     # User profile
│       └── settings.jsx    # AI, notifications, account
├── src/
│   ├── config/
│   │   ├── api.js          # Backend URL
│   │   └── theme.js        # Colors & fonts
│   ├── services/
│   │   ├── api.js          # Axios instance + auth
│   │   └── notifications.js # expo-notifications wrapper
│   └── store/
│       └── index.js        # Zustand stores (auth, tasks, shopping)
├── assets/                 # App icons
├── app.json                # Expo config
├── eas.json                # EAS Build config
└── package.json
```

## Features
- **Dashboard**: Stats, XP progress, detected goal, today's tasks
- **Tasks**: CRUD, filters, Excel import, 15-min notifications, priority badges
- **Simple Mode**: Daily reminders (water, eat, exercise, sleep), custom reminders, checklist
- **Shopping**: Lists with items, Excel import, OCR scan (camera + gallery)
- **Profile**: XP, level, streak, goal analysis
- **Settings**: AI keys (Gemini/OpenAI/Local), notification toggles, mode switch
- **Notifications**: Scheduled, repeating 15-min, critical channel, background support
- **Dark Theme**: Full dark UI matching the web version
- **OCR**: Camera capture + gallery image → text → shopping items
- **Excel Import**: DocumentPicker → parse → preview → bulk import

## Assets
Replace placeholder icons in `assets/` with proper icons:
- `icon.png` — 1024×1024 app icon
- `splash.png` — 1284×2778 splash screen
- `adaptive-icon.png` — 1024×1024 Android adaptive icon
- `notification-icon.png` — 96×96 notification icon (white on transparent)
