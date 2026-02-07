"use client";

import { TestTube, Play, FileCheck, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TestSection() {
  const testSuites = [
    {
      id: "1",
      name: "Flight Control System Tests",
      status: "passed",
      totalTests: 156,
      passedTests: 154,
      failedTests: 2,
      lastRun: "2024-01-15T10:30:00Z",
      duration: "2m 34s"
    },
    {
      id: "2", 
      name: "Engine Performance Tests",
      status: "running",
      totalTests: 89,
      passedTests: 76,
      failedTests: 0,
      lastRun: "2024-01-15T11:15:00Z",
      duration: "1m 45s"
    },
    {
      id: "3",
      name: "Landing Gear Integration Tests", 
      status: "failed",
      totalTests: 43,
      passedTests: 38,
      failedTests: 5,
      lastRun: "2024-01-15T09:45:00Z",
      duration: "45s"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle className="w-4 h-4" style={{ color: '#6e9fc1' }} />;
      case "failed": return <XCircle className="w-4 h-4" style={{ color: '#acacac' }} />;
      case "running": return <Play className="w-4 h-4" style={{ color: '#395a7f' }} />;
      default: return <AlertTriangle className="w-4 h-4" style={{ color: '#acacac' }} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "text-xs border-0";
    switch (status) {
      case "passed": return `${baseClasses}` + ` bg-[#a3cae9]/20 text-[#395a7f] dark:bg-[#6e9fc1]/10 dark:text-[#a3cae9]`;
      case "failed": return `${baseClasses}` + ` bg-[#e9ecee]/50 text-[#acacac] dark:bg-[#acacac]/10 dark:text-[#e9ecee]`;
      case "running": return `${baseClasses}` + ` bg-[#395a7f]/10 text-[#395a7f] dark:bg-[#395a7f]/20 dark:text-[#6e9fc1]`;
      default: return `${baseClasses}` + ` bg-[#e9ecee] text-[#acacac] dark:bg-[#acacac]/10 dark:text-[#e9ecee]`;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <TestTube className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Test Management</h1>
            <p className="text-muted-foreground">Automated test execution and results</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Play className="w-4 h-4 mr-2" />
            Run All Tests
          </Button>
          <Button variant="outline">
            <FileCheck className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Test Suites */}
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Test Suites</h2>
            <Badge variant="secondary">
              {testSuites.length} suites
            </Badge>
          </div>
          
          <div className="grid gap-4">
            {testSuites.map((suite) => (
              <div key={suite.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(suite.status)}
                    <h3 className="font-medium">{suite.name}</h3>
                  </div>
                  <Badge className={getStatusBadge(suite.status)}>
                    {suite.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Tests</span>
                    <p className="font-medium">{suite.totalTests}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Passed</span>
                    <p className="font-medium" style={{ color: '#6e9fc1' }}>{suite.passedTests}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Failed</span>
                    <p className="font-medium" style={{ color: '#acacac' }}>{suite.failedTests}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration</span>
                    <p className="font-medium">{suite.duration}</p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Last run: {new Date(suite.lastRun).toLocaleString()}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">View Details</Button>
                      <Button variant="ghost" size="sm">
                        <Play className="w-3 h-3 mr-1" />
                        Run
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-2 w-full rounded-full h-2" style={{ backgroundColor: '#e9ecee' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${(suite.passedTests / suite.totalTests) * 100}%`,
                      backgroundColor: '#6e9fc1'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
