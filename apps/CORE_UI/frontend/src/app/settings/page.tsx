"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, RotateCcw, Sparkles, Zap, Target, Key, Eye, EyeOff, Sun, Moon, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { getColorSchemeInfo } from "@/lib/themes/theme-config";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { baseTheme, colorScheme, glassEffect, setBaseTheme, setColorScheme, setGlassEffect, availableBaseThemes, availableColorSchemes, availableGlassEffects } = useTheme();
  
  // General settings
  const [displayName, setDisplayName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [timezone, setTimezone] = useState("UTC-8");
  const [language, setLanguage] = useState("en");
  
  // Display settings
  const [density, setDensity] = useState("comfortable");
  const [animations, setAnimations] = useState(true);
  
  // AI Prompt settings
  const [domainFocus, setDomainFocus] = useState<string[]>(["planning", "execution"]);
  const [responseStyle, setResponseStyle] = useState("detailed");
  const [analysisDepth, setAnalysisDepth] = useState("standard");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [relationshipPrompt, setRelationshipPrompt] = useState("");
  const [impactPrompt, setImpactPrompt] = useState("");
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [pulseUpdates, setPulseUpdates] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  
  // API Configuration
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.hasApiKey) {
            setOpenaiApiKey(data.openaiApiKey); // This will be masked
          }
          setOpenaiModel(data.openaiModel || 'gpt-4o');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  const domains = [
    { id: "planning", label: "Planning", icon: "�" },
    { id: "execution", label: "Execution", icon: "⚡" },
    { id: "monitoring", label: "Monitoring", icon: "📊" },
    { id: "guardrails", label: "Guardrails", icon: "🛡️" },
    { id: "coordination", label: "Coordination", icon: "�" },
    { id: "analysis", label: "Analysis", icon: "�" },
  ];

  const presetPrompts = [
    {
      id: "task-planner",
      name: "Task Planner",
      description: "Focus on task decomposition and dependency mapping",
      domains: ["planning", "coordination"],
      systemPrompt: "Prioritize task breakdown, dependency identification, resource allocation, and scheduling constraints.",
    },
    {
      id: "executor",
      name: "Execution Monitor",
      description: "Focus on task execution and progress tracking",
      domains: ["execution", "monitoring"],
      systemPrompt: "Prioritize execution status, bottleneck detection, progress metrics, and completion tracking.",
    },
    {
      id: "guardian",
      name: "Guardrail Enforcer",
      description: "Balanced view across all task domains",
      domains: ["guardrails", "analysis", "planning", "execution"],
      systemPrompt: "Maintain balanced analysis across all task domains with focus on guardrail compliance and quality assurance.",
    },
  ];

  const toggleDomain = (domain: string) => {
    setDomainFocus(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const applyPreset = (preset: typeof presetPrompts[0]) => {
    setDomainFocus(preset.domains);
    setCustomSystemPrompt(preset.systemPrompt);
    toast.success(`Applied "${preset.name}" preset`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save API configuration if provided
      if (openaiApiKey && !openaiApiKey.startsWith('sk-...')) {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            openaiApiKey,
            openaiModel,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save settings');
        }

        toast.success("API settings saved successfully! Restart the app to apply changes.");
      } else {
        // Show confirmation of current settings
        const settingsSummary = [
          `Theme: ${baseTheme.charAt(0).toUpperCase() + baseTheme.slice(1)}`,
          `Color Scheme: ${colorScheme.charAt(0).toUpperCase() + colorScheme.slice(1)}`,
          `Visual Style: ${glassEffect.charAt(0).toUpperCase() + glassEffect.slice(1)}`,
        ].join(' • ');
        
        toast.success(`Settings confirmed!\n${settingsSummary}`, {
          duration: 3000,
        });
      }
      
      // TODO: Save other settings (AI prompts, display, notifications) to backend
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to defaults
    setDomainFocus(["planning", "execution"]);
    setResponseStyle("detailed");
    setAnalysisDepth("standard");
    setCustomSystemPrompt("");
    setRelationshipPrompt("");
    setImpactPrompt("");
    toast.info("Settings reset to defaults");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your account preferences and AI behavior
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[750px]">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="api-config">
              <Key className="h-4 w-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="ai-prompts">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Prompts
            </TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="UTC-7">Mountain Time (UTC-7)</SelectItem>
                      <SelectItem value="UTC-6">Central Time (UTC-6)</SelectItem>
                      <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Configuration */}
          <TabsContent value="api-config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  OpenAI API Configuration
                </CardTitle>
                <CardDescription>
                  Configure your OpenAI API key for AI-powered features. Your key is stored securely and never shared.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="openaiApiKey"
                        type={showApiKey ? "text" : "password"}
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        placeholder="sk-proj-..."
                        className="pr-10"
                        disabled={isLoadingSettings}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowApiKey(!showApiKey)}
                        disabled={isLoadingSettings}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {openaiApiKey.startsWith('sk-...') ? (
                      <>Existing key is masked for security. Enter a new key to update it.</>
                    ) : (
                      <>
                        Get your API key from{" "}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          OpenAI Platform
                        </a>
                      </>
                    )}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="openaiModel">Model</Label>
                  <Select value={openaiModel} onValueChange={setOpenaiModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Faster, cheaper)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the model that best fits your needs and budget
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">Info</Badge>
                    <div className="text-sm space-y-1">
                      <p className="font-medium">Security Notice</p>
                      <p className="text-muted-foreground">
                        Your API key will be stored in a <code className="bg-background px-1 py-0.5 rounded">.env</code> file
                        on your local machine. This file is automatically excluded from version control via <code className="bg-background px-1 py-0.5 rounded">.gitignore</code>.
                      </p>
                      <p className="text-muted-foreground mt-2">
                        Never commit your <code className="bg-background px-1 py-0.5 rounded">.env</code> file to Git or share your API key publicly.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Prompts Settings */}
          <TabsContent value="ai-prompts" className="space-y-4">
            {/* Presets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Presets
                </CardTitle>
                <CardDescription>
                  Apply predefined configurations for common roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {presetPrompts.map((preset) => (
                    <Card key={preset.id} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => applyPreset(preset)}>
                      <CardHeader>
                        <CardTitle className="text-sm">{preset.name}</CardTitle>
                        <CardDescription className="text-xs">{preset.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button size="sm" variant="outline" className="w-full">
                          Apply Preset
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Domain Focus */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Domain Focus
                </CardTitle>
                <CardDescription>
                  Select which engineering domains AI should prioritize in analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      onClick={() => toggleDomain(domain.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${domainFocus.includes(domain.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{domain.icon}</span>
                        <span className="font-medium">{domain.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Response Style */}
            <Card>
              <CardHeader>
                <CardTitle>Response Style</CardTitle>
                <CardDescription>
                  Control how AI formats and presents information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Detail Level</Label>
                  <Select value={responseStyle} onValueChange={setResponseStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brief">Brief - Quick summaries</SelectItem>
                      <SelectItem value="standard">Standard - Balanced detail</SelectItem>
                      <SelectItem value="detailed">Detailed - Comprehensive analysis</SelectItem>
                      <SelectItem value="technical">Technical - Deep technical focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Analysis Depth</Label>
                  <Select value={analysisDepth} onValueChange={setAnalysisDepth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shallow">Shallow - Direct impacts only</SelectItem>
                      <SelectItem value="standard">Standard - 2-3 levels deep</SelectItem>
                      <SelectItem value="deep">Deep - Full dependency tree</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Custom Prompts */}
            <Card>
              <CardHeader>
                <CardTitle>Custom System Prompts</CardTitle>
                <CardDescription>
                  Override default AI behavior with custom instructions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">General System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    placeholder="e.g., Always prioritize safety-critical requirements and highlight regulatory compliance issues..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt applies to all AI interactions
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="relationshipPrompt">Relationship Analysis Prompt</Label>
                  <Textarea
                    id="relationshipPrompt"
                    value={relationshipPrompt}
                    onChange={(e) => setRelationshipPrompt(e.target.value)}
                    placeholder="e.g., Focus on task dependencies and agent coordination when analyzing relationships..."
                    rows={3}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="impactPrompt">Impact Analysis Prompt</Label>
                  <Textarea
                    id="impactPrompt"
                    value={impactPrompt}
                    onChange={(e) => setImpactPrompt(e.target.value)}
                    placeholder="e.g., When analyzing impact, consider downstream task dependencies and guardrail violations..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Settings */}
          <TabsContent value="display" className="space-y-4">
            {/* Base Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5" />
                  Base Theme
                </CardTitle>
                <CardDescription>Choose between light and dark mode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {availableBaseThemes.map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setBaseTheme(theme)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        baseTheme === theme
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {theme === 'light' ? (
                          <Sun className="h-5 w-5" />
                        ) : (
                          <Moon className="h-5 w-5" />
                        )}
                        <div className="text-left">
                          <div className="font-medium capitalize">{theme}</div>
                          <div className="text-xs text-muted-foreground">
                            {theme === 'light' ? 'Bright backgrounds' : 'Dark backgrounds'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Color Scheme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Color Scheme
                </CardTitle>
                <CardDescription>Choose your color palette</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availableColorSchemes.map((scheme) => {
                    const info = getColorSchemeInfo(scheme);
                    return (
                      <button
                        key={scheme}
                        onClick={() => setColorScheme(scheme)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          colorScheme === scheme
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="text-left space-y-2">
                          <div className="font-medium">{info.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {info.description}
                          </div>
                          {/* Color preview dots */}
                          <div className="flex gap-1 mt-2">
                            {scheme === 'standard' && (
                              <>
                                <div className="w-3 h-3 rounded-full bg-gray-500" />
                                <div className="w-3 h-3 rounded-full bg-gray-600" />
                                <div className="w-3 h-3 rounded-full bg-gray-700" />
                              </>
                            )}
                            {scheme === 'colorful' && (
                              <>
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <div className="w-3 h-3 rounded-full bg-purple-500" />
                                <div className="w-3 h-3 rounded-full bg-pink-500" />
                              </>
                            )}
                            {scheme === 'monotone' && (
                              <>
                                <div className="w-3 h-3 rounded-full bg-gray-300" />
                                <div className="w-3 h-3 rounded-full bg-gray-500" />
                                <div className="w-3 h-3 rounded-full bg-gray-700" />
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Glass Effect Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Visual Style
                </CardTitle>
                <CardDescription>Choose between flat or glass effect styling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {availableGlassEffects.map((effect) => (
                    <button
                      key={effect}
                      onClick={() => setGlassEffect(effect)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        glassEffect === effect
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-left space-y-2">
                        <div className="font-medium capitalize">{effect}</div>
                        <div className="text-xs text-muted-foreground">
                          {effect === 'flat' 
                            ? 'Clean, solid backgrounds' 
                            : 'Subtle glass-like depth with blur'}
                        </div>
                        {/* Visual preview */}
                        <div className="mt-3 h-12 rounded-md border overflow-hidden">
                          {effect === 'flat' ? (
                            <div className="h-full bg-muted" />
                          ) : (
                            <div 
                              className="h-full relative"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Other Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Display Options</CardTitle>
                <CardDescription>Additional display preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Density</Label>
                    <p className="text-sm text-muted-foreground">
                      Adjust content spacing
                    </p>
                  </div>
                  <Select value={density} onValueChange={setDensity}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable UI animations and transitions
                    </p>
                  </div>
                  <Switch
                    checked={animations}
                    onCheckedChange={setAnimations}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how and when you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get real-time browser notifications
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Pulse Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications for activity feed changes
                    </p>
                  </div>
                  <Switch
                    checked={pulseUpdates}
                    onCheckedChange={setPulseUpdates}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Reminders for upcoming task deadlines
                    </p>
                  </div>
                  <Switch
                    checked={taskReminders}
                    onCheckedChange={setTaskReminders}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
