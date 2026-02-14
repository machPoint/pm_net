"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, RefreshCw, WandSparkles } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProjectNode = { id: string; title: string; metadata?: Record<string, any> };

type ScheduleProfile = {
  project_id: string;
  timezone: string;
  work_start_hour: number;
  work_end_hour: number;
  daily_job_limit: number;
};

type ScheduledJob = {
  id: string;
  task_id: string;
  step_order: number;
  title: string;
  run_at: string;
  timezone: string;
  status: "scheduled" | "running" | "completed" | "failed" | "canceled";
};

const HIER_BASE = "/api/opal/proxy/api/hierarchy";
const SCHED_BASE = "/api/opal/proxy/api/scheduler";

async function fetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export default function SchedulerSection() {
  const [projects, setProjects] = useState<ProjectNode[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [profile, setProfile] = useState<ScheduleProfile | null>(null);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startAt, setStartAt] = useState<string>(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    const missionsRes = await fetchJson<{ ok: true; missions: ProjectNode[] }>(`${HIER_BASE}/missions`);
    const allProjects: ProjectNode[] = [];

    for (const mission of missionsRes.missions || []) {
      const progRes = await fetchJson<{ ok: true; programs: ProjectNode[] }>(`${HIER_BASE}/missions/${mission.id}/programs`);
      for (const program of progRes.programs || []) {
        const projRes = await fetchJson<{ ok: true; projects: ProjectNode[] }>(`${HIER_BASE}/programs/${program.id}/projects`);
        for (const p of projRes.projects || []) {
          if (p.metadata?.is_default) continue;
          allProjects.push(p);
        }
      }
    }

    allProjects.sort((a, b) => a.title.localeCompare(b.title));
    setProjects(allProjects);
    if (!projectId && allProjects.length > 0) {
      setProjectId(allProjects[0].id);
    }
  }, [projectId]);

  const loadSchedule = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, jobsRes] = await Promise.all([
        fetchJson<{ ok: true; profile: ScheduleProfile }>(`${SCHED_BASE}/projects/${id}/profile`),
        fetchJson<{ ok: true; jobs: ScheduledJob[] }>(`${SCHED_BASE}/projects/${id}/jobs`),
      ]);
      setProfile(profileRes.profile);
      setJobs(jobsRes.jobs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load scheduler data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects().catch((err) => setError(err.message || "Failed to load projects"));
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) return;
    loadSchedule(projectId);
  }, [projectId, loadSchedule]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, ScheduledJob[]>();
    for (const job of jobs) {
      const key = new Date(job.run_at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    for (const dayJobs of map.values()) {
      dayJobs.sort((a, b) => a.run_at.localeCompare(b.run_at));
    }
    return map;
  }, [jobs]);

  const selectedKey = selectedDate ? selectedDate.toISOString().slice(0, 10) : "";
  const selectedJobs = selectedKey ? jobsByDay.get(selectedKey) || [] : [];
  const highlightedDays = Array.from(jobsByDay.keys()).map((d) => new Date(`${d}T00:00:00Z`));

  const saveProfile = async () => {
    if (!projectId || !profile) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`${SCHED_BASE}/projects/${projectId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      await loadSchedule(projectId);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const generateSchedule = async () => {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`${SCHED_BASE}/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: new Date(startAt).toISOString(), replace_existing: true }),
      });
      await loadSchedule(projectId);
    } catch (err: any) {
      setError(err.message || "Failed to generate schedule");
    } finally {
      setSaving(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      await fetchJson(`${SCHED_BASE}/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Canceled from scheduler UI" }),
      });
      await loadSchedule(projectId);
    } catch (err: any) {
      setError(err.message || "Failed to cancel job");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Project Scheduler
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Generate project-specific execution schedules from task plans with calendar visibility.
          </p>
        </div>
      </div>

      <div className="p-4 border-b border-border grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="text-xs text-[var(--color-text-secondary)]">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full mt-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-secondary)]">Start At</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full mt-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
          />
        </div>

        <div>
          <Button disabled={!projectId || saving} onClick={generateSchedule} className="w-full gap-2">
            <WandSparkles className="w-4 h-4" />
            Generate
          </Button>
        </div>

        <div>
          <Button variant="outline" disabled={!projectId || loading} onClick={() => loadSchedule(projectId)} className="w-full gap-2">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="text-xs text-[var(--color-text-secondary)]">
          {jobs.length} scheduled jobs
        </div>
      </div>

      {profile && (
        <div className="p-4 border-b border-border grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-[var(--color-text-secondary)]">Timezone</label>
            <input
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              className="w-full mt-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)]">Start Hour</label>
            <input
              type="number"
              min={0}
              max={23}
              value={profile.work_start_hour}
              onChange={(e) => setProfile({ ...profile, work_start_hour: Number(e.target.value) })}
              className="w-full mt-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)]">End Hour</label>
            <input
              type="number"
              min={1}
              max={24}
              value={profile.work_end_hour}
              onChange={(e) => setProfile({ ...profile, work_end_hour: Number(e.target.value) })}
              className="w-full mt-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)]">Daily Limit</label>
            <input
              type="number"
              min={1}
              max={50}
              value={profile.daily_job_limit}
              onChange={(e) => setProfile({ ...profile, daily_job_limit: Number(e.target.value) })}
              className="w-full mt-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
            />
          </div>
          <div>
            <Button variant="outline" onClick={saveProfile} disabled={saving} className="w-full">Save Profile</Button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 text-sm text-destructive border-b border-border">{error}</div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div className="rounded-xl border border-border p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ hasJobs: highlightedDays }}
            modifiersClassNames={{ hasJobs: "bg-primary/15" }}
            className="w-full"
          />
        </div>

        <div className="lg:col-span-2 min-h-0 rounded-xl border border-border p-3 flex flex-col">
          <h3 className="text-sm font-semibold mb-2">Jobs on {selectedKey || "-"}</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {selectedJobs.length === 0 ? (
              <div className="text-sm text-[var(--color-text-secondary)]">No jobs scheduled for this day.</div>
            ) : (
              selectedJobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-border p-2.5 bg-[var(--color-background)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{job.title}</div>
                    <Badge variant="outline">{job.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
                    <span>{new Date(job.run_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>Step #{job.step_order}</span>
                  </div>
                  {job.status === "scheduled" && (
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => cancelJob(job.id)}>Cancel</Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
