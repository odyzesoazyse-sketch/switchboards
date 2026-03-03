import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import CreateBattle from "./pages/CreateBattle";
import BattleView from "./pages/BattleView";
import BattleScreen from "./pages/BattleScreen";
import BattleSettings from "./pages/BattleSettings";
import OperatorPanel from "./pages/OperatorPanel";
import JudgePanel from "./pages/JudgePanel";
import ActivityLogs from "./pages/ActivityLogs";
import BattlePublic from "./pages/BattlePublic";
import Leaderboard from "./pages/Leaderboard";
import Analytics from "./pages/Analytics";
import DancerProfile from "./pages/DancerProfile";
import AudienceVote from "./pages/AudienceVote";
import McTeleprompter from "./pages/McTeleprompter";
import CypherSwipe from "./pages/CypherSwipe";
import ObsOverlay from "./pages/ObsOverlay";
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
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/battles/:id" element={<BattlePublic />} />
              <Route path="/battles/:id/leaderboard" element={<Leaderboard />} />
              <Route path="/battle/:id/vote" element={<AudienceVote />} />

              {/* Protected — organizer */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/battle/create" element={<ProtectedRoute><CreateBattle /></ProtectedRoute>} />
              <Route path="/battle/:id" element={<ProtectedRoute><BattleView /></ProtectedRoute>} />
              <Route path="/battle/:id/settings" element={<ProtectedRoute><BattleSettings /></ProtectedRoute>} />
              <Route path="/battle/:id/screen" element={<ProtectedRoute><BattleScreen /></ProtectedRoute>} />
              <Route path="/battle/:id/screen/obs" element={<ProtectedRoute><BattleScreen isObs={true} /></ProtectedRoute>} />
              <Route path="/battle/:id/operator" element={<ProtectedRoute><OperatorPanel /></ProtectedRoute>} />
              <Route path="/battle/:id/logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
              <Route path="/battle/:id/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/battle/:id/mc" element={<ProtectedRoute><McTeleprompter /></ProtectedRoute>} />

              {/* Protected — judge / other */}
              <Route path="/judge" element={<ProtectedRoute><JudgePanel /></ProtectedRoute>} />
              <Route path="/dancer/:id" element={<DancerProfile />} />
              <Route path="/cypher-swipe/:id" element={<ProtectedRoute><CypherSwipe /></ProtectedRoute>} />
              <Route path="/battle/:id/obs-overlay" element={<ObsOverlay />} />

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
