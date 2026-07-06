# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# UI/UX & Navigation Standards
- **Modal Overlays & Navigation:** When a sub-screen is rendered inside a modal (like `ExploreMenuModal`), NEVER use direct `router.push()` from inside the sub-screen to navigate to an external route. Always pass an `handleExternalNav` prop from the modal parent to the child, which FIRST closes the modal (with a small timeout for animation) and THEN navigates. Failing to close the modal causes the new screen to load underneath the overlay, breaking the UX.
- **Expo Router Tabs:** When creating a new folder in `src/app` that should NOT be in the bottom tab bar, you must explicitly hide it in `src/app/_layout.tsx` using `<Tabs.Screen name="folderName" options={{ href: null, tabBarStyle: { display: 'none' } }} />`.
- **Aesthetics & UI:** Always prioritize premium, smooth, and bug-free user experiences. Do not compromise on standard UI/UX patterns (margins, padding, feedback on touch, handling overlays gracefully).
