import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PagesConnect from "./pages/PagesConnect";
import AIPostGenerator from "./pages/AIPostGenerator";
import AlfaLab from "./pages/AlfaLab";
import GroupsManager from "./pages/GroupsManager";
import ToneConfiguration from "./pages/ToneConfiguration";
import SkillsManager from "./pages/SkillsManager";
import KnowledgeManager from "./pages/KnowledgeManager";
import FilterBuilder from "./pages/FilterBuilder";
import PostScheduler from "./pages/PostScheduler";
import MessageHistory from "./pages/MessageHistory";
import PostHistory from "./pages/PostHistory";
import NotFound from "./pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  // make sure to consider if you need authentication for certain routes
  // Many feature pages expect a pageId prop (select page first via /dashboard or /pages/connect).
  // For demo/dev we pass a default pageId=1; in real use wire a page selector context.
  return (
    <Switch>
      <Route path={""} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/pages/connect"} component={PagesConnect} />
      <Route path={"/ai-generator"} component={() => <AIPostGenerator pageId={1} />} />
      <Route path={"/alfa-lab"} component={AlfaLab} />

      {/* Full platform features (reszta repo) */}
      <Route path={"/groups"} component={() => <GroupsManager pageId={1} />} />
      <Route path={"/tones"} component={() => <ToneConfiguration pageId={1} />} />
      <Route path={"/skills"} component={() => <SkillsManager pageId={1} />} />
      <Route path={"/knowledge"} component={() => <KnowledgeManager pageId={1} />} />
      <Route path={"/filters"} component={() => <FilterBuilder pageId={1} />} />
      <Route path={"/post-scheduler"} component={() => <PostScheduler pageId={1} />} />
      <Route path={"/messages"} component={() => <MessageHistory pageId={1} />} />
      <Route path={"/post-history"} component={() => <PostHistory pageId={1} />} />

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
