"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter,
  FileText,
  File,
  Presentation,
  Download,
  Eye,
  MessageCircle,
  Calendar,
  User,
  Tag,
  Star,
  Upload,
  FolderOpen,
  Library,
  BookOpen,
  FileSpreadsheet,
  Image,
  Video,
  Clock,
  ExternalLink,
  Share,
  MoreHorizontal,
  Plus,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LibraryDocument {
  id: string;
  title: string;
  type: "pdf" | "docx" | "pptx" | "xlsx" | "txt" | "dwg";
  category: "requirements" | "procedures" | "manuals" | "specifications" | "reports" | "presentations" | "regulations";
  description: string;
  author: string;
  dateModified: string;
  fileSize: string;
  pageCount?: number;
  tags: string[];
  isEmbedded: boolean;
  summary?: string;
  keyTopics: string[];
  metadata: {
    classification: "unclassified" | "internal" | "restricted" | "confidential";
    version: string;
    documentId: string;
    approvalStatus: "draft" | "review" | "approved" | "obsolete";
    relatedDocs: string[];
    lastReviewDate: string;
    nextReviewDate: string;
  };
}

const OPAL_BASE_URL = '/api/opal/proxy';

export default function KnowledgeAgentsSection() {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);

  // Fetch deliverable nodes from graph API as library documents
  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch(`${OPAL_BASE_URL}/api/nodes?node_type=deliverable`);
        if (!res.ok) return;
        const data = await res.json();
        const nodes = data.nodes || [];
        const mapped: LibraryDocument[] = nodes.map((n: any) => {
          const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
          const artifactType = meta.artifact_type || 'document';
          const typeMap: Record<string, LibraryDocument['type']> = {
            document: 'pdf', code: 'txt', design: 'pptx', data: 'xlsx', hardware: 'pdf',
          };
          const catMap: Record<string, LibraryDocument['category']> = {
            document: 'specifications', code: 'procedures', design: 'presentations',
            data: 'reports', hardware: 'manuals',
          };
          return {
            id: n.id,
            title: n.title,
            type: typeMap[artifactType] || 'pdf',
            category: catMap[artifactType] || 'specifications',
            description: n.description || '',
            author: meta.owner_id || n.created_by || 'Unknown',
            dateModified: n.updated_at ? new Date(n.updated_at).toISOString().split('T')[0] : '',
            fileSize: meta.file_size || '',
            pageCount: meta.page_count,
            tags: meta.tags || [],
            isEmbedded: meta.is_embedded ?? false,
            summary: meta.summary || '',
            keyTopics: meta.key_topics || [],
            metadata: {
              classification: meta.classification || 'internal',
              version: meta.version || '1.0',
              documentId: n.id.substring(0, 12).toUpperCase(),
              approvalStatus: n.status === 'accepted' ? 'approved' : n.status === 'delivered' ? 'review' : 'draft',
              relatedDocs: meta.related_docs || [],
              lastReviewDate: meta.last_review_date || '',
              nextReviewDate: meta.next_review_date || '',
            },
          };
        });
        setDocuments(mapped);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      }
    }
    fetchDocuments();
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "requirements" | "procedures" | "manuals" | "specifications" | "reports" | "presentations" | "regulations">("all");
  const [filterType, setFilterType] = useState<"all" | "pdf" | "docx" | "pptx" | "xlsx">("all");
  const [selectedDocument, setSelectedDocument] = useState<LibraryDocument | null>(null);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleDocumentClick = (document: LibraryDocument) => {
    setSelectedDocument(document);
    setShowDocumentDetails(true);
  };

  const filteredDocuments = documents.filter(document => {
    const matchesSearch = document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         document.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         document.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         document.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "all" || document.category === filterCategory;
    const matchesType = filterType === "all" || document.type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf": return FileText;
      case "docx": return File;
      case "pptx": return Presentation;
      case "xlsx": return FileSpreadsheet;
      case "txt": return FileText;
      case "dwg": return FileText;
      default: return File;
    }
  };

  const getFileColor = (type: string) => {
    switch (type) {
      case "pdf": return "text-red-600";
      case "docx": return "text-blue-600";
      case "pptx": return "text-orange-600";
      case "xlsx": return "text-green-600";
      case "txt": return "text-gray-600";
      case "dwg": return "text-purple-600";
      default: return "text-muted-foreground";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "requirements": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      case "procedures": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "manuals": return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
      case "specifications": return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
      case "reports": return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
      case "presentations": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      case "regulations": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      default: return "bg-card text-card-foreground";
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "unclassified": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      case "restricted": return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
      case "confidential": return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400";
      default: return "bg-card text-card-foreground";
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Document Library</h2>
          </div>
          <Button size="sm" className="h-8">
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-background border-border"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Category</h4>
            <div className="space-y-2">
              {[
                { value: "all", label: "All Categories" },
                { value: "requirements", label: "Requirements" },
                { value: "procedures", label: "Procedures" },
                { value: "manuals", label: "Manuals" },
                { value: "specifications", label: "Specifications" },
                { value: "reports", label: "Reports" },
                { value: "presentations", label: "Presentations" },
                { value: "regulations", label: "Regulations" }
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={option.value}
                    checked={filterCategory === option.value}
                    onChange={(e) => setFilterCategory(e.target.value as any)}
                    className="border-border"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">File Type</h4>
            <div className="space-y-2">
              {[
                { value: "all", label: "All Types" },
                { value: "pdf", label: "PDF" },
                { value: "docx", label: "Word" },
                { value: "pptx", label: "PowerPoint" },
                { value: "xlsx", label: "Excel" }
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={filterType === option.value}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="border-border"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Library Stats */}
        <div className="p-4">
          <h4 className="text-sm font-medium mb-2">Library Overview</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Total Documents</span>
              <Badge variant="secondary">{documents.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>RAG Embedded</span>
              <Badge variant="secondary">{documents.filter(d => d.isEmbedded).length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Filtered Results</span>
              <Badge variant="secondary">{filteredDocuments.length}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h3 className="font-medium">Documents</h3>
            <Badge variant="secondary">{filteredDocuments.length}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat with RAG
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              View Mode
            </Button>
          </div>
        </div>

        {/* Documents Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDocuments.map((document) => {
                const FileIcon = getFileIcon(document.type);
                
                return (
                  <div 
                    key={document.id} 
                    className="bg-card rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleDocumentClick(document)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileIcon className={cn("w-5 h-5", getFileColor(document.type))} />
                        <Badge className={cn("text-xs", getCategoryColor(document.category))}>
                          {document.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {document.isEmbedded && (
                          <Zap className="w-4 h-4" style={{ color: '#6e9fc1' }} />
                        )}
                        <Badge className={cn("text-xs", getClassificationColor(document.metadata.classification))}>
                          {document.metadata.classification}
                        </Badge>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-2 line-clamp-2">{document.title}</h4>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {document.description}
                    </p>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Author</span>
                        <span className="font-medium">{document.author}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Modified</span>
                        <span className="font-medium">{document.dateModified}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-medium">{document.fileSize}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {document.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {document.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{document.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">
                        {document.type} • {document.pageCount ? `${document.pageCount} pages` : 'N/A'}
                      </span>
                      <Badge variant={document.metadata.approvalStatus === 'approved' ? 'default' : 'secondary'} className="text-xs">
                        {document.metadata.approvalStatus}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDocuments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium mb-2">No documents found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery || filterCategory !== "all" || filterType !== "all"
                    ? "Try adjusting your search or filters"
                    : "Upload documents to get started with your knowledge library"
                  }
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Document Details Modal */}
      <Dialog open={showDocumentDetails} onOpenChange={setShowDocumentDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDocument && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("p-2 rounded-lg", getCategoryColor(selectedDocument.category), "bg-opacity-20")}>
                    {(() => {
                      const FileIcon = getFileIcon(selectedDocument.type);
                      return <FileIcon className={cn("w-5 h-5", getFileColor(selectedDocument.type))} />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedDocument.title}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-xs", getCategoryColor(selectedDocument.category))}>
                        {selectedDocument.category}
                      </Badge>
                      <Badge className={cn("text-xs", getClassificationColor(selectedDocument.metadata.classification))}>
                        {selectedDocument.metadata.classification}
                      </Badge>
                      {selectedDocument.isEmbedded && (
                        <Badge className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <Zap className="w-3 h-3 mr-1" />
                          RAG Embedded
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <DialogDescription className="text-sm mt-3">
                  {selectedDocument.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Document Summary */}
                {selectedDocument.summary && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <BookOpen className="w-4 h-4" />
                      Document Summary
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm leading-relaxed">{selectedDocument.summary}</p>
                    </div>
                  </div>
                )}

                {/* Key Topics */}
                {selectedDocument.keyTopics && selectedDocument.keyTopics.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <Tag className="w-4 h-4" />
                      Key Topics
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.keyTopics.map((topic) => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="flex items-center gap-2 font-medium text-sm mb-2">
                        <FileText className="w-4 h-4" />
                        Document Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Document ID:</span>
                          <span className="font-mono">{selectedDocument.metadata.documentId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Version:</span>
                          <span>{selectedDocument.metadata.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">File Type:</span>
                          <span className="uppercase">{selectedDocument.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">File Size:</span>
                          <span>{selectedDocument.fileSize}</span>
                        </div>
                        {selectedDocument.pageCount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pages:</span>
                            <span>{selectedDocument.pageCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="flex items-center gap-2 font-medium text-sm mb-2">
                        <User className="w-4 h-4" />
                        Authorship & Reviews
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Author:</span>
                          <span>{selectedDocument.author}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Modified:</span>
                          <span>{selectedDocument.dateModified}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Approval Status:</span>
                          <Badge variant={selectedDocument.metadata.approvalStatus === 'approved' ? 'default' : 'secondary'}>
                            {selectedDocument.metadata.approvalStatus}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Review:</span>
                          <span>{selectedDocument.metadata.lastReviewDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next Review:</span>
                          <span>{selectedDocument.metadata.nextReviewDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Documents */}
                {selectedDocument.metadata.relatedDocs && selectedDocument.metadata.relatedDocs.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                      <Library className="w-4 h-4" />
                      Related Documents
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.metadata.relatedDocs.map((docId) => (
                        <Badge key={docId} variant="outline" className="text-xs">
                          {docId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <h4 className="flex items-center gap-2 font-medium text-sm mb-3">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Chat with Document
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open Original
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
