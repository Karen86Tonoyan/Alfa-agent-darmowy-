import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: pages, isLoading: pagesLoading } = trpc.pages.list.useQuery();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  if (authLoading || pagesLoading) {
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
          {/* Connected Pages Card */}
          <div className="card-industrial">
            <h2 className="text-3xl font-black tracking-tighter mb-6">CONNECTED PAGES</h2>
            {pages && pages.length > 0 ? (
              <div className="space-y-3">
                {pages.slice(0, 3).map((page: any) => (
                  <div key={page.id} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-bold">{page.pageName}</div>
                      <div className="text-xs text-muted-foreground">ID: {page.pageId}</div>
                    </div>
                    <a href={`/groups?pid=${page.id}`} className="text-sm underline">Manage</a>
                  </div>
                ))}
                {pages.length > 3 && (
                  <div className="text-xs text-muted-foreground pt-2">+{pages.length - 3} more pages</div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-4">No pages connected yet.</p>
                <a href="/pages/connect" className="btn-industrial text-sm inline-block">CONNECT FIRST PAGE</a>
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="card-industrial">
            <h2 className="text-3xl font-black tracking-tighter mb-6">QUICK ACTIONS</h2>
            <div className="space-y-3">
              <a href="/pages/connect" className="w-full btn-industrial text-sm inline-block text-center">
                CONNECT PAGE
              </a>
              <a href="/ai-generator" className="w-full btn-industrial text-sm inline-block text-center">
                AI POST GENERATOR (ALFA)
              </a>
              <a href="/alfa-lab" className="w-full btn-industrial text-sm inline-block text-center">
                ALFA LAB — TEST GUARDRAILS
              </a>
              <a href="/post-scheduler" className="w-full btn-industrial text-sm inline-block text-center">
                SCHEDULE POSTS
              </a>
            </div>
          </div>

          {/* Platform Modules Card */}
          <div className="card-industrial">
            <h2 className="text-3xl font-black tracking-tighter mb-6">PLATFORM MODULES</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <a href="/groups" className="underline">Groups & Filters</a>
              <a href="/tones" className="underline">Tones</a>
              <a href="/skills" className="underline">Agent Skills</a>
              <a href="/knowledge" className="underline">Knowledge Base</a>
              <a href="/messages" className="underline">Messages</a>
              <a href="/post-history" className="underline">History & Analytics</a>
            </div>
            <div className="mt-6 text-xs text-muted-foreground">
              Full brutalist FB management + AI under ALFA guardrails.
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
