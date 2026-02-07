"use client";

import { useState, useRef, useEffect } from "react";
import CreateNoteDialog, { Note } from "@/components/CreateNoteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save,
  Plus,
  Search,
  FileText,
  Clock,
  Tag,
  Folder,
  Link2,
  Star,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// Note interface moved to CreateNoteDialog

const mockNotes: Note[] = [
  {
    id: "1",
    title: "Keyword Research Strategy",
    description: "Target keywords for Q1 SEO campaign",
    content: "# Keyword Research Strategy\n\nTarget keywords for Q1 SEO campaign:\n\n## Primary Keywords\n- organic search optimization\n- content marketing strategy\n- technical SEO audit\n\n## Long-tail Keywords\n- how to improve website ranking\n- best SEO tools for small business\n- local SEO optimization tips\n\n## Competitor Gap Analysis\n- Identified 15 high-volume keywords competitors rank for that we don't\n- Average search volume: 2,400/mo\n- Estimated traffic potential: 8,500 visits/mo",
    tags: ["seo", "keywords", "research"],
    folder: "SEO Strategy",
    category: "research",
    author: "Jordan Kim",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSynced: new Date(),
    isSourced: false
  },
  {
    id: "2",
    title: "On-Page SEO Checklist",
    description: "Essential on-page optimization elements",
    content: "# On-Page SEO Checklist\n\nEssential elements for every page:\n\n## Title Tags\n- Include primary keyword\n- Keep under 60 characters\n- Make it compelling for CTR\n\n## Meta Descriptions\n- 150-160 characters\n- Include call-to-action\n- Natural keyword usage\n\n## Header Structure\n- Single H1 per page\n- Logical H2/H3 hierarchy\n- Keywords in headers where natural\n\n## Content Optimization\n- Keyword density 1-2%\n- Internal linking (3-5 links)\n- Image alt text optimization",
    tags: ["seo", "checklist", "on-page"],
    folder: "SEO Strategy",
    category: "checklist",
    author: "Jordan Kim",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSynced: new Date(),
    isSourced: false
  },
  {
    id: "3",
    title: "Backlink Outreach Template",
    description: "Email template for guest post outreach",
    content: "# Backlink Outreach Template\n\nEmail template for guest post outreach:\n\n---\n\nSubject: Content collaboration opportunity\n\nHi [Name],\n\nI came across your article on [Topic] and really enjoyed your insights on [Specific Point].\n\nI'm working on a comprehensive guide about [Related Topic] that I think would be valuable for your audience. Would you be interested in:\n\n1. A guest post contribution\n2. Including a mention in your existing content\n3. A content collaboration\n\nHappy to discuss what works best for you.\n\nBest,\n[Your Name]",
    tags: ["outreach", "backlinks", "templates"],
    folder: "Link Building",
    category: "templates",
    author: "Sam Rivera",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSynced: new Date(),
    isSourced: false
  }
];

const STORAGE_KEY = "core-se-notes";

export default function NotesSection() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [content, setContent] = useState(selectedNote?.content || "");
  const [title, setTitle] = useState(selectedNote?.title || "");
  const [isEditing, setIsEditing] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Load notes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const notesWithDates = parsed.map((n: any) => ({
          ...n,
          lastSynced: new Date(n.lastSynced),
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
        }));
        setNotes(notesWithDates);
        if (notesWithDates.length > 0) {
          setSelectedNote(notesWithDates[0]);
        }
      } catch (e) {
        console.error("Failed to parse stored notes", e);
        setNotes(mockNotes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockNotes));
      }
    } else {
      setNotes(mockNotes);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockNotes));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes]);

  const handleNoteSaved = (note: Note) => {
    setNotes((prev) => {
      const existing = prev.find(n => n.id === note.id);
      if (existing) {
        // Update
        return prev.map(n => n.id === note.id ? note : n);
      } else {
        // Create
        return [note, ...prev];
      }
    });
    setSelectedNote(note);
    toast.success(editingNote ? "Note updated" : "Note created");
    setEditingNote(null);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setShowCreateModal(true);
  };

  useEffect(() => {
    if (selectedNote) {
      setContent(selectedNote.content);
      setTitle(selectedNote.title);
    }
  }, [selectedNote]);

  const handleSave = () => {
    if (!selectedNote || selectedNote.isSourced) {
      toast.error("Cannot edit sourced notes");
      return;
    }

    const updatedNote = {
      ...selectedNote,
      title,
      content,
      lastSynced: new Date()
    };

    setNotes(prev => prev.map(note =>
      note.id === selectedNote.id ? updatedNote : note
    ));
    setSelectedNote(updatedNote);

    toast.success("Note saved successfully");
    setIsEditing(false);
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-full bg-[var(--color-main-panel)]">
      {/* Note List */}
      <div className="w-80 border-r border-border bg-[var(--color-left-panel)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-[var(--color-left-panel)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Notes</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-8 px-3 text-xs bg-primary hover:bg-primary/90"
            >
              <Plus className="w-3 h-3 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-card border-border"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-auto">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={cn(
                "p-4 border-b border-border cursor-pointer hover:bg-card transition-colors",
                selectedNote?.id === note.id && "bg-card"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm truncate pr-2">{note.title}</h4>
                {note.isSourced && (
                  <Badge variant="outline" className="text-xs">
                    <Link2 className="w-3 h-3 mr-1" />
                    {note.sourceType}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {note.content.substring(0, 100)}...
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Folder className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{note.folder}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {note.lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {note.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                  {note.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{note.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Note Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-[var(--color-main-panel)]">
              <div className="flex-1">
                <Input
                  value={selectedNote.title}
                  onChange={(e) => {
                    const updatedNote = { ...selectedNote, title: e.target.value };
                    setSelectedNote(updatedNote);
                    setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
                  }}
                  className="text-lg font-semibold border-none shadow-none p-0 h-auto bg-transparent focus-visible:ring-0"
                />
              </div>

              <div className="flex items-center gap-2 ml-4">
                {selectedNote.isSourced && (
                  <span className="text-xs px-2 py-1 rounded bg-blue-600 text-white">
                    {selectedNote.sourceType}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Last synced: {formatDistanceToNow(selectedNote.lastSynced, { addSuffix: true })}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNotes(notes.filter(n => n.id !== selectedNote.id));
                    setSelectedNote(null);
                  }}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Note Content */}
            <div className="flex-1 p-4">
              {selectedNote.isSourced ? (
                <div className="h-full bg-card rounded border border-border p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Read-only content from {selectedNote.sourceType}</span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{selectedNote.content}</pre>
                  </div>
                </div>
              ) : (
                <Textarea
                  ref={editorRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Start writing your note..."
                  className="min-h-[500px] border-none shadow-none resize-none focus-visible:ring-0 text-sm leading-relaxed bg-[var(--color-main-panel)]"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select a note to start editing</p>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Note Dialog */}
      <CreateNoteDialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setEditingNote(null);
        }}
        onNoteSaved={handleNoteSaved}
        editingNote={editingNote}
      />
    </div>
  );
}