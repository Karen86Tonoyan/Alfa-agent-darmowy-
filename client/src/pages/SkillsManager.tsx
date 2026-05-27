import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface SkillsManagerProps {
  pageId: number;
}

export default function SkillsManager({ pageId }: SkillsManagerProps) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    skillName: "",
    description: "",
    category: "",
    template: "",
    systemPrompt: "",
  });

  const { data: skills, isLoading, refetch } = trpc.skills.list.useQuery({ pageId });
  const createSkillMutation = trpc.skills.create.useMutation();
  const deleteSkillMutation = trpc.skills.delete.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.skillName.trim()) {
      toast.error("Skill name is required");
      return;
    }

    try {
      await createSkillMutation.mutateAsync({
        pageId,
        ...formData,
      });
      toast.success("Skill created successfully");
      setFormData({
        skillName: "",
        description: "",
        category: "",
        template: "",
        systemPrompt: "",
      });
      setIsCreating(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create skill");
    }
  };

  const handleDelete = async (skillId: number) => {
    if (!confirm("Are you sure you want to delete this skill?")) return;

    try {
      await deleteSkillMutation.mutateAsync({ skillId, pageId });
      toast.success("Skill deleted");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete skill");
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
        <h2 className="text-4xl font-black tracking-tighter mb-4">SKILLS LIBRARY</h2>
        <p className="text-muted-foreground">Create reusable skills and templates for AI-powered content generation</p>
      </div>

      <div className="divider-red"></div>

      {/* Create Form */}
      {isCreating ? (
        <div className="card-industrial">
          <h3 className="text-2xl font-black mb-6">NEW SKILL</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-black mb-2">SKILL NAME</label>
              <input
                type="text"
                value={formData.skillName}
                onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                className="w-full bg-input text-foreground border border-border p-3"
                placeholder="e.g., Product Promotion"
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-2">DESCRIPTION</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-input text-foreground border border-border p-3"
                rows={2}
                placeholder="What is this skill for?"
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
                  placeholder="e.g., Marketing"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black mb-2">TEMPLATE</label>
              <textarea
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="w-full bg-input text-foreground border border-border p-3 font-mono text-xs"
                rows={4}
                placeholder="Template structure for this skill..."
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-2">SYSTEM PROMPT</label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                className="w-full bg-input text-foreground border border-border p-3 font-mono text-xs"
                rows={4}
                placeholder="AI system prompt for this skill..."
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-industrial flex-1">
                CREATE SKILL
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
          <Plus size={20} /> NEW SKILL
        </button>
      )}

      <div className="divider-red"></div>

      {/* Skills List */}
      {skills && skills.length > 0 ? (
        <div className="space-y-4">
          {skills.map((skill) => (
            <div key={skill.id} className="card-industrial">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-black mb-2">{skill.skillName}</h3>
                  {skill.description && (
                    <p className="text-muted-foreground mb-3">{skill.description}</p>
                  )}
                  <div className="flex gap-4 text-sm">
                    {skill.category && (
                      <span className="px-3 py-1 bg-muted text-muted-foreground">
                        {skill.category}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-muted text-muted-foreground">
                      v{skill.version}
                    </span>
                    <span className={`px-3 py-1 ${skill.isActive ? "bg-accent text-background" : "bg-muted text-muted-foreground"}`}>
                      {skill.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(skill.id)}
                  className="ml-4 p-3 hover:bg-muted transition-colors"
                  title="Delete skill"
                >
                  <Trash2 size={20} className="text-accent" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">No skills yet. Create your first skill to get started.</p>
        </div>
      )}
    </div>
  );
}
