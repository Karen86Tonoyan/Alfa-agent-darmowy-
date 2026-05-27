import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface PostHistoryProps {
  pageId: number;
}

export default function PostHistory({ pageId }: PostHistoryProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "published" | "failed" | "scheduled">("all");

  const { data: posts, isLoading } = trpc.scheduledPosts.list.useQuery({ pageId });

  const filteredPosts = posts?.filter((post) => {
    if (filter === "all") return true;
    return post.status === filter;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle size={20} className="text-accent" />;
      case "failed":
        return <AlertCircle size={20} className="text-red-500" />;
      case "scheduled":
        return <Clock size={20} className="text-yellow-500" />;
      default:
        return <Clock size={20} className="text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-accent text-background";
      case "failed":
        return "bg-red-600 text-white";
      case "scheduled":
        return "bg-yellow-600 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-black tracking-tighter mb-4">POST HISTORY</h2>
        <p className="text-muted-foreground">View all posts, their status, and performance</p>
      </div>

      <div className="divider-red"></div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "published", "scheduled", "failed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-4 py-2 font-black uppercase text-sm transition-colors ${
              filter === tab
                ? "bg-accent text-background"
                : "bg-muted text-muted-foreground hover:bg-input"
            }`}
          >
            {tab === "all" ? "All Posts" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="divider-red"></div>

      {/* Statistics */}
      {posts && posts.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card-industrial text-center">
            <div className="text-2xl font-black text-accent">{posts.length}</div>
            <div className="text-xs text-muted-foreground mt-2">Total Posts</div>
          </div>
          <div className="card-industrial text-center">
            <div className="text-2xl font-black text-accent">
              {posts.filter((p) => p.status === "published").length}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Published</div>
          </div>
          <div className="card-industrial text-center">
            <div className="text-2xl font-black text-accent">
              {posts.filter((p) => p.status === "scheduled").length}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Scheduled</div>
          </div>
          <div className="card-industrial text-center">
            <div className="text-2xl font-black text-accent">
              {posts.filter((p) => p.status === "failed").length}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Failed</div>
          </div>
        </div>
      )}

      <div className="divider-red"></div>

      {/* Posts List */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="card-industrial">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getStatusIcon(post.status)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-black line-clamp-2">{post.content}</h3>
                    <span className={`px-3 py-1 text-xs font-black uppercase whitespace-nowrap ml-4 ${getStatusColor(post.status)}`}>
                      {post.status}
                    </span>
                  </div>

                  <div className="flex gap-4 text-sm flex-wrap mb-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar size={14} />
                      {new Date(post.scheduledFor).toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(post.scheduledFor).toLocaleTimeString()}
                    </span>
                    {post.publishedAt && (
                      <span className="text-accent">
                        Published: {new Date(post.publishedAt).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {post.errorMessage && (
                    <div className="bg-red-900/20 border border-red-600 p-3 rounded text-red-400 text-sm mb-3">
                      <strong>Error:</strong> {post.errorMessage}
                    </div>
                  )}

                  {post.facebookPostId && (
                    <div className="text-xs text-muted-foreground">
                      Facebook Post ID: <code className="font-mono">{post.facebookPostId}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">
            {posts && posts.length === 0
              ? "No posts yet. Create and schedule your first post."
              : `No ${filter} posts.`}
          </p>
        </div>
      )}
    </div>
  );
}
