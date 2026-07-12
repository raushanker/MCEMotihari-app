# MCE Motihari Connect App 🎓📱

Welcome to the **MCE Motihari Connect App** — a premium, high-performance, and visually stunning engineering college social network platform. Built using **Expo SDK 54**, **React Native**, **TypeScript**, and **Zustand** for state management, it delivers a modern campus community experience resembling a blend of **LinkedIn + Reddit + Discord + Notion** custom-tailored for engineering college students.

### 🚀 Latest Release: v2.0.9
- **Chat Badges Sync**: Server-side synchronization of unread chat messages that perfectly persist across device reboots and logins.
- **Hardware Navigation Fix**: Implemented dynamic hook listeners to perfectly handle Android hardware back button inside overlays and chat rooms, preventing accidental app exits.

---

## 🛠️ Technology Stack & Architecture

- **Core Framework**: React Native with **Expo SDK 54** (TypeScript).
- **Navigation System**: **Expo Router (v6)** using file-based routing.
- **State Management**: **Zustand (v5)** — unified, light global stores for real-time reactivity with `useShallow` hook optimization.
- **Render Engine**: Shopify **FlashList** and optimized **FlatList** — fluid list recycling optimized with `React.memo`, `initialNumToRender`, and `extraData` to prevent stuttering on low-end Android/iOS devices.
- **Responsive Layout**: **React Native Safe Area Insets** for notched-device dynamic padding.

---

## 📂 Project Structure Explained

The codebase has been heavily optimized for readability, performance, and maintainability. All unused and temporary files have been permanently cleared. Here is the exact directory layout:

```text
src/
├── app/                        # 📲 Routing Layer (Expo Router)
│   ├── _layout.tsx             # ├─ Central Tab Controller & Post Creator Sheets
│   ├── index.tsx               # ├─ Main Feed Dashboard (Optimized FlashList)
│   ├── community.tsx           # ├─ Community Feed Route
│   ├── create.tsx              # ├─ Tab dummy slot (opens Modal)
│   ├── explore.tsx             # ├─ Multi-viewport sub-router
│   ├── network.tsx             # ├─ Student Directory Tab Route
│   ├── profile.tsx             # ├─ Profile configurations (Optimized FlatList)
│   ├── support.tsx             # ├─ Help & Support Desk
│   ├── sports.tsx              # ├─ Sports Facilities Screen
│   ├── library.tsx             # ├─ Central Library Screen
│   ├── canteen.tsx             # ├─ College Canteen Ordering Screen
│   ├── stationary.tsx          # ├─ Stationary Shop Items Screen
│   └── login.tsx               # └─ Secure Google Auth & Signup
│   
├── screens/                    # 🖥️ Main Screen Pages (Delegated from Modals/Router)
│   ├── DepartmentsScreen.tsx   # ├─ Academic Streams list
│   ├── FacultyListScreen.tsx   # ├─ Faculty searchable Directories
│   ├── HostelsScreen.tsx       # ├─ Hostel Listings & Mess routines
│   └── SyllabusScreen.tsx      # └─ BEU Syllabus curriculum & files
│
├── components/                 # 🧩 UI Kit Components
│   ├── PostCard.tsx            # ├─ Shared Post Card View (React.memo highly optimized)
│   ├── drawer/                 # ├─ Custom Sliding drawer menu
│   ├── modals/                 # ├─ Floating feature sheet popups
│   │   ├── EventsModal.tsx     # ├─ Fests & hackathons schedule
│   │   ├── SettingsModal.tsx   # ├─ App configurations
│   │   └── UserProfileModal.tsx# └─ Interactive public profiles
│   ├── ui/                     # ├─ Atomic UI elements
│   ├── DepartmentCard.tsx      # ├─ Stream card component
│   └── FacultyCard.tsx         # └─ Faculty thumbnail card
│
├── data/                       # 💾 Static Mock Database Models
├── hooks/                      # 🎣 Custom Hooks (Theme, Auth, Data)
└── store/                      # 📦 Zustand Global Database Store
    └── useAppStore.ts
```

---

## 🔑 Why is `index.tsx` the HomeScreen?

In **Expo Router**, routing is fully file-based. 
- `index.tsx` is the root path (`/`). It houses the heavily optimized **Home Feed Dashboard**.
- The **Sliding Side Drawer** is integrated natively inside `index.tsx` by wrapping the root view inside the `<CustomDrawer>` component, which can be swiped open or triggered via the hamburger menu.

---

## 🚀 Key Features & Optimizations

We prioritize **first-class user experience (UX)** and intelligent system design:

1. **Intelligent Smart Feed Algorithm**:
   - The main feed dynamically ranks posts based on user interaction history, connections, and engagement metrics (claps/comments).
   - Features **"Seen Post" decay** (tracks visibility > 60% viewport for 500ms) ensuring old posts recede and unseen content surfaces on every app launch via deterministic session seeds.
   - Fallback fetch mechanisms guarantee content availability even during low-activity periods.

2. **Real-time Notifications System**:
   - **Push Notifications**: Integrated `expo-notifications` for real-time background delivery (e.g., immediate alerts when someone comments on your post).
   - **In-App Alerts**: Non-intrusive internal notification center for high-volume actions like post "Hearts" to avoid device spam while keeping users informed.

3. **High-Performance Rendering Engine**:
   - Uses `AnimatedFlashList` and explicitly feeds `extraData` to handle nested Zustand states, ensuring fast optimistic UI updates without entire tree re-renders.
   - Heavy components like `<PostCard />` are completely wrapped in `React.memo` using strict `areEqual` evaluations.
   - Uses `initialNumToRender` and `windowSize` on native FlatLists to dramatically cut down RAM usage on massive student feeds.

4. **Production-Ready Telemetry & Cleanup**:
   - Clean architecture with a dedicated Python cleanup pipeline (`cleanup.py`) that intelligently guards development logs (`console.log`, `console.time`) behind `__DEV__` environments.
   - Prevents Hermes JS engine crashes and eliminates console spam in production builds without losing debugging capabilities for developers.

5. **Gesture-Safe Dynamic Floating Tab Bar**:
   - Reads device safe-area safe inset values dynamically using **`useSafeAreaInsets`**.
   - On notched screens (iPhone X+ / Android gestures), the tab bar floats smoothly to stay clear of the native home bar.

6. **Cross-Platform Secure Document Access**:
   - Employs `expo-web-browser` for secure, in-app native overlays on Android/iOS to cleanly render external university PDFs (e.g. GATE syllabus), bypassing the unreliability of Google Docs viewers and native WebViews.
   - Implements intelligent `Platform.OS === 'web'` fallback modals that detect strict `X-Frame-Options` on external domains, seamlessly funneling users to the native app with premium "Download App" dialogues while providing secure redirect fallbacks.

---

## 🏃 Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Metro Bundler
To launch the Expo development server and clear the bundling cache:
```bash
npx expo start --clear
```

### 3. Open Preview
- **iOS/Android Devices**: Scan the console QR code using the **Expo Go** app. (Select **Tunnel** if network issues arise).
- **Web Build**: Press `w` in the console.