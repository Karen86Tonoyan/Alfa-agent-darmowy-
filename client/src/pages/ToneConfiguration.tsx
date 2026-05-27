import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Edit2, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ToneConfigProps {
  pageId: number;
}

const TONE_TYPES = ["formal", "informal", "friendly", "professional", "casual"];
const LANGUAGES = ["en", "pl", "es", "fr", "de", "it", "pt"];

export default function ToneConfiguration({ pageId }: ToneConfigProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    toneName: "",
    toneType: "professional",
    language: "en",
    keywordsToUse: "",
    keywordsToAvoid: "",
    systemPrompt: "",
    isDefault: false,
  });

  const { data: tones, isLoading, refetch } = trpc.tones.list.useQuery({ pageId });
  const createMutation = trpc.tones.create.useMutation();
  const updateMutation = trpc.tones.update.useMutation();
  const deleteMutation = trpc.tones.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          toneId: editingId,
          pageId,
          ...formData,
          toneType: formData.toneType as any,
        });
        toast.success("Tone updated successfully");
      } else {
        await createMutation.mutateAsync({
          pageId,
          ...formData,
          toneType: formData.toneType as any,
        });
        toast.success("Tone created successfully");
      }
      setFormData({
        toneName: "",
        toneType: "professional",
        language: "en",
        keywordsToUse: "",
        keywordsToAvoid: "",
        systemPrompt: "",
        isDefault: false,
      });
      setEditingId(null);
      setShowForm(false);
      refetch();
    } catch (error) {
      toast.error("Failed to save tone configuration");
    }
  };

  const handleDelete = async (toneId: number) => {
    if (!confirm("Are you sure you want to delete this tone configuration?")) return;
    try {
      await deleteMutation.mutateAsync({ toneId, pageId });
      toast.success("Tone deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete tone");
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
        <h2 className="text-4xl font-black tracking-tighter mb-4">TONE CONFIGURATION</h2>
        <p className="text-muted-foreground">Define communication styles for AI-generated messages</p>
      </div>

      <div className="divider-red"></div>

      {/* Add Tone Button */}
      <button
        onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setFormData({
            toneName: "",
            toneType: "professional",
            language: "en",
            keywordsToUse: "",
            keywordsToAvoid: "",
            systemPrompt: "",
            isDefault: false,
          });
        }}
        className="flex items-center gap-2 px-6 py-3 bg-accent text-background font-black hover:bg-accent/90 transition-colors"
      >
        <Plus size={20} />
        {showForm ? "CANCEL" : "ADD TONE"}
      </button>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-industrial space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black mb-2">Tone Name *</label>
              <Input
                required
                value={formData.toneName}
                onChange={(e) => setFormData({ ...formData, toneName: e.target.value })}
                placeholder="e.g., Customer Support"
                className="bg-input border-border"
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-2">Tone Type *</label>
              <Select value={formData.toneType} onValueChange={(v) => setFormData({ ...formData, toneType: v })}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black mb-2">Language</label>
              <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-black">Set as Default</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black mb-2">Keywords to Use</label>
            <Textarea
              value={formData.keywordsToUse}
              onChange={(e) => setFormData({ ...formData, keywordsToUse: e.target.value })}
              placeholder="Comma-separated keywords to include in responses"
              className="bg-input border-border"
            />
          </div>

          <div>
            <label className="block text-sm font-black mb-2">Keywords to Avoid</label>
            <Textarea
              value={formData.keywordsToAvoid}
              onChange={(e) => setFormData({ ...formData, keywordsToAvoid: e.target.value })}
              placeholder="Comma-separated keywords to avoid"
              className="bg-input border-border"
            />
          </div>

          <div>
            <label className="block text-sm font-black mb-2">System Prompt</label>
            <Textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              placeholder="Custom system prompt for AI message generation"
              className="bg-input border-border h-24"
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 bg-accent text-background font-black hover:bg-accent/90"
            >
              {editingId ? "UPDATE TONE" : "CREATE TONE"}
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

      {/* Tones List */}
      {tones && tones.length > 0 ? (
        <div className="space-y-4">
          {tones.map((tone) => (
            <div key={tone.id} className="card-industrial">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-black">{tone.toneName}</h3>
                    {tone.isDefault && (
                      <span className="px-2 py-1 bg-accent text-background text-xs font-black">DEFAULT</span>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm flex-wrap mb-3">
                    <span className="px-3 py-1 bg-muted text-muted-foreground">
                      {tone.toneType.charAt(0).toUpperCase() + tone.toneType.slice(1)}
                    </span>
                    <span className="px-3 py-1 bg-muted text-muted-foreground">
                      {tone.language.toUpperCase()}
                    </span>
                  </div>

                  {tone.keywordsToUse && (
                    <div className="mb-2">
                      <span className="text-xs font-black text-muted-foreground">Keywords to use:</span>
                      <p className="text-sm text-foreground">{tone.keywordsToUse}</p>
                    </div>
                  )}

                  {tone.keywordsToAvoid && (
                    <div className="mb-2">
                      <span className="text-xs font-black text-muted-foreground">Keywords to avoid:</span>
                      <p className="text-sm text-foreground">{tone.keywordsToAvoid}</p>
                    </div>
                  )}

                  {tone.systemPrompt && (
                    <div className="bg-muted p-3 rounded text-sm text-muted-foreground mb-2">
                      <span className="font-black">System Prompt:</span>
                      <p className="mt-1">{tone.systemPrompt}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(tone.id);
                      setFormData({
                        toneName: tone.toneName,
                        toneType: tone.toneType,
                        language: tone.language,
                        keywordsToUse: tone.keywordsToUse || "",
                        keywordsToAvoid: tone.keywordsToAvoid || "",
                        systemPrompt: tone.systemPrompt || "",
                        isDefault: tone.isDefault === 1,
                      });
                      setShowForm(true);
                    }}
                    className="p-3 hover:bg-muted transition-colors"
                    title="Edit tone"
                  >
                    <Edit2 size={20} className="text-accent" />
                  </button>
                  <button
                    onClick={() => handleDelete(tone.id)}
                    className="p-3 hover:bg-muted transition-colors"
                    title="Delete tone"
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
          <Settings size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">No tone configurations yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
