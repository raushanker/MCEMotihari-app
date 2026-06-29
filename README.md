# MCE Motihari Connect App 🎓📱

Welcome to the **MCE Motihari Connect App** — a premium, high-performance, and visually stunning engineering college social network platform. Built using **Expo SDK 54**, **React Native**, **TypeScript**, and **Zustand** for state management, it delivers a modern campus community experience resembling a blend of **LinkedIn + Reddit + Discord + Notion** custom-tailored for engineering college students.

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

## 🚀 Performance & Cross-Device Optimizations

We prioritize **first-class user experience (UX)** on all devices:

1. **Memoized Feed Rendering**:
   - The main `FlashList` in the Home screen feeds `extraData` explicitly to handle nested Zustand states, ensuring fast optimistic UI updates (Likes, Comments, Bookmarks) without entire tree re-renders.
   - Heavy components like `<PostCard />` are completely wrapped in `React.memo` using strict `areEqual` evaluations.
2. **Gesture-Safe Dynamic Floating Tab Bar**:
   - Reads device safe-area safe inset values dynamically using **`useSafeAreaInsets`**.
   - On notched screens (iPhone X+ / Android gestures), the tab bar floats at `insets.bottom + 6` to stay clear of the native home bar.
3. **Optimized Scrolling**:
   - `FlatList` feeds in Profile and Sub-pages use `initialNumToRender`, `windowSize`, and `maxToRenderPerBatch` to dramatically cut down RAM usage on massive student feeds.

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