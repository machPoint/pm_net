"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Bot, Inbox, Mail, RefreshCw } from "lucide-react";

interface InboxMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: string;
  meta?: Record<string, any>;
}

interface AgentChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  meta?: Record<string, any>;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export default function MessagesSection() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setError(null);

    const statusRes = await fetch("/api/openclaw/status").catch(() => null);
    if (!statusRes?.ok) {
      throw new Error("Failed to load OpenClaw status");
    }

    const statusData = await statusRes.json();
    const runtimeAgents = statusData?.health?.agents || statusData?.status?.heartbeat?.agents || [];
    const agentIds = Array.from(
      new Set(
        runtimeAgents
          .map((a: any) => a?.agentId || a?.id || a?.name)
          .filter((id: string | undefined) => Boolean(id))
      )
    ) as string[];

    const historyResponses = await Promise.all(
      agentIds.map(async (agentId: string) => {
        const res = await fetch(`/api/openclaw/agents/${encodeURIComponent(agentId)}/chat`).catch(() => null);
        if (!res?.ok) return { agentId, messages: [] as AgentChatMessage[] };
        const data = await res.json();
        return { agentId, messages: (data?.messages || []) as AgentChatMessage[] };
      })
    );

    const inboxMessages: InboxMessage[] = [];
    historyResponses.forEach(({ agentId, messages: chat }) => {
      chat
        .filter((m) => m.role === "assistant")
        .forEach((m, idx) => {
          inboxMessages.push({
            id: m.id || `${agentId}-${m.timestamp}-${idx}`,
            agentId,
            content: m.content,
            timestamp: m.timestamp,
            meta: m.meta,
          });
        });
    });

    inboxMessages.sort((a, b) => {
      const at = new Date(a.timestamp).getTime();
      const bt = new Date(b.timestamp).getTime();
      return bt - at;
    });

    setMessages(inboxMessages);
    setSelectedMessageId((prev) => {
      if (prev && inboxMessages.some((m) => m.id === prev)) return prev;
      return inboxMessages[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await fetchMessages();
      } catch (err: any) {
        if (alive) setError(err.message || "Failed to load messages");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchMessages]);

  const deleteSelectedMessage = async () => {
    if (!selectedMessage) return;
    if (!confirm("Delete this message from the inbox?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/openclaw/agents/${encodeURIComponent(selectedMessage.agentId)}/chat`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selectedMessage.id }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Failed to delete message");
      await fetchMessages();
      toast.success("Message deleted");
    } catch (err: any) {
      setError(err.message || "Failed to delete message");
      toast.error(err.message || "Failed to delete message");
    } finally {
      setSaving(false);
    }
  };

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedMessageId) || null,
    [messages, selectedMessageId]
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchMessages();
    } catch (err: any) {
      setError(err.message || "Failed to refresh messages");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3 md:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Messages
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Important project updates from agents.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing || loading || saving}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">{messages.length} messages</Badge>
        <Badge variant="outline">{new Set(messages.map((m) => m.agentId)).size} agents</Badge>
      </div>

      <div className="flex-1 min-h-0 grid gap-3 md:grid-cols-[340px,minmax(0,1fr)]">
        <Card className="min-h-0 flex flex-col">
          <CardHeader className="pb-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 px-0 pb-0">
            <ScrollArea className="h-full px-4 pb-4">
              {loading ? (
                <div className="text-sm text-muted-foreground py-4">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No agent messages yet.</div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMessageId(m.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedMessageId === m.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          {m.agentId}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{formatTime(m.timestamp)}</span>
                      </div>
                      <p className="text-sm line-clamp-3 text-foreground">{m.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="min-h-0 flex flex-col">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Message Detail</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : selectedMessage ? (
              <ScrollArea className="h-full pr-2">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{selectedMessage.agentId}</Badge>
                    <span>{formatTime(selectedMessage.timestamp)}</span>
                    {selectedMessage.meta?.model && <span>Model: {selectedMessage.meta.model}</span>}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={deleteSelectedMessage}
                      disabled={saving}
                      className="ml-auto"
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedMessage.content}</p>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-muted-foreground">Select a message from the inbox.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
