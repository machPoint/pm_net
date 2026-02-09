"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
	Gavel,
	Search,
	Plus,
	Filter,
	Calendar,
	CheckCircle2,
	XCircle,
	HelpCircle,
	ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Decision {
	id: string;
	shortId: string;
	title: string;
	status: "proposed" | "accepted" | "rejected" | "superseded";
	date: string;
	author: string;
	tags: string[];
	description: string;
}

const OPAL_BASE_URL = '/api/opal/proxy';

export default function DecisionsSection() {
	const [searchQuery, setSearchQuery] = useState("");
	const [decisions, setDecisions] = useState<Decision[]>([]);

	// Fetch decision nodes from graph API
	useEffect(() => {
		async function fetchDecisions() {
			try {
				const res = await fetch(`${OPAL_BASE_URL}/api/nodes?node_type=decision`);
				if (!res.ok) return;
				const data = await res.json();
				const nodes = data.nodes || [];
				const mapped: Decision[] = nodes.map((n: any) => {
					const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
					const statusMap: Record<string, Decision['status']> = {
						open: 'proposed', decided: 'accepted', revisited: 'superseded',
					};
					return {
						id: n.id,
						shortId: n.id.substring(0, 8).toUpperCase(),
						title: n.title,
						status: statusMap[n.status] || 'proposed',
						date: n.created_at ? new Date(n.created_at).toISOString().split('T')[0] : '',
						author: meta.decided_by || n.created_by || 'Unknown',
						tags: meta.tags || [],
						description: n.description || '',
					};
				});
				setDecisions(mapped);
			} catch (err) {
				console.error('Failed to fetch decisions:', err);
			}
		}
		fetchDecisions();
	}, []);

	const filteredDecisions = decisions.filter(d =>
		d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
		d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
		d.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	const getStatusColor = (status: Decision["status"]) => {
		switch (status) {
			case "accepted": return "bg-green-100 text-green-800 border-green-200";
			case "rejected": return "bg-red-100 text-red-800 border-red-200";
			case "proposed": return "bg-blue-100 text-blue-800 border-blue-200";
			case "superseded": return "bg-gray-100 text-gray-800 border-gray-200";
			default: return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusIcon = (status: Decision["status"]) => {
		switch (status) {
			case "accepted": return <CheckCircle2 className="w-4 h-4 mr-1" />;
			case "rejected": return <XCircle className="w-4 h-4 mr-1" />;
			case "proposed": return <HelpCircle className="w-4 h-4 mr-1" />;
			case "superseded": return <ArrowRight className="w-4 h-4 mr-1" />;
		}
	};

	return (
		<div className="h-full flex flex-col p-6 space-y-6">
			<div className="flex flex-col space-y-2">
				<h2 className="text-2xl font-bold tracking-tight">Architecture Decision Log</h2>
				<p className="text-muted-foreground">
					Track and manage key architectural decisions (ADRs) and their status.
				</p>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="relative w-full md:w-96">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Search decisions..."
								className="pl-8"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm">
								<Filter className="w-4 h-4 mr-2" />
								Filter
							</Button>
							<Button size="sm">
								<Plus className="w-4 h-4 mr-2" />
								New Decision
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[100px]">ID</TableHead>
									<TableHead>Title</TableHead>
									<TableHead className="w-[150px]">Status</TableHead>
									<TableHead className="w-[150px]">Date</TableHead>
									<TableHead className="w-[150px]">Author</TableHead>
									<TableHead className="w-[50px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredDecisions.length > 0 ? (
									filteredDecisions.map((decision) => (
										<TableRow key={decision.id} className="cursor-pointer hover:bg-muted/50">
											<TableCell className="font-medium font-mono text-xs">{decision.shortId}</TableCell>
											<TableCell>
												<div className="font-medium">{decision.title}</div>
												<div className="text-xs text-muted-foreground flex gap-2 mt-1">
													{decision.tags.map(tag => (
														<span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
															{tag}
														</span>
													))}
													<span className="truncate max-w-[300px] opacity-70">
														- {decision.description}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={cn("uppercase text-[10px] font-bold flex w-fit items-center", getStatusColor(decision.status))}
												>
													{getStatusIcon(decision.status)}
													{decision.status}
												</Badge>
											</TableCell>
											<TableCell className="text-sm">
												<div className="flex items-center text-muted-foreground">
													<Calendar className="w-3 h-3 mr-1" />
													{decision.date}
												</div>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{decision.author}
											</TableCell>
											<TableCell>
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<ArrowRight className="w-4 h-4" />
												</Button>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={6} className="h-24 text-center">
											No decisions found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
