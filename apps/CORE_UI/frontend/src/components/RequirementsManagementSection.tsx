"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  Save,
  X,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Requirement {
  id: string;
  title: string;
  text: string;
  category: string;
  priority: string;
  status: string;
  document_id?: string;
  created_at?: string;
  updated_at?: string;
}

export default function RequirementsManagementSection() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Requirement>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Fetch requirements
  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/requirements");
      const data = await response.json();
      setRequirements(data.requirements || []);
      setFilteredRequirements(data.requirements || []);
    } catch (error) {
      console.error("Failed to fetch requirements:", error);
      toast.error("Failed to load requirements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = requirements;

    if (searchQuery) {
      filtered = filtered.filter(
        (req) =>
          req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter((req) => req.category === filterCategory);
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter((req) => req.priority === filterPriority);
    }

    setFilteredRequirements(filtered);
  }, [searchQuery, filterCategory, filterPriority, requirements]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequirements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequirements.map((r) => r.id)));
    }
  };

  // CRUD operations
  const handleCreate = async (newReq: Partial<Requirement>) => {
    try {
      const response = await fetch("http://localhost:4000/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReq),
      });
      const data = await response.json();
      if (data.status === "success") {
        toast.success("Requirement created");
        fetchRequirements();
        setShowAddForm(false);
      }
    } catch (error) {
      toast.error("Failed to create requirement");
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Requirement>) => {
    try {
      const response = await fetch(`http://localhost:4000/api/requirements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.status === "success") {
        toast.success("Requirement updated");
        fetchRequirements();
        setEditingId(null);
      }
    } catch (error) {
      toast.error("Failed to update requirement");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/requirements/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.status === "success") {
        toast.success("Requirement deleted");
        fetchRequirements();
      }
    } catch (error) {
      toast.error("Failed to delete requirement");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const response = await fetch("http://localhost:4000/api/requirements/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.from(selectedIds)),
      });
      const data = await response.json();
      toast.success(`Deleted ${data.deleted} requirements`);
      if (data.errors > 0) {
        toast.warning(`${data.errors} errors occurred`);
      }
      fetchRequirements();
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Failed to delete requirements");
    }
  };

  // Import/Export
  const handleExport = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/requirements/export");
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data.requirements, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `requirements-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      toast.success("Requirements exported");
    } catch (error) {
      toast.error("Failed to export requirements");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const requirements = Array.isArray(data) ? data : data.requirements || [];

      const response = await fetch("http://localhost:4000/api/requirements/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requirements),
      });
      const result = await response.json();
      toast.success(`Imported ${result.created} requirements`);
      if (result.errors > 0) {
        toast.warning(`${result.errors} errors occurred`);
      }
      fetchRequirements();
    } catch (error) {
      toast.error("Failed to import requirements");
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Requirements Management
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (Dev Environment Only)
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Bulk import, edit, and manage requirements for testing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddForm(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Requirement
            </Button>
            <label>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  Import JSON
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
            <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search requirements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="functional">Functional</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="interface">Interface</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-primary/10 rounded">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="border-b border-border p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Add New Requirement</h3>
            <Button
              onClick={() => setShowAddForm(false)}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Requirement ID (auto-generated if empty)"
              value={editForm.id || ""}
              onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
            />
            <Input
              placeholder="Title"
              value={editForm.title || ""}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
            <Textarea
              placeholder="Requirement text"
              value={editForm.text || ""}
              onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
              className="col-span-2"
            />
            <Select
              value={editForm.category || "functional"}
              onValueChange={(v) => setEditForm({ ...editForm, category: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">Functional</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="interface">Interface</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={editForm.priority || "medium"}
              onValueChange={(v) => setEditForm({ ...editForm, priority: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button
              onClick={() => {
                setShowAddForm(false);
                setEditForm({});
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleCreate(editForm);
                setEditForm({});
              }}
              size="sm"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredRequirements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No requirements found</p>
            <p className="text-sm">Add or import requirements to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === filteredRequirements.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequirements.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(req.id)}
                      onCheckedChange={() => toggleSelection(req.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{req.id}</TableCell>
                  <TableCell>
                    {editingId === req.id ? (
                      <Input
                        value={editForm.title || req.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        className="h-8"
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{req.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {req.text}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === req.id ? (
                      <Select
                        value={editForm.category || req.category}
                        onValueChange={(v) =>
                          setEditForm({ ...editForm, category: v })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="functional">Functional</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="safety">Safety</SelectItem>
                          <SelectItem value="interface">Interface</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="capitalize">{req.category}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === req.id ? (
                      <Select
                        value={editForm.priority || req.priority}
                        onValueChange={(v) =>
                          setEditForm({ ...editForm, priority: v })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`capitalize ${
                          req.priority === "high"
                            ? "text-red-600"
                            : req.priority === "medium"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {req.priority}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-xs">{req.status || "draft"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {editingId === req.id ? (
                        <>
                          <Button
                            onClick={() => {
                              handleUpdate(req.id, editForm);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingId(null);
                              setEditForm({});
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => {
                              setEditingId(req.id);
                              setEditForm(req);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(req.id)}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-border p-3 bg-card flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredRequirements.length} of {requirements.length} requirements
          </span>
          <div className="flex items-center gap-4">
            <span>
              {requirements.filter((r) => r.priority === "high").length} High Priority
            </span>
            <span>
              {requirements.filter((r) => r.category === "functional").length} Functional
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
