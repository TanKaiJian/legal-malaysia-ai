import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "./lib/theme";

// Configure Amplify for development
// In production, this will be replaced with actual outputs from deployment
const configureAmplify = () => {
  // Check if we're in a deployed environment with amplify_outputs
  if (typeof window !== 'undefined' && (window as any).__amplify_outputs__) {
    Amplify.configure((window as any).__amplify_outputs__);
    console.log("Amplify configured with deployed outputs");
  } else {
    // Development mode - configure with minimal settings
    console.warn("Running in development mode. Deploy backend with: npx ampx sandbox");
    // Set a minimal configuration to prevent errors
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: 'https://example.com/graphql', // Placeholder
          region: 'us-east-1',
          defaultAuthMode: 'iam'
        }
      }
    });
  }
};

// Initialize Amplify
configureAmplify();

// Initialize theme before rendering
initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
