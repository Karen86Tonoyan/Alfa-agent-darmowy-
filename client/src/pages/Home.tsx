import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-foreground" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center container py-20">
        <div className="text-center max-w-4xl">
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter mb-6 text-white">
            FB PAGE MASTER
          </h1>

          <div className="divider-red-thick my-8"></div>

          <p className="text-2xl md:text-3xl font-black tracking-tighter mb-8 text-white">
            Autonomous Facebook Page Management
          </p>

          <p className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed">
            AI-powered messaging. Automated group posting. Intelligent customer acquisition.
            Raw. Industrial. Unstoppable.
          </p>

          <div className="divider-red-thick my-8"></div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
            <div className="card-industrial text-left">
              <h3 className="text-2xl font-black mb-4">AI MESSAGING</h3>
              <p className="text-muted-foreground">Intelligent replies to incoming messages with configurable tone and style.</p>
            </div>
            <div className="card-industrial text-left">
              <h3 className="text-2xl font-black mb-4">AUTO POSTING</h3>
              <p className="text-muted-foreground">Schedule posts across multiple groups with AI-generated content.</p>
            </div>
            <div className="card-industrial text-left">
              <h3 className="text-2xl font-black mb-4">GROUP MANAGEMENT</h3>
              <p className="text-muted-foreground">Organize target groups by location and manage posting strategy.</p>
            </div>
            <div className="card-industrial text-left">
              <h3 className="text-2xl font-black mb-4">FULL CONTROL</h3>
              <p className="text-muted-foreground">Complete dashboard for monitoring, analytics, and real-time control.</p>
            </div>
          </div>

          <div className="divider-red-thick my-8"></div>

          {/* CTA Button */}
          <a
            href={getLoginUrl()}
            className="btn-industrial inline-block mt-8"
          >
            START NOW
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="divider-red-thick"></div>
        <div className="container py-8 text-center text-muted-foreground">
          <p>© 2026 FB Page Master. Raw. Industrial. Autonomous.</p>
        </div>
      </footer>
    </div>
  );
}
