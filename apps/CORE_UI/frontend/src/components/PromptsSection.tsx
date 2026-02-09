"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Save,
  RotateCcw,
  Search,
  Loader2,
  Pencil,
  X,
  Check,
  Thermometer,
  Hash,
  Braces,
  Tag,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  FileText,
} from "lucide-react";

const OPAL_BASE_URL = "/api/opal/proxy";

// ============================================================================
// Types
// ============================================================================

interface PromptEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  caller: string;
  content: string;
  default_content: string;
  temperature: number;
  max_tokens: number;
  json_mode: boolean;
  updated_at: string;
  variables: string[];
}

// ============================================================================
// Main Component
// ============================================================================

export default function PromptsSection() {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [categories, setCategories] = useState<Record<string, PromptEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showNewPrompt, setShowNewPrompt] = useState(false);

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch(`${OPAL_BASE_URL}/api/prompts`);
      if (!res.ok) throw new Error("Failed to fetch prompts");
      const data = await res.json();
      setPrompts(data.prompts || []);
      setCategories(data.categories || {});
      // Auto-expand all categories on first load
      if (expandedCategories.size === 0 && data.categories) {
        setExpandedCategories(new Set(Object.keys(data.categories)));
      }
    } catch (err: any) {
      console.error("Failed to fetch prompts:", err);
      toast.error("Failed to load prompts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const filteredPrompts = searchQuery.trim()
    ? prompts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : prompts;

  const filteredCategories: Record<string, PromptEntry[]> = {};
  for (const p of filteredPrompts) {
    if (!filteredCategories[p.category]) filteredCategories[p.category] = [];
    filteredCategories[p.category].push(p);
  }

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            System Prompts
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {prompts.length} prompts across {Object.keys(categories).length} categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-64"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewPrompt(!showNewPrompt)}
            className="gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New Prompt
          </Button>
        </div>
      </div>

      {/* New Prompt Form */}
      {showNewPrompt && (
        <NewPromptForm
          onCreated={() => {
            setShowNewPrompt(false);
            fetchPrompts();
          }}
          onCancel={() => setShowNewPrompt(false)}
        />
      )}

      {/* Prompt List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(filteredCategories).map(([category, catPrompts]) => (
            <div key={category} className="space-y-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2 w-full text-left group"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {category}
                </h3>
                <Badge variant="secondary" className="text-[10px]">
                  {catPrompts.length}
                </Badge>
              </button>

              {/* Category Prompts */}
              {expandedCategories.has(category) && (
                <div className="space-y-3 ml-6">
                  {catPrompts.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      isEditing={editingId === prompt.id}
                      onEdit={() => setEditingId(prompt.id)}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        fetchPrompts();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {Object.keys(filteredCategories).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No prompts match your search" : "No prompts found"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Prompt Card
// ============================================================================

function PromptCard({
  prompt,
  isEditing,
  onEdit,
  onCancel,
  onSaved,
}: {
  prompt: PromptEntry;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(prompt.content);
  const [temperature, setTemperature] = useState(prompt.temperature);
  const [maxTokens, setMaxTokens] = useState(prompt.max_tokens);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isModified = prompt.content !== prompt.default_content;
  const hasChanges = content !== prompt.content || temperature !== prompt.temperature || maxTokens !== prompt.max_tokens;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${OPAL_BASE_URL}/api/prompts/${prompt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, temperature, max_tokens: maxTokens }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`Saved "${prompt.name}"`);
      onSaved();
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset this prompt to its default content?")) return;
    setResetting(true);
    try {
      const res = await fetch(`${OPAL_BASE_URL}/api/prompts/${prompt.id}/reset`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reset");
      const updated = await res.json();
      setContent(updated.content);
      toast.success("Reset to default");
      onSaved();
    } catch (err: any) {
      toast.error(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  // Reset local state when prompt changes
  useEffect(() => {
    setContent(prompt.content);
    setTemperature(prompt.temperature);
    setMaxTokens(prompt.max_tokens);
  }, [prompt]);

  return (
    <Card className={cn("transition-all", isEditing && "ring-1 ring-blue-500/50")}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {prompt.name}
              </h4>
              {isModified && (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">
                  modified
                </Badge>
              )}
              {prompt.json_mode && (
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/30">
                  <Braces className="w-2.5 h-2.5 mr-0.5" />
                  JSON
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {prompt.description}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2" title="Copy">
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2" title="Edit">
                  <Pencil className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2" title="Cancel">
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {prompt.caller}
          </span>
          <span className="flex items-center gap-1">
            <Thermometer className="w-3 h-3" />
            {prompt.temperature}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {prompt.max_tokens} tokens
          </span>
          {prompt.variables.length > 0 && (
            <span className="flex items-center gap-1">
              <Braces className="w-3 h-3" />
              {prompt.variables.length} vars
            </span>
          )}
        </div>

        {/* Content — read-only or editable */}
        {isEditing ? (
          <>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-xs min-h-[200px] resize-y bg-background"
              placeholder="Prompt content..."
            />

            {/* Settings row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Temperature:</label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                  className="w-20 h-7 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Max tokens:</label>
                <Input
                  type="number"
                  min={100}
                  max={16000}
                  step={100}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
                  className="w-24 h-7 text-xs"
                />
              </div>
            </div>

            {/* Variables */}
            {prompt.variables.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Variables:</span>
                {prompt.variables.map((v) => (
                  <Badge key={v} variant="outline" className="text-[10px] font-mono">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="gap-1"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={resetting || !isModified}
                className="gap-1"
              >
                {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Reset to Default
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <pre className="text-xs font-mono text-muted-foreground bg-muted/30 rounded-md p-3 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
            {prompt.content}
          </pre>
        )}

        {/* Updated timestamp */}
        <div className="text-[10px] text-muted-foreground/60">
          Updated: {new Date(prompt.updated_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// New Prompt Form
// ============================================================================

function NewPromptForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Custom");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!id.trim() || !name.trim() || !content.trim()) {
      toast.error("ID, name, and content are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${OPAL_BASE_URL}/api/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id.trim(), name: name.trim(), description, category, content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create");
      }
      toast.success(`Created prompt "${name}"`);
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-border p-4 bg-muted/20 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Plus className="w-4 h-4 text-blue-400" />
        New Custom Prompt
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">ID (slug)</label>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "-"))}
            placeholder="my-custom-prompt"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Custom Prompt"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Category</label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Custom"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this prompt does..."
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Content</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your prompt content..."
          className="font-mono text-xs min-h-[120px]"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleCreate} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Create
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
