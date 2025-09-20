import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "./lib/theme";

// Import Amplify configuration
// Note: amplify_outputs.json will be generated after deployment
const configureAmplify = async () => {
  try {
    // Dynamic import with proper error handling for development
    const { default: outputs } = await import("../amplify_outputs.json" as any);
    Amplify.configure(outputs);
  } catch (error) {
    console.warn("Amplify outputs not found. Deploy backend with: npx ampx sandbox");
    // For development without deployed backend, we'll skip Amplify config
    // The client calls will fail gracefully with appropriate error handling
  }
};

// Configure Amplify asynchronously
configureAmplify();

// Initialize theme before rendering
initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
