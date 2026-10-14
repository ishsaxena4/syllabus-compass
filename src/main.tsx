// Must run before anything creates the Supabase client; see the module for why.
import "./lib/recoveryRedirect";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
