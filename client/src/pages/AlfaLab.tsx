import { useState } from "react";
import { useAuth } from "../_core/hooks/useAuth";
import { DashboardLayout } from "../components/DashboardLayout";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function AlfaLab() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [depth, setDepth] = useState<"LIGHT" | "MEDIUM" | "HEAVY" | "FULL" | "AUTO">("HEAVY");
  const [pageId, setPageId] = useState<number | null>(null);

  const pagesQuery = trpc.facebookPages.list.useQuery();
  const validate = trpc.aiGeneration.validateContent.useMutation();

  const runAnalysis = () => {
    if (!text.trim() || !pageId) return;
    validate.mutate({ pageId, content: text });
  };

  const report = validate.data;

  return (
    <DashboardLayout title="ALFA Lab" subtitle="Test any text against the full deterministic anti-hallucination pipeline">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-zinc-950 border border-red-900/30 p-6 rounded-2xl">
          <div className="uppercase text-xs tracking-[3px] text-red-500 mb-2">KOZACKI MODE</div>
          <h1 className="text-4xl font-bold tracking-tighter">ALFA Validator</h1>
          <p className="text-zinc-400 mt-2 max-w-2xl">
            Paste any marketing copy, reply, or claim. Choose depth. See exactly why it would get BLOCKED, WARNED, or cleared.
            This is the same engine that protects your Facebook Page from AI bullshit.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">SELECT CONNECTED PAGE</div>
              <Select value={pageId?.toString() || ""} onValueChange={(v) => setPageId(Number(v))}>
                <SelectTrigger className="bg-black border-zinc-800">
                  <SelectValue placeholder="Choose a page to run analysis under..." />
                </SelectTrigger>
                <SelectContent>
                  {pagesQuery.data?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.pageName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">DEPTH</div>
              <Select value={depth} onValueChange={(v: any) => setDepth(v)}>
                <SelectTrigger className="bg-black border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">AUTO (recommended)</SelectItem>
                  <SelectItem value="LIGHT">LIGHT — fast regex only</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM — full 8 filters</SelectItem>
                  <SelectItem value="HEAVY">HEAVY — + risk/pressure/drift + evidence</SelectItem>
                  <SelectItem value="FULL">FULL — + simulator + full proof system</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">TEXT TO ANALYZE</div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the post, reply, or claim here..."
                className="min-h-[180px] bg-black border-zinc-800 font-mono text-sm"
              />
            </div>

            <Button 
              onClick={runAnalysis} 
              disabled={!text.trim() || !pageId || validate.isPending}
              className="w-full h-14 text-lg bg-white text-black hover:bg-zinc-200"
            >
              {validate.isPending ? "RUNNING ALFA..." : "ANALYZE WITH FULL ALFA PIPELINE"}
            </Button>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-zinc-950 border-zinc-800 p-5 h-full">
              <div className="text-xs uppercase tracking-[2px] text-red-500 mb-3">HOW IT WORKS</div>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li>• Risk, Pressure, Drift detectors run first</li>
                <li>• All 8 Filtry Tonoyana execute deterministically</li>
                <li>• Claims are extracted and evidence strength scored</li>
                <li>• HIGH severity or multiple flags = at least WARN</li>
                <li>• FULL depth adds response simulation + trajectory</li>
                <li>• Everything is explainable. No black box.</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500">
                This is the same logic that decides whether AI content touches your audience.
              </div>
            </Card>
          </div>
        </div>

        {report && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`px-8 py-3 rounded-2xl text-3xl font-mono tracking-tighter font-bold border ${report.decision === "PASS" ? "border-emerald-500 text-emerald-400" : report.decision === "WARN" ? "border-yellow-500 text-yellow-400" : "border-red-500 text-red-400"}`}>
                {report.decision} • {report.overallScore}/100
              </div>
              <div>
                <div className="text-xs text-zinc-500">DEPTH USED</div>
                <div className="font-mono text-xl">{report.depth}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.risk && (
                <Card className="p-5 bg-black border-zinc-800">
                  <div className="text-red-500 text-xs">RISK</div>
                  <div className="text-2xl mt-1">{report.risk.level} <span className="text-sm text-zinc-500">({report.risk.score})</span></div>
                </Card>
              )}
              {report.pressure && (
                <Card className="p-5 bg-black border-zinc-800">
                  <div className="text-red-500 text-xs">PRESSURE</div>
                  <div className="text-2xl mt-1">{report.pressure.level}</div>
                </Card>
              )}
              {report.blockedBy && (
                <Card className="p-5 bg-black border-zinc-800">
                  <div className="text-red-500 text-xs">BLOCKED BY</div>
                  <div className="mt-1 text-lg">{report.blockedBy.length ? report.blockedBy.join(", ") : "—"}</div>
                </Card>
              )}
            </div>

            <Card className="p-6 bg-zinc-950 border-zinc-800">
              <div className="uppercase text-xs tracking-widest text-zinc-500 mb-3">FILTER BREAKDOWN</div>
              <div className="space-y-2 font-mono text-sm">
                {report.results?.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className={r.passed ? "text-emerald-400" : "text-red-400"}>
                      {r.passed ? "✓" : "✗"} {r.filterName}
                    </span>
                    <span>{r.score} <span className="text-zinc-600">• {r.severity}</span></span>
                  </div>
                ))}
              </div>
            </Card>

            {report.proofChain && report.proofChain.length > 0 && (
              <Card className="p-6 bg-black border-zinc-800">
                <div className="uppercase text-xs tracking-widest text-zinc-500 mb-3">PROOF CHAIN</div>
                <ul className="space-y-2 text-sm">
                  {report.proofChain.map((p: string, i: number) => (
                    <li key={i} className="pl-4 border-l-2 border-red-900/50">→ {p}</li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="text-[10px] text-zinc-500 font-mono">
              ALFA v1.1 • Deterministic • No LLM used in the actual decision • {report.summary}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
