import React from "react";
import { createRoot } from "react-dom/client";
import "../../shared/styles.css";
import { App } from "./App.jsx";

createRoot(document.querySelector("#root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
