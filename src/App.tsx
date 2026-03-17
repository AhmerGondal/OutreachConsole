import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { SearchModal } from './components/SearchModal';
import { AuthGate } from './components/AuthGate';
import { CommandCenter } from './components/dashboard/CommandCenter';
import { LeadSourcesSection } from './components/sections/LeadSourcesSection';
import { DiscoverySection } from './components/sections/DiscoverySection';
import { EmailExtractionSection } from './components/sections/EmailExtractionSection';
import { MessagingSection } from './components/sections/MessagingSection';
import { ResponseTrackerSection } from './components/sections/ResponseTrackerSection';
import { useLeadStore } from './hooks/useLeadStore';
import { useAuthProvider, AuthContext } from './hooks/useAuth';

function Dashboard() {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const store = useLeadStore();

  if (store.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent-light" />
      </div>
    );
  }

  return (
    <div className="noise-overlay relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-0 top-0 h-[600px] w-[600px] rounded-full bg-accent/[0.03] blur-[150px]" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-violet-500/[0.03] blur-[120px]" />
      </div>

      <Navigation onOpenSearch={openSearch} />
      <SearchModal open={searchOpen} onClose={closeSearch} />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-16 lg:ml-60 lg:pt-0">
        <CommandCenter store={store} />
        <LeadSourcesSection />
        <DiscoverySection />
        <EmailExtractionSection />
        <MessagingSection />
        <ResponseTrackerSection store={store} />
      </main>
    </div>
  );
}

function App() {
  const auth = useAuthProvider();

  if (auth.loading) {
    return (
      <div className="noise-overlay flex min-h-screen items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent-light" />
      </div>
    );
  }

  if (!auth.user) {
    return <AuthGate onSignIn={auth.signIn} onSignUp={auth.signUp} />;
  }

  return (
    <AuthContext.Provider value={auth}>
      <Dashboard />
    </AuthContext.Provider>
  );
}

export default App;
