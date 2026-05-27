import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface KnowledgeManagerProps {
  pageId: number;
}

export default function KnowledgeManager({ pageId }: KnowledgeManagerProps) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
  });

  const { data: articles, isLoading, refetch } = trpc.knowledge.list.useQuery({ pageId });
  const createArticleMutation = trpc.knowledge.create.useMutation();
  const deleteArticleMutation = trpc.knowledge.delete.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    try {
      await createArticleMutation.mutateAsync({
        pageId,
        ...formData,
      });
      toast.success("Article created successfully");
      setFormData({
        title: "",
        content: "",
        category: "",
        tags: "",
      });
      setIsCreating(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create article");
    }
  };

  const handleDelete = async (articleId: number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      await deleteArticleMutation.mutateAsync({ articleId, pageId });
      toast.success("Article deleted");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete article");
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
        <h2 className="text-4xl font-black tracking-tighter mb-4">KNOWLEDGE BASE</h2>
        <p className="text-muted-foreground">Store product information, FAQs, and company knowledge for AI reference</p>
      </div>

      <div className="divider-red"></div>

      {/* Create Form */}
      {isCreating ? (
        <div className="card-industrial">
          <h3 className="text-2xl font-black mb-6">NEW ARTICLE</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-black mb-2">TITLE</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-input text-foreground border border-border p-3"
                placeholder="Article title"
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-2">CONTENT</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-input text-foreground border border-border p-3"
                rows={6}
                placeholder="Article content..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black mb-2">CATEGORY</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-input text-foreground border border-border p-3"
                  placeholder="e.g., Product"
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-2">TAGS</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full bg-input text-foreground border border-border p-3"
                  placeholder="comma, separated, tags"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-industrial flex-1">
                CREATE ARTICLE
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="btn-industrial flex-1 bg-muted text-muted-foreground"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setIsCreating(true)} className="btn-industrial inline-flex items-center gap-2">
          <Plus size={20} /> NEW ARTICLE
        </button>
      )}

      <div className="divider-red"></div>

      {/* Articles List */}
      {articles && articles.length > 0 ? (
        <div className="space-y-4">
          {articles.map((article) => (
            <div key={article.id} className="card-industrial">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-black mb-2">{article.title}</h3>
                  <p className="text-muted-foreground mb-3 line-clamp-2">{article.content}</p>
                  <div className="flex gap-4 text-sm flex-wrap">
                    {article.category && (
                      <span className="px-3 py-1 bg-muted text-muted-foreground">
                        {article.category}
                      </span>
                    )}
                    {article.tags && (
                      <span className="px-3 py-1 bg-muted text-muted-foreground">
                        {article.tags}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-accent text-background">
                      Used {article.usageCount} times
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="ml-4 p-3 hover:bg-muted transition-colors"
                  title="Delete article"
                >
                  <Trash2 size={20} className="text-accent" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">No articles yet. Create your first article to get started.</p>
        </div>
      )}
    </div>
  );
}
