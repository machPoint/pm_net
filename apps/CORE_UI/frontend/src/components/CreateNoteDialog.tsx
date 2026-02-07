"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export interface Note {
  id: string;
  title: string;
  content: string;
  description: string;
  tags: string[];
  folder: string;
  lastSynced: Date;
  isSourced: boolean;
  sourceType?: string;
  createdAt: Date;
  updatedAt: Date;
  author: string;
  category: string;
}

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteSaved: (note: Note) => void;
  editingNote?: Note | null;
}

const folders = ["General", "Architecture", "Requirements", "Design", "Meeting Notes", "Ideas", "Research"];
const categories = ["Technical", "Planning", "Documentation", "Review", "Personal"];

export default function CreateNoteDialog({
  open,
  onOpenChange,
  onNoteSaved,
  editingNote,
}: CreateNoteDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("General");
  const [category, setCategory] = useState("Technical");
  const [author, setAuthor] = useState("Current User");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Load existing note for editing
  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title);
      setDescription(editingNote.description || "");
      setContent(editingNote.content);
      setFolder(editingNote.folder);
      setCategory(editingNote.category || "Technical");
      setAuthor(editingNote.author || "Current User");
      setTags(editingNote.tags || []);
    } else {
      // Reset for new note
      setTitle("");
      setDescription("");
      setContent("");
      setFolder("General");
      setCategory("Technical");
      setAuthor("Current User");
      setTags([]);
    }
  }, [editingNote, open]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      return;
    }

    const now = new Date();
    const note: Note = {
      id: editingNote?.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      tags,
      folder,
      category,
      author,
      lastSynced: now,
      createdAt: editingNote?.createdAt || now,
      updatedAt: now,
      isSourced: editingNote?.isSourced || false,
      sourceType: editingNote?.sourceType,
    };

    onNoteSaved(note);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingNote ? "Edit Note" : "Create New Note"}</DialogTitle>
          <DialogDescription>
            {editingNote ? "Update your note details" : "Add a new note with metadata"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief summary of this note..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Folder, Category, Author Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="folder">Folder</Label>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger id="folder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                placeholder="Your name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="tags"
                placeholder="Add a tag and press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button onClick={handleAddTag} variant="outline" type="button">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Write your note here... (Supports Markdown)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tip: You can use Markdown formatting
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {editingNote ? "Save Changes" : "Create Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
