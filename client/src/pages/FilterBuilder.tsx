import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface FilterBuilderProps {
  pageId: number;
}

const CONDITION_TYPES = [
  { value: "location", label: "Location" },
  { value: "groupSize", label: "Group Size" },
  { value: "category", label: "Category" },
  { value: "engagementScore", label: "Engagement Score" },
  { value: "memberActivity", label: "Member Activity" },
  { value: "postFrequency", label: "Post Frequency" },
];

const OPERATORS = {
  location: ["equals", "contains", "startsWith"],
  groupSize: ["equals", "greaterThan", "lessThan", "between"],
  category: ["equals", "contains"],
  engagementScore: ["equals", "greaterThan", "lessThan", "between"],
  memberActivity: ["high", "medium", "low"],
  postFrequency: ["daily", "weekly", "monthly"],
};

export default function FilterBuilder({ pageId }: FilterBuilderProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState<"location" | "size" | "category" | "engagement" | "custom" | "combined">("custom");
  const [conditions, setConditions] = useState<Array<{
    id: string;
    conditionType: string;
    operator: string;
    value: string;
    logicalOperator: "AND" | "OR";
  }>>([]);

  const { data: filters, isLoading, refetch } = trpc.filters.list.useQuery({ pageId });
  const createFilterMutation = trpc.filters.create.useMutation();
  const deleteFilterMutation = trpc.filters.delete.useMutation();

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        id: Math.random().toString(),
        conditionType: "location",
        operator: "equals",
        value: "",
        logicalOperator: "AND",
      },
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const handleConditionChange = (id: string, field: string, value: string) => {
    setConditions(
      conditions.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  };

  const handleCreateFilter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filterName.trim()) {
      toast.error("Filter name is required");
      return;
    }

    if (conditions.length === 0) {
      toast.error("Add at least one condition");
      return;
    }

    try {
      await createFilterMutation.mutateAsync({
        pageId,
        filterName,
        filterType,
        description: `Filter with ${conditions.length} condition(s)`,
        isSaved: 1,
      });
      toast.success("Filter created successfully");
      setFilterName("");
      setFilterType("custom");
      setConditions([]);
      setIsCreating(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create filter");
    }
  };

  const handleDeleteFilter = async (filterId: number) => {
    if (!confirm("Delete this filter?")) return;

    try {
      await deleteFilterMutation.mutateAsync({ filterId, pageId });
      toast.success("Filter deleted");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete filter");
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
        <h2 className="text-4xl font-black tracking-tighter mb-4">ADVANCED FILTERS</h2>
        <p className="text-muted-foreground">Build complex filters to target specific groups based on multiple criteria</p>
      </div>

      <div className="divider-red"></div>

      {/* Filter Builder */}
      {isCreating ? (
        <div className="card-industrial">
          <h3 className="text-2xl font-black mb-6">BUILD NEW FILTER</h3>
          <form onSubmit={handleCreateFilter} className="space-y-6">
            <div>
              <label className="block text-sm font-black mb-2">FILTER NAME</label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full bg-input text-foreground border border-border p-3"
                placeholder="e.g., High Engagement Groups"
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-2">FILTER TYPE</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full bg-input text-foreground border border-border p-3"
              >
                <option value="location">Location-based</option>
                <option value="size">Size-based</option>
                <option value="category">Category-based</option>
                <option value="engagement">Engagement-based</option>
                <option value="custom">Custom</option>
                <option value="combined">Combined</option>
              </select>
            </div>

            <div className="divider-red"></div>

            {/* Conditions */}
            <div>
              <h4 className="text-lg font-black mb-4">CONDITIONS</h4>
              <div className="space-y-4">
                {conditions.map((condition, index) => (
                  <div key={condition.id} className="bg-muted p-4 space-y-3">
                    {index > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <select
                          value={condition.logicalOperator}
                          onChange={(e) =>
                            handleConditionChange(condition.id, "logicalOperator", e.target.value)
                          }
                          className="bg-input text-foreground border border-border px-3 py-1 text-sm font-black"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={condition.conditionType}
                        onChange={(e) =>
                          handleConditionChange(condition.id, "conditionType", e.target.value)
                        }
                        className="bg-input text-foreground border border-border p-2 text-sm"
                      >
                        {CONDITION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) =>
                          handleConditionChange(condition.id, "operator", e.target.value)
                        }
                        className="bg-input text-foreground border border-border p-2 text-sm"
                      >
                        {(OPERATORS[condition.conditionType as keyof typeof OPERATORS] || []).map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) =>
                            handleConditionChange(condition.id, "value", e.target.value)
                          }
                          className="flex-1 bg-input text-foreground border border-border p-2 text-sm"
                          placeholder="Value"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(condition.id)}
                          className="p-2 hover:bg-accent hover:text-background transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddCondition}
                className="mt-4 btn-industrial inline-flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> ADD CONDITION
              </button>
            </div>

            <div className="divider-red"></div>

            <div className="flex gap-3">
              <button type="submit" className="btn-industrial flex-1">
                CREATE FILTER
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setFilterName("");
                  setConditions([]);
                }}
                className="btn-industrial flex-1 bg-muted text-muted-foreground"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setIsCreating(true)} className="btn-industrial inline-flex items-center gap-2">
          <Plus size={20} /> NEW FILTER
        </button>
      )}

      <div className="divider-red"></div>

      {/* Filters List */}
      {filters && filters.length > 0 ? (
        <div className="space-y-4">
          {filters.map((filter) => (
            <div key={filter.id} className="card-industrial">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-black mb-2">{filter.filterName}</h3>
                  {filter.description && (
                    <p className="text-muted-foreground mb-3">{filter.description}</p>
                  )}
                  <div className="flex gap-4 text-sm flex-wrap">
                    <span className="px-3 py-1 bg-muted text-muted-foreground uppercase text-xs font-black">
                      {filter.filterType}
                    </span>
                    <span className={`px-3 py-1 ${filter.isActive ? "bg-accent text-background" : "bg-muted text-muted-foreground"} uppercase text-xs font-black`}>
                      {filter.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                    {filter.matchedGroupCount && (
                      <span className="px-3 py-1 bg-muted text-muted-foreground">
                        Matches {filter.matchedGroupCount} groups
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFilter(filter.id)}
                  className="ml-4 p-3 hover:bg-muted transition-colors"
                  title="Delete filter"
                >
                  <Trash2 size={20} className="text-accent" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">No filters yet. Create your first filter to get started.</p>
        </div>
      )}
    </div>
  );
}
