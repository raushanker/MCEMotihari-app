import { Stack } from "expo-router";
import React from "react";

export default function DepartmentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/laboratory" />
      <Stack.Screen name="[id]/society" />
      <Stack.Screen name="[id]/consultancy" />
      <Stack.Screen name="[id]/testing-fabrication" />
    </Stack>
  );
}
