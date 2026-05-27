import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PagesConnect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: pages, isLoading: pagesLoading, refetch } = trpc.pages.list.useQuery();
  const connectPageMutation = trpc.pages.connect.useMutation();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pageAccessToken.trim()) {
      toast.error("Please enter a Page Access Token");
      return;
    }

    setIsLoading(true);
    try {
      const result = await connectPageMutation.mutateAsync({
        pageAccessToken: pageAccessToken.trim(),
      });

      toast.success(`Connected to page: ${result.pageName}`);
      setPageAccessToken("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to connect page");
    } finally {
      setIsLoading(false);
    }
  };

  if (pagesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-foreground" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container py-8 md:py-12">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white">
            CONNECT PAGE
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-4">
            Link your Facebook Page to start managing
          </p>
        </div>
        <div className="divider-red-thick"></div>
      </header>

      {/* Main Content */}
      <main className="container py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Connected Pages List */}
          {pages && pages.length > 0 && (
            <div className="mb-12">
              <h2 className="text-4xl font-black tracking-tighter mb-8">CONNECTED PAGES</h2>
              <div className="space-y-4">
                {pages.map((page) => (
                  <div key={page.id} className="card-industrial">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {page.pageProfilePicture && (
                          <img
                            src={page.pageProfilePicture}
                            alt={page.pageName}
                            className="w-12 h-12"
                          />
                        )}
                        <div>
                          <h3 className="text-xl font-black">{page.pageName}</h3>
                          <p className="text-muted-foreground text-sm">ID: {page.pageId}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLocation(`/dashboard/${page.id}`)}
                        className="btn-industrial text-sm"
                      >
                        MANAGE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Form */}
          <div className="card-industrial">
            <h2 className="text-4xl font-black tracking-tighter mb-8">ADD NEW PAGE</h2>

            <form onSubmit={handleConnect} className="space-y-6">
              <div>
                <label className="block text-lg font-black mb-4">
                  FACEBOOK PAGE ACCESS TOKEN
                </label>
                <textarea
                  value={pageAccessToken}
                  onChange={(e) => setPageAccessToken(e.target.value)}
                  placeholder="Paste your Facebook Page Access Token here..."
                  className="w-full bg-input text-foreground border border-border p-4 font-mono text-sm"
                  rows={6}
                  disabled={isLoading}
                />
                <p className="text-muted-foreground text-sm mt-4">
                  Get your Page Access Token from{" "}
                  <a
                    href="https://developers.facebook.com/docs/pages-api/getting-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-accent"
                  >
                    Facebook Developers
                  </a>
                </p>
              </div>

              <div className="divider-red"></div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-industrial"
              >
                {isLoading ? "CONNECTING..." : "CONNECT PAGE"}
              </button>
            </form>
          </div>

          {/* Instructions */}
          <div className="mt-12 card-industrial">
            <h3 className="text-3xl font-black tracking-tighter mb-6">HOW TO GET ACCESS TOKEN</h3>
            <ol className="space-y-4 text-lg">
              <li className="flex gap-4">
                <span className="font-black text-accent min-w-8">1.</span>
                <span>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Facebook Developers</a></span>
              </li>
              <li className="flex gap-4">
                <span className="font-black text-accent min-w-8">2.</span>
                <span>Create or select your app</span>
              </li>
              <li className="flex gap-4">
                <span className="font-black text-accent min-w-8">3.</span>
                <span>Go to Tools → Graph API Explorer</span>
              </li>
              <li className="flex gap-4">
                <span className="font-black text-accent min-w-8">4.</span>
                <span>Select your Page from the dropdown</span>
              </li>
              <li className="flex gap-4">
                <span className="font-black text-accent min-w-8">5.</span>
                <span>Copy the Access Token and paste it above</span>
              </li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
