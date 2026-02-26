import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateBattle from "./pages/CreateBattle";
import BattleView from "./pages/BattleView";
import BattleScreen from "./pages/BattleScreen";
import BattleSettings from "./pages/BattleSettings";
import OperatorPanel from "./pages/OperatorPanel";
import JudgePanel from "./pages/JudgePanel";
import ActivityLogs from "./pages/ActivityLogs";
import BattlesList from "./pages/BattlesList";
import BattlePublic from "./pages/BattlePublic";
import Leaderboard from "./pages/Leaderboard";
import Analytics from "./pages/Analytics";
import DancerProfile from "./pages/DancerProfile";
import WorldEvents from "./pages/WorldEvents";
import WorldRanking from "./pages/WorldRanking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark" storageKey="battleboard-theme">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/battles" element={<BattlesList />} />
              <Route path="/battles/:id" element={<BattlePublic />} />
              <Route path="/world-events" element={<WorldEvents />} />
              <Route path="/battles/:id/leaderboard" element={<Leaderboard />} />
              <Route path="/battle/create" element={<CreateBattle />} />
              <Route path="/battle/:id" element={<BattleView />} />
              <Route path="/battle/:id/settings" element={<BattleSettings />} />
              <Route path="/battle/:id/screen" element={<BattleScreen />} />
              <Route path="/battle/:id/screen/obs" element={<BattleScreen isObs={true} />} />
              <Route path="/battle/:id/operator" element={<OperatorPanel />} />
              <Route path="/battle/:id/logs" element={<ActivityLogs />} />
              <Route path="/battle/:id/analytics" element={<Analytics />} />
              <Route path="/dancer/:id" element={<DancerProfile />} />
              <Route path="/judge" element={<JudgePanel />} />
              <Route path="/world-ranking" element={<WorldRanking />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;