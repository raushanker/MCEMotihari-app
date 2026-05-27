# MCE Motihari Connect App 🎓📱

Welcome to the **MCE Motihari Connect App** — a premium, high-performance, and visually stunning engineering college social network platform. Built using **Expo SDK 54**, **React Native**, **TypeScript**, and **Zustand** for state management, it delivers a modern campus community experience resembling a blend of **LinkedIn + Reddit + Discord + Notion** custom-tailored for engineering college students.

---

## 🛠️ Technology Stack & Architecture

- **Core Framework**: React Native with **Expo SDK 54** (TypeScript).
- **Navigation System**: **Expo Router (v6)** using file-based routing.
- **State Management**: **Zustand (v5)** — unified, light global stores for real-time reactivity.
- **Render Engine**: Shopify **FlashList** — fluid list recycling optimized for low-end Android/iOS devices.
- **Responsive Layout**: **React Native Safe Area Insets** for notched-device dynamic padding.

---

## 📂 Project Structure Explained

To make the codebase extremely easy to read, comprehend, and navigate, the structure has been reorganized. All default boilerplate templates have been cleaned up. Here is the exact directory layout:

```text
src/
├── app/                        # 📲 Routing Layer (Expo Router)
│   ├── _layout.tsx             # ├─ Central Tab Controller & Post Creator Sheets
│   ├── index.tsx               # ├─ Simple HomeScreen Entry Route (/)
│   ├── community.tsx           # ├─ Feed Tab Route (/community) - uses reusable `<PostCard />`
│   ├── create.tsx              # ├─ Tab dummy slot (opens Modal)
│   ├── explore.tsx             # ├─ Multi-viewport sub-router (?view=)
│   ├── network.tsx             # ├─ Student Directory Tab Route (/network)
│   ├── profile.tsx             # ├─ Profile config Tab Route (/profile)
│   └── login.tsx               # └─ Google Auth / verification and signup screen
│   
├── screens/                    # 🖥️ Main Screen Pages (Full Viewports)
│   ├── HomeScreen.tsx          # ├─ Core Campus Dashboard UI & Feeds
│   ├── DepartmentsScreen.tsx    # ├─ Academic Streams list
│   ├── FacultyListScreen.tsx    # ├─ Faculty searchable Directories
│   ├── FacultyProfileScreen.tsx # ├─ Web view Official Bios
│   ├── HostelsScreen.tsx        # ├─ Hostel Listings & Mess routines
│   └── SyllabusScreen.tsx       # └─ BEU Syllabus curriculum & files
│
├── components/                 # 🧩 UI Kit Components
│   ├── PostCard.tsx            # ├─ Shared Post Card View & Interactions
│   ├── drawer/                 # ├─ Custom Sliding drawer menu (pan-gestures)
│   │   └── CustomDrawer.tsx
│   ├── modals/                 # └─ Floating feature sheet popups
│   │   ├── DetailModal.tsx     #    ├─ Reusable bottom-sheet layout
│   │   ├── AboutModal.tsx      #    ├─ MCE Outline info
│   │   ├── CampusMapModal.tsx  #    ├─ Campus sectors & amenities
│   │   ├── StudyMaterialsModal.tsx # ├─ Free syllabus files downloads
│   │   ├── HolidaysModal.tsx   #    ├─ Monthly calendar calculator
│   │   ├── EventsModal.tsx     #    ├─ Fests & hackathons schedule
│   │   ├── SettingsModal.tsx   #    ├─ App configurations
│   │   └── PrivacyModal.tsx    #    └─ Privacy & Data terms
│   ├── ui/                     # ├─ Atomic UI elements
│   │   └── VerifiedBadge.tsx   # └─ Verified badge indicators
│   ├── DepartmentCard.tsx      # ├─ Stream card component
│   ├── FacultyCard.tsx         # ├─ Faculty thumbnail card
│   └── FacultyFilter.tsx       # └─ Faculty filter chips bar
│
├── data/                       # 💾 Static Mock Database Models
│   ├── departments.ts
│   ├── faculty.ts
│   ├── holidays.ts
│   ├── hostels.ts
│   └── syllabus.ts
│
├── hooks/                      # 🎣 Custom Hooks (Zustand & Auth State Engines)
│   ├── useAuth.ts
│   └── usePosts.ts
│
└── store/                      # 📦 Zustand Global Database Store
    └── useAppStore.ts
```

---

## 🔑 Why is `index.tsx` the HomeScreen?

In **Expo Router**, routing is fully file-based (similar to Next.js). 
- `index.tsx` is the root path (`/`). In mobile layouts, it is standard practice to render the principal view (the **Home Feed Dashboard**) at the root index.
- The **Sliding Side Drawer** is integrated natively inside `index.tsx` by wrapping the root view inside the `<CustomDrawer>` component, which can be swiped open or triggered by pressing the menu hamburger button at the top-left of the App Header.

---

## 🚀 Performance & Cross-Device Optimizations

We prioritize **first-class user experience (UX)** on all devices (high-end iOS and low-end Androids alike):

1. **Auto-Scroll Banner Crash Fix**:
   - Integrated `getItemLayout` measurements and `onScrollToIndexFailed` handlers inside the auto-scroll banner list of the Home feed to completely prevent invariant violations.
2. **Gesture-Safe Dynamic Floating Tab Bar**:
   - The floating tab bar reads device safe-area safe inset values dynamically using **`useSafeAreaInsets`**.
   - On notched screens (e.g. iPhone X/11/12/13/14/15/16 and modern gesture Androids), the tab bar automatically floats at `insets.bottom + 6` (e.g., `40px` off the bottom edge) to stay entirely clear of the native home bar. On standard screen sizes, it safely docks at `12px`.
3. **No Overlaps Scroll Padding**:
   - Every single scrollable feed and listing screen in the project is structured with a customized bottom padding (**`150px`**), ensuring users can scroll list items completely above the floating tab bar, leaving all interaction buttons and text fully visible.

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
- **iOS/Android Devices**: Scan the console QR code using the **Expo Go** app (select the **Tunnel** connection mode in the terminal if on separate Wi-Fi networks).