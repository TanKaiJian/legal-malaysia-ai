import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import Landing from "./pages/Landing";
import Chatbot from "./pages/Chatbot";
import DocumentAnalyzer from "./pages/DocumentAnalyzer";
import Settings from "./pages/Settings";
import TextExtractionTest from "./pages/TextExtractionTest";
import NotFound from "./pages/NotFound";
import { UploadedFilesProvider } from "@/hooks/uploadedFileContext";

const queryClient = new QueryClient();

const App = () => (
  <UploadedFilesProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <TopBar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/chatbot" element={<Chatbot />} />
                  <Route path="/analyzer" element={<DocumentAnalyzer />} />
                  {/* <Route path="/text-extraction-test" element={<TextExtractionTest />} /> */}
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </UploadedFilesProvider>
);

export default App;
