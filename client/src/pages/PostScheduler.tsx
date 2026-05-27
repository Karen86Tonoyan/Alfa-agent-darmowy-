import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Trash2, Plus, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

interface PostSchedulerProps {
  pageId: number;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PostScheduler({ pageId }: PostSchedulerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    content: "",
    mediaUrls: "",
    scheduledDate: "",
    scheduledTime: "09:00",
    dayOfWeek: "",
    isRecurring: 0,
    selectedGroups: [] as number[],
    selectedSkills: [] as number[],
  });

  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = trpc.scheduledPosts.list.useQuery({ pageId });
  const { data: groups, isLoading: groupsLoading } = trpc.groups.list.useQuery({ pageId });
  const { data: skills, isLoading: skillsLoading } = trpc.skills.list.useQuery({ pageId });

  const createPostMutation = trpc.scheduledPosts.create.useMutation();
  const deletePostMutation = trpc.scheduledPosts.delete.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      toast.error("Post content is required");
      return;
    }

    if (!formData.scheduledDate && !formData.dayOfWeek) {
      toast.error("Select either a specific date or recurring day");
      return;
    }

    if (formData.selectedGroups.length === 0) {
      toast.error("Select at least one group");
      return;
    }

    try {
      const scheduledFor = formData.scheduledDate
        ? new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
        : new Date();

      await createPostMutation.mutateAsync({
        pageId,
        content: formData.content,
        mediaUrls: formData.mediaUrls || undefined,
        groupIds: formData.selectedGroups.join(","),
        skillIds: formData.selectedSkills.join(",") || undefined,
        scheduledFor,
        dayOfWeek: formData.dayOfWeek || undefined,
        isRecurring: formData.isRecurring,
      });

      toast.success("Post scheduled successfully");
      setFormData({
        content: "",
        mediaUrls: "",
        scheduledDate: "",
        scheduledTime: "09:00",
        dayOfWeek: "",
        isRecurring: 0,
        selectedGroups: [],
        selectedSkills: [],
      });
      setIsCreating(false);
      refetchPosts();
    } catch (error: any) {
      toast.error(error.message || "Failed to schedule post");
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Delete this scheduled post?")) return;

    try {
      await deletePostMutation.mutateAsync({ postId, pageId });
      toast.success("Post deleted");
      refetchPosts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post");
    }
  };

  const isLoading = postsLoading || groupsLoading || skillsLoading;

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
        <h2 className="text-4xl font-black tracking-tighter mb-4">POST SCHEDULER</h2>
        <p className="text-muted-foreground">Schedule posts to be published across your target groups</p>
      </div>

      <div className="divider-red"></div>

      {/* Schedule Form */}
      {isCreating ? (
        <div className="card-industrial">
          <h3 className="text-2xl font-black mb-6">SCHEDULE NEW POST</h3>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-black mb-2">POST CONTENT</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-input text-foreground border border-border p-3"
                rows={5}
                placeholder="Write your post content here..."
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-2">MEDIA URLS (Optional)</label>
              <input
                type="text"
                value={formData.mediaUrls}
                onChange={(e) => setFormData({ ...formData, mediaUrls: e.target.value })}
                className="w-full bg-input text-foreground border border-border p-3"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="divider-red"></div>

            {/* Scheduling Options */}
            <div>
              <h4 className="text-lg font-black mb-4">SCHEDULE</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black mb-2">SPECIFIC DATE</label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full bg-input text-foreground border border-border p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black mb-2">TIME</label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full bg-input text-foreground border border-border p-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black mb-2">OR RECURRING DAY</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value, isRecurring: e.target.value ? 1 : 0 })}
                    className="w-full bg-input text-foreground border border-border p-3"
                  >
                    <option value="">Select a day for recurring posts...</option>
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day} value={day}>
                        Every {day} at {formData.scheduledTime}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="divider-red"></div>

            {/* Target Selection */}
            <div>
              <h4 className="text-lg font-black mb-4">TARGET GROUPS</h4>
              {groups && groups.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto bg-muted p-3">
                  {groups.map((group) => (
                    <label key={group.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.selectedGroups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedGroups: [...formData.selectedGroups, group.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedGroups: formData.selectedGroups.filter((id) => id !== group.id),
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span>{group.groupName} {group.location && `(${group.location})`}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No groups available. Add groups first.</p>
              )}
            </div>

            {/* Skills Selection */}
            {skills && skills.length > 0 && (
              <div>
                <h4 className="text-lg font-black mb-4">APPLY SKILLS (Optional)</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto bg-muted p-3">
                  {skills.map((skill) => (
                    <label key={skill.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.selectedSkills.includes(skill.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedSkills: [...formData.selectedSkills, skill.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedSkills: formData.selectedSkills.filter((id) => id !== skill.id),
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span>{skill.skillName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" className="btn-industrial flex-1">
                SCHEDULE POST
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
          <Plus size={20} /> SCHEDULE POST
        </button>
      )}

      <div className="divider-red"></div>

      {/* Scheduled Posts List */}
      {posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="card-industrial">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-black mb-2 line-clamp-2">{post.content}</h3>
                  <div className="flex gap-4 text-sm flex-wrap mb-3">
                    <span className="flex items-center gap-1 px-3 py-1 bg-muted text-muted-foreground">
                      <Calendar size={14} />
                      {new Date(post.scheduledFor).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1 bg-muted text-muted-foreground">
                      <Clock size={14} />
                      {new Date(post.scheduledFor).toLocaleTimeString()}
                    </span>
                    <span className={`px-3 py-1 uppercase text-xs font-black ${
                      post.status === "published" ? "bg-accent text-background" :
                      post.status === "failed" ? "bg-red-600 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {post.status}
                    </span>
                    {post.isRecurring && (
                      <span className="px-3 py-1 bg-muted text-muted-foreground">
                        Recurring: {post.dayOfWeek}
                      </span>
                    )}
                  </div>
                  {post.errorMessage && (
                    <p className="text-red-400 text-sm">Error: {post.errorMessage}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="ml-4 p-3 hover:bg-muted transition-colors"
                  title="Delete post"
                >
                  <Trash2 size={20} className="text-accent" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">No scheduled posts yet. Create your first post to get started.</p>
        </div>
      )}
    </div>
  );
}
