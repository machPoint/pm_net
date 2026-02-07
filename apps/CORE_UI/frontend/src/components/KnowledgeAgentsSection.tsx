"use client";

import { useState } from "react";
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
    classification: "unclassified" | "restricted" | "confidential";
    version: string;
    documentId: string;
    approvalStatus: "draft" | "review" | "approved" | "obsolete";
    relatedDocs: string[];
    lastReviewDate: string;
    nextReviewDate: string;
  };
}

const mockDocuments: LibraryDocument[] = [
  {
    id: "1",
    title: "Flight Control System Requirements Document",
    type: "pdf",
    category: "requirements",
    description: "Comprehensive requirements specification for primary and secondary flight control systems, including redundancy and failure mode analysis.",
    author: "Dr. Sarah Mitchell",
    dateModified: "2024-01-15",
    fileSize: "2.4 MB",
    pageCount: 156,
    tags: ["flight-control", "requirements", "DAL-A", "certification"],
    isEmbedded: true,
    summary: "This document defines the functional and performance requirements for the flight control system, ensuring compliance with FAR 25.143 and 25.145. It covers normal operations, failure modes, and emergency procedures for both primary and backup flight control systems.",
    keyTopics: ["Primary Flight Controls", "Backup Systems", "Failure Modes", "Performance Requirements", "Safety Requirements"],
    metadata: {
      classification: "restricted",
      version: "2.1",
      documentId: "SRD-2024-FCS-001",
      approvalStatus: "approved",
      relatedDocs: ["FTP-2024-001", "SDD-2024-FCS-002"],
      lastReviewDate: "2024-01-10",
      nextReviewDate: "2024-07-10"
    }
  },
  {
    id: "2",
    title: "Flight Test Procedures Manual",
    type: "docx",
    category: "procedures",
    description: "Detailed procedures for conducting flight tests including pre-flight checks, in-flight procedures, and data collection protocols.",
    author: "James Rodriguez",
    dateModified: "2024-01-12",
    fileSize: "1.8 MB",
    pageCount: 89,
    tags: ["flight-test", "procedures", "safety", "protocols"],
    isEmbedded: true,
    summary: "Comprehensive manual covering all aspects of flight test operations from planning to execution. Includes safety protocols, emergency procedures, test point execution, and data quality assurance processes.",
    keyTopics: ["Pre-flight Procedures", "Test Point Execution", "Emergency Protocols", "Data Collection", "Post-flight Analysis"],
    metadata: {
      classification: "restricted",
      version: "3.2",
      documentId: "FTP-2024-001",
      approvalStatus: "approved",
      relatedDocs: ["SRD-2024-FCS-001", "SAF-2024-001"],
      lastReviewDate: "2024-01-05",
      nextReviewDate: "2024-04-05"
    }
  },
  {
    id: "3",
    title: "Avionics System Architecture Overview",
    type: "pptx",
    category: "presentations",
    description: "Technical presentation covering the integrated avionics architecture, including FADEC, navigation systems, and communication interfaces.",
    author: "Lisa Chen",
    dateModified: "2024-01-08",
    fileSize: "15.6 MB",
    pageCount: 45,
    tags: ["avionics", "architecture", "FADEC", "navigation"],
    isEmbedded: true,
    summary: "Detailed overview of the integrated avionics system architecture showing interconnections between flight management, engine control, navigation, and communication systems. Includes interface definitions and data flow diagrams.",
    keyTopics: ["FADEC Integration", "Navigation Systems", "Communication Interfaces", "Data Bus Architecture", "Redundancy Design"],
    metadata: {
      classification: "restricted",
      version: "1.4",
      documentId: "AVS-2024-ARCH-001",
      approvalStatus: "approved",
      relatedDocs: ["SDD-2024-AVS-001", "ICD-2024-001"],
      lastReviewDate: "2024-01-01",
      nextReviewDate: "2024-06-01"
    }
  },
  {
    id: "4",
    title: "DO-178C Software Development Standards",
    type: "pdf",
    category: "regulations",
    description: "FAA regulatory guidance document for software considerations in airborne systems and equipment certification.",
    author: "FAA Certification Office",
    dateModified: "2023-12-01",
    fileSize: "3.2 MB",
    pageCount: 248,
    tags: ["DO-178C", "software", "certification", "FAA"],
    isEmbedded: true,
    summary: "Official FAA guidance for software development lifecycle processes, verification and validation activities, and configuration management for airborne software systems.",
    keyTopics: ["Software Lifecycle", "Verification Processes", "Configuration Management", "Certification Data", "Tool Qualification"],
    metadata: {
      classification: "unclassified",
      version: "Rev C",
      documentId: "DO-178C",
      approvalStatus: "approved",
      relatedDocs: ["DO-254", "ARP4754A"],
      lastReviewDate: "2023-12-01",
      nextReviewDate: "2026-12-01"
    }
  },
  {
    id: "5",
    title: "Engine Performance Test Report",
    type: "xlsx",
    category: "reports",
    description: "Comprehensive analysis of engine performance data from ground and flight testing including thrust curves and fuel consumption metrics.",
    author: "Michael Thompson",
    dateModified: "2024-01-14",
    fileSize: "4.7 MB",
    tags: ["engine", "performance", "test-data", "analysis"],
    isEmbedded: true,
    summary: "Detailed analysis of engine performance across various operating conditions. Includes thrust-specific fuel consumption, temperature profiles, and performance trending analysis.",
    keyTopics: ["Thrust Performance", "Fuel Consumption", "Temperature Analysis", "Performance Trends", "Maintenance Recommendations"],
    metadata: {
      classification: "restricted",
      version: "1.0",
      documentId: "EPT-2024-001",
      approvalStatus: "review",
      relatedDocs: ["FTP-2024-001", "MTC-2024-001"],
      lastReviewDate: "2024-01-10",
      nextReviewDate: "2024-02-10"
    }
  },
  {
    id: "6",
    title: "Hydraulic System Maintenance Manual",
    type: "pdf",
    category: "manuals",
    description: "Complete maintenance procedures for hydraulic systems including troubleshooting, component replacement, and system testing protocols.",
    author: "Jennifer Williams",
    dateModified: "2024-01-11",
    fileSize: "5.1 MB",
    pageCount: 312,
    tags: ["hydraulics", "maintenance", "troubleshooting", "procedures"],
    isEmbedded: true,
    summary: "Comprehensive maintenance manual covering all aspects of hydraulic system servicing, from routine inspections to major component overhauls. Includes safety procedures and troubleshooting guides.",
    keyTopics: ["Routine Maintenance", "Component Replacement", "System Testing", "Troubleshooting", "Safety Procedures"],
    metadata: {
      classification: "restricted",
      version: "4.1",
      documentId: "HSM-2024-001",
      approvalStatus: "approved",
      relatedDocs: ["HSS-2024-001", "SRD-2024-HYD-001"],
      lastReviewDate: "2024-01-01",
      nextReviewDate: "2024-07-01"
    }
  },
  {
    id: "7",
    title: "Certification Plan Presentation",
    type: "pptx",
    category: "presentations",
    description: "Executive presentation outlining the certification strategy, milestones, and regulatory compliance approach for the aircraft program.",
    author: "Robert Johnson",
    dateModified: "2024-01-09",
    fileSize: "8.3 MB",
    pageCount: 32,
    tags: ["certification", "planning", "milestones", "compliance"],
    isEmbedded: true,
    summary: "Strategic overview of the certification approach including regulatory framework, key milestones, risk mitigation strategies, and resource allocation for achieving type certification.",
    keyTopics: ["Certification Strategy", "Regulatory Framework", "Key Milestones", "Risk Management", "Resource Planning"],
    metadata: {
      classification: "confidential",
      version: "2.0",
      documentId: "CPN-2024-001",
      approvalStatus: "approved",
      relatedDocs: ["CMP-2024-001", "RSK-2024-001"],
      lastReviewDate: "2024-01-05",
      nextReviewDate: "2024-03-05"
    }
  },
  {
    id: "8",
    title: "Landing Gear Design Specifications",
    type: "pdf",
    category: "specifications",
    description: "Detailed engineering specifications for the landing gear system including structural analysis, actuator requirements, and interface definitions.",
    author: "Anna Kowalski",
    dateModified: "2024-01-13",
    fileSize: "6.8 MB",
    pageCount: 198,
    tags: ["landing-gear", "specifications", "structural", "design"],
    isEmbedded: true,
    summary: "Complete design specification for the retractable landing gear system including structural loads analysis, actuator sizing, and electrical interface requirements.",
    keyTopics: ["Structural Design", "Actuator Requirements", "Interface Specifications", "Load Analysis", "Safety Factors"],
    metadata: {
      classification: "restricted",
      version: "1.3",
      documentId: "LGS-2024-001",
      approvalStatus: "approved",
      relatedDocs: ["SRD-2024-LG-001", "STR-2024-001"],
      lastReviewDate: "2024-01-08",
      nextReviewDate: "2024-04-08"
    }
  }
];

export default function KnowledgeAgentsSection() {
  const [documents] = useState(mockDocuments);
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
                    : "Upload documents to get started with your aerospace library"
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
