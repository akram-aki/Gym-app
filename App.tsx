import React from "react";
import { StatusBar } from "expo-status-bar";
import { Example } from "./components/Example";

export default function App() {
  return (
    <>
      <Example />
      <StatusBar style="auto" />
    </>
  );
}
