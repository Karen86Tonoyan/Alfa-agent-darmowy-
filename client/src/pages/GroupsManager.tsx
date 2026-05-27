import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface GroupsManagerProps {
  pageId: number;
}

export default function GroupsManager({ pageId }: GroupsManagerProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    groupName: "",
    groupUrl: "",
    location: "",
    description: "",
  });

  const { data: groups, isLoading, refetch } = trpc.groups.list.useQuery({ pageId });
  const createMutation = trpc.groups.create.useMutation();
  const updateMutation = trpc.groups.update.useMutation();
  const deleteMutation = trpc.groups.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          groupId: editingId,
          pageId,
          groupName: formData.groupName,
          location: formData.location,
          description: formData.description,
        });
        toast.success("Group updated successfully");
      } else {
        await createMutation.mutateAsync({
          pageId,
          groupId: `group_${Date.now()}`,
          groupName: formData.groupName,
          groupUrl: formData.groupUrl,
          location: formData.location,
          description: formData.description,
        });
        toast.success("Group added successfully");
      }
      setFormData({ groupName: "", groupUrl: "", location: "", description: "" });
      setEditingId(null);
      setShowForm(false);
      refetch();
    } catch (error) {
      toast.error("Failed to save group");
    }
  };

  const handleDelete = async (groupId: number) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      await deleteMutation.mutateAsync({ groupId, pageId });
      toast.success("Group deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete group");
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
        <h2 className="text-4xl font-black tracking-tighter mb-4">GROUPS MANAGER</h2>
        <p className="text-muted-foreground">Add and manage Facebook groups for posting</p>
      </div>

      <div className="divider-red"></div>

      {/* Add Group Button */}
      <button
        onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setFormData({ groupName: "", groupUrl: "", location: "", description: "" });
        }}
        className="flex items-center gap-2 px-6 py-3 bg-accent text-background font-black hover:bg-accent/90 transition-colors"
      >
        <Plus size={20} />
        {showForm ? "CANCEL" : "ADD GROUP"}
      </button>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-industrial space-y-4">
          <div>
            <label className="block text-sm font-black mb-2">Group Name *</label>
            <Input
              required
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              placeholder="e.g., Digital Marketing Professionals"
              className="bg-input border-border"
            />
          </div>

          <div>
            <label className="block text-sm font-black mb-2">Group URL</label>
            <Input
              value={formData.groupUrl}
              onChange={(e) => setFormData({ ...formData, groupUrl: e.target.value })}
              placeholder="https://facebook.com/groups/..."
              className="bg-input border-border"
            />
          </div>

          <div>
            <label className="block text-sm font-black mb-2">Location</label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Warsaw, Poland"
              className="bg-input border-border"
            />
          </div>

          <div>
            <label className="block text-sm font-black mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Group description and notes"
              className="bg-input border-border"
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 bg-accent text-background font-black hover:bg-accent/90"
            >
              {editingId ? "UPDATE GROUP" : "ADD GROUP"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              variant="outline"
              className="flex-1"
            >
              CANCEL
            </Button>
          </div>
        </form>
      )}

      <div className="divider-red"></div>

      {/* Groups List */}
      {groups && groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="card-industrial">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-black mb-2">{group.groupName}</h3>

                  <div className="flex gap-4 text-sm flex-wrap mb-3">
                    {group.location && (
                      <span className="px-3 py-1 bg-muted text-muted-foreground">
                        📍 {group.location}
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 ${
                        group.isActive ? "bg-accent text-background" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {group.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  {group.description && (
                    <p className="text-sm text-muted-foreground mb-2">{group.description}</p>
                  )}

                  {group.groupUrl && (
                    <a
                      href={group.groupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Visit Group →
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(group.id);
                      setFormData({
                        groupName: group.groupName,
                        groupUrl: group.groupUrl || "",
                        location: group.location || "",
                        description: group.description || "",
                      });
                      setShowForm(true);
                    }}
                    className="p-3 hover:bg-muted transition-colors"
                    title="Edit group"
                  >
                    <Edit2 size={20} className="text-accent" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="p-3 hover:bg-muted transition-colors"
                    title="Delete group"
                  >
                    <Trash2 size={20} className="text-accent" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">No groups yet. Add your first group to get started.</p>
        </div>
      )}

      {/* Stats */}
      {groups && groups.length > 0 && (
        <div className="mt-12 card-industrial">
          <h3 className="text-2xl font-black mb-6">GROUP STATISTICS</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-accent">{groups.length}</div>
              <div className="text-muted-foreground text-sm mt-2">Total Groups</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-accent">{groups.filter((g) => g.isActive).length}</div>
              <div className="text-muted-foreground text-sm mt-2">Active Groups</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
