import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Wand2, RefreshCw, Check, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AIPostGeneratorProps {
  pageId: number;
}

export default function AIPostGenerator({ pageId }: AIPostGeneratorProps) {
  const { user } = useAuth();
  const [location, setLocation] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedTone, setSelectedTone] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [validation, setValidation] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: tones } = trpc.tones.list.useQuery({ pageId });
  const { data: groups } = trpc.groups.list.useQuery({ pageId });
  const generateMutation = trpc.aiGeneration.generatePost.useMutation();

  const handleGenerate = async () => {
    if (!location.trim()) {
      toast.error("Please enter a location");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        pageId,
        location,
        topic: topic || undefined,
        tone: selectedTone || undefined,
      });

      setGeneratedContent(result.content);
      setValidation(result.validation);

      if (result.validation.decision === "PASS") {
        toast.success("Post generated and validated successfully!");
      } else if (result.validation.decision === "WARN") {
        toast.warning("Post generated but requires review");
      } else {
        toast.error("Post blocked by validation");
      }
    } catch (error) {
      toast.error("Failed to generate post");
    } finally {
      setIsGenerating(false);
    }
  };

  const getValidationIcon = () => {
    if (!validation) return null;
    if (validation.decision === "PASS") return <Check className="text-green-500" size={24} />;
    if (validation.decision === "WARN") return <AlertCircle className="text-yellow-500" size={24} />;
    return <XCircle className="text-red-500" size={24} />;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-black tracking-tighter mb-4">AI POST GENERATOR</h2>
        <p className="text-muted-foreground">
          Generate engaging posts with AI, validated by Filtry Tonoyana
        </p>
      </div>

      <div className="divider-red"></div>

      {/* Generation Form */}
      <div className="card-industrial space-y-4">
        <h3 className="text-xl font-black">GENERATE NEW POST</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-black mb-2">Location *</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Warsaw, Poland"
              className="bg-input border-border"
            />
          </div>

          <div>
            <label className="block text-sm font-black mb-2">Topic</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., New Product Launch"
              className="bg-input border-border"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-black mb-2">Tone</label>
          <Select value={selectedTone} onValueChange={setSelectedTone}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="Select tone..." />
            </SelectTrigger>
            <SelectContent>
              {tones?.map((tone: any) => (
                <SelectItem key={tone.id} value={tone.toneName}>
                  {tone.toneName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !location.trim()}
          className="w-full bg-accent text-background font-black hover:bg-accent/90 h-12"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              GENERATING...
            </>
          ) : (
            <>
              <Wand2 className="mr-2" size={20} />
              GENERATE POST
            </>
          )}
        </Button>
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="space-y-4">
          <div className="divider-red"></div>

          <div className="card-industrial">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-black">GENERATED CONTENT</h3>
              {getValidationIcon()}
            </div>

            <div className="bg-muted p-4 rounded mb-4 min-h-24">
              <p className="text-foreground whitespace-pre-wrap">{generatedContent}</p>
            </div>

            {validation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Validation Score:</span>
                  <span className="text-lg font-black text-accent">
                    {validation.overallScore}/100
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Decision:</span>
                  <span
                    className={`px-3 py-1 font-black text-xs ${
                      validation.decision === "PASS"
                        ? "bg-green-500/20 text-green-400"
                        : validation.decision === "WARN"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {validation.decision}
                  </span>
                </div>

                {validation.issues && validation.issues.length > 0 && (
                  <div>
                    <p className="text-xs font-black mb-2">Issues:</p>
                    <ul className="text-xs space-y-1">
                      {validation.issues.map((issue: string, i: number) => (
                        <li key={i} className="text-muted-foreground">
                          • {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.suggestions && validation.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-black mb-2">Suggestions:</p>
                    <ul className="text-xs space-y-1">
                      {validation.suggestions.map((suggestion: string, i: number) => (
                        <li key={i} className="text-muted-foreground">
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
