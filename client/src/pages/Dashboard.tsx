import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-foreground" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with Red Divider */}
      <header className="border-b border-border">
        <div className="container py-8 md:py-12">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white">
            FB PAGE MASTER
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-4">
            Autonomous Facebook Page Management System
          </p>
        </div>
        <div className="divider-red-thick"></div>
      </header>

      {/* Main Content */}
      <main className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Page Status Card */}
          <div className="card-industrial">
            <h2 className="text-3xl font-black tracking-tighter mb-6">PAGE STATUS</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <span className="text-muted-foreground">Connected Pages</span>
                <span className="text-2xl font-black">0</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-4">
                <span className="text-muted-foreground">Active Groups</span>
                <span className="text-2xl font-black">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Messages Today</span>
                <span className="text-2xl font-black">0</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="card-industrial">
            <h2 className="text-3xl font-black tracking-tighter mb-6">QUICK ACTIONS</h2>
            <div className="space-y-3">
              <a href="/pages/connect" className="w-full btn-industrial text-sm inline-block text-center">
                CONNECT PAGE
              </a>
              <button className="w-full btn-industrial text-sm">
                ADD GROUP
              </button>
              <a href="/ai-generator" className="w-full btn-industrial text-sm inline-block text-center">
                AI POST GENERATOR
              </a>
            </div>
          </div>

          {/* System Status Card */}
          <div className="card-industrial">
            <h2 className="text-3xl font-black tracking-tighter mb-6">SYSTEM STATUS</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-accent"></div>
                <span className="text-muted-foreground">API Connected</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-accent"></div>
                <span className="text-muted-foreground">Database Ready</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-accent"></div>
                <span className="text-muted-foreground">Scheduler Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Red Divider */}
        <div className="divider-red-thick my-12"></div>

        {/* Recent Activity Section */}
        <section className="mt-12">
          <h2 className="text-5xl font-black tracking-tighter mb-8">RECENT ACTIVITY</h2>
          <div className="card-industrial">
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No activity yet. Connect a Facebook Page to get started.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="divider-red-thick"></div>
        <div className="container py-8 text-center text-muted-foreground">
          <p>© 2026 FB Page Master. Raw. Industrial. Autonomous.</p>
        </div>
      </footer>
    </div>
  );
}
