"use client";

import RequirementImpactAnalytics from "./RequirementImpactAnalytics";

// Mock data for analytics view
const mockAnalyticsData = {
	analytics: {
		totalArtifacts: 42,
		coveragePercentage: 83,
		testCoverage: 78,
		designCoverage: 92,
		implementationCoverage: 88,
		traceabilityScore: 90
	},
	impactTree: [
		{
			id: "REQ-001",
			name: "System Requirements",
			type: "requirement" as const,
			status: "Active",
			metadata: { lastUpdated: "2024-03-10" },
			connections: [{ id: "c1", type: "depends_on", target: "DES-001" }, { id: "c2", type: "depends_on", target: "DES-002" }]
		},
		{
			id: "DES-001",
			name: "High Level Design",
			type: "design" as const,
			status: "Approved",
			metadata: { lastUpdated: "2024-03-12" },
			connections: []
		},
		{
			id: "CODE-001",
			name: "CoreModule.ts",
			type: "code" as const,
			status: "In Progress",
			metadata: { lastUpdated: "2024-03-14" },
			connections: []
		},
		{
			id: "TEST-001",
			name: "Unit Tests",
			type: "test" as const,
			status: "Passed",
			metadata: { lastUpdated: "2024-03-14" },
			connections: []
		}
	]
};

export default function AnalyticsSection() {
	return (
		<div className="h-full flex flex-col p-6 space-y-6">
			<div className="flex flex-col space-y-2">
				<h2 className="text-2xl font-bold tracking-tight">Impact Analytics</h2>
				<p className="text-muted-foreground">
					Comprehensive traceability and coverage metrics for the project.
				</p>
			</div>

			<div className="flex-1 overflow-auto">
				<RequirementImpactAnalytics
					analytics={mockAnalyticsData.analytics}
					impactTree={mockAnalyticsData.impactTree}
					requirementTitle="Project Overview: Agent Task Management"
					onRefresh={() => console.log("Refresh clicked")}
					onExport={() => console.log("Export clicked")}
				/>
			</div>
		</div>
	);
}
