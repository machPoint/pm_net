"use client";

import CriticalPathAnalyzer from "./CriticalPathAnalyzer";

export default function GanttSection() {
	return (
		<div className="h-full flex flex-col p-6 space-y-6">
			<div className="flex flex-col space-y-2">
				<h2 className="text-2xl font-bold tracking-tight">Gantt & Critical Path</h2>
				<p className="text-muted-foreground">
					Analyze project timelines, critical paths, and resource constraints.
				</p>
			</div>

			<div className="flex-1">
				<CriticalPathAnalyzer />
			</div>
		</div>
	);
}
