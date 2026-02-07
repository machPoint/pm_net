"use client";

import { useState, useEffect } from "react";
import AdvancedImpactAnalysis from "./AdvancedImpactAnalysis";
import { Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Placeholder for now, AdvancedImpactAnalysis handles its own data fetching if given an ID
// But for the main view, we want to list risks first? 
// Actually, AdvancedImpactAnalysis takes a `selectedRequirement` ID.
// In our graph, Risks are nodes that 'impact' other nodes. 
// A "Risk Assessment" usually starts with a specific risk OR a specific requirement.
// Let's assume this view lists RISKS, and when you click one, it shows what it impacts.
// OR it lists REQUIREMENTS and shows their risks? 
// The name is "Risk Assessment".
// Let's fetch Risks, and allow selecting one to see its impact tree.
// But AdvancedImpactAnalysis seems built around "Requirements".
// Let's adapt: We will fetch Risks, and when selected, pass the Risk ID as if it were a Requirement,
// assuming the component can handle generic nodes if we adjust it or if the graph structure supports it.
// Actually, let's look at how AdvancedImpactAnalysis fetches data: useRequirementImpact(selectedRequirement).
// It expects an ID. If we pass a Risk ID, it will fetch the Risk node and its connections.

const OPAL_BASE_URL = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:3000';

export default function RisksSection() {
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [risks, setRisks] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchRisks = async () => {
			try {
				const res = await fetch(`${OPAL_BASE_URL}/api/nodes?type=risk`);
				if (!res.ok) throw new Error('Failed to fetch risks');
				const data = await res.json();
				// API returns { nodes: [], count: 0 }
				const riskNodes = data.nodes || [];
				setRisks(riskNodes);

				if (riskNodes.length > 0 && !selectedNodeId) {
					setSelectedNodeId(riskNodes[0].id);
				}
			} catch (error) {
				console.error("Error fetching risks:", error);
				setRisks([]);
			} finally {
				setLoading(false);
			}
		};

		fetchRisks();
	}, []);

	return (
		<div className="h-full flex flex-col p-6 space-y-6">
			<div className="flex flex-col space-y-2">
				<h2 className="text-2xl font-bold tracking-tight">Risk Assessment</h2>
				<p className="text-muted-foreground">
					Identify and analyze risks and their impact on the project graph.
				</p>
			</div>

			<div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Risk List Side Panel */}
				<Card className="lg:col-span-1 h-fit max-h-[calc(100vh-200px)] overflow-y-auto">
					<CardContent className="p-4 space-y-2">
						<h3 className="font-semibold mb-4 flex items-center gap-2">
							<Shield className="w-5 h-5" />
							Active Risks
						</h3>
						{loading ? (
							<div className="text-sm text-muted-foreground">Loading risks...</div>
						) : risks.length === 0 ? (
							<div className="text-sm text-muted-foreground">No risks found.</div>
						) : (
							risks.map(risk => {
								// Parse metadata if it's a string, otherwise use as-is
								const metadata = typeof risk.metadata === 'string' 
									? JSON.parse(risk.metadata || '{}') 
									: (risk.metadata || {});
								const severity = metadata.severity || 'medium';
								
								return (
									<div
										key={risk.id}
										onClick={() => setSelectedNodeId(risk.id)}
										className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedNodeId === risk.id
											? 'bg-primary/10 border-primary'
											: 'hover:bg-muted/50'
											}`}
									>
										<div className="font-medium text-sm mb-1">{risk.title}</div>
										<div className="flex items-center gap-2">
											<span className={`text-xs px-2 py-0.5 rounded-full border ${
												severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
												severity === 'medium' ? 'bg-orange-50 text-orange-700 border-orange-200' :
												'bg-yellow-50 text-yellow-700 border-yellow-200'
											}`}>
												{severity}
											</span>
										</div>
									</div>
								);
							})
						)}
					</CardContent>
				</Card>

				{/* Impact Analysis Area */}
				<div className="lg:col-span-3">
					{selectedNodeId ? (
						<AdvancedImpactAnalysis
							selectedRequirement={selectedNodeId}
							onRequirementSelect={setSelectedNodeId}
						/>
					) : (
						<div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
							<div className="text-center">
								<AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-20" />
								<p>Select a risk to analyze its impact</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
