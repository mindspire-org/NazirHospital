import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import AppDialogs from "./components/AppDialogs";

const container = document.getElementById("root")!;
const Router: any = location.protocol === "file:" ? HashRouter : BrowserRouter;
createRoot(container).render(
  <React.StrictMode>
    <Router>
      <App />
      <AppDialogs />
    </Router>
  </React.StrictMode>,
);
