import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, Users, CheckCircle, Database, ExternalLink } from "lucide-react";
import { mockEmployees, mockProjects, mockTasks, mockSubtasks, mockTimeEntries } from "@/data/mockData";

interface DemoModeProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const DemoMode = ({ selectedDate, setSelectedDate }: DemoModeProps) => {
  const [showInstructions, setShowInstructions] = useState(true);
  
  // Mock current user
  const currentUser = mockEmployees[0];

  // Calculate demo stats
  const weeklyHours = 32;
  const approvedHours = 24;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-primary">TimeTracker Pro</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-warning border-warning">
                <Database className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
              <div className="text-sm text-right">
                <p className="font-medium text-foreground">{currentUser.name}</p>
                <p className="text-muted-foreground">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Supabase Setup Alert */}
        {showInstructions && (
          <Alert className="mb-8 border-warning bg-warning/10">
            <Database className="h-4 w-4" />
            <AlertDescription className="flex items-start justify-between">
              <div>
                <strong>Demo Mode Active</strong> - To enable full functionality with persistent data, user authentication, and budget tracking, you need to set up Supabase:
                <ol className="mt-2 ml-4 list-decimal space-y-1">
                  <li>Click the green "Supabase" button in the top right</li>
                  <li>Create a new Supabase project</li>
                  <li>Copy your URL and API key to the environment variables</li>
                  <li>Run the database migrations to create your tables</li>
                </ol>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(false)}
                className="ml-4 shrink-0"
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-primary">{weeklyHours}h</p>
                </div>
                <CalendarDays className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-success">{approvedHours}h</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold text-foreground">{mockProjects.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Size</p>
                  <p className="text-2xl font-bold text-foreground">{mockEmployees.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Selection */}
        <Card className="shadow-md mb-8">
          <CardHeader>
            <CardTitle>Select Date for Time Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    size="sm"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setSelectedDate(yesterday.toISOString().split('T')[0]);
                    }}
                    size="sm"
                  >
                    Yesterday
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Demo Time Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-center text-muted-foreground">
                  Time entry form will be available after Supabase setup
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm"><strong>Available Projects:</strong></p>
                  <ul className="text-sm space-y-1 ml-4">
                    {mockProjects.slice(0, 2).map(project => (
                      <li key={project.id}>• {project.number} - {project.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Sample Time Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockTimeEntries.slice(0, 2).map((entry) => {
                const project = mockProjects.find(p => p.id === entry.project_id);
                const task = mockTasks.find(t => t.id === entry.task_id);
                const subtask = mockSubtasks.find(s => s.id === entry.subtask_id);

                return (
                  <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-medium">
                          {project?.number} - {project?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {task?.number} - {task?.description}
                        </p>
                        {subtask && (
                          <p className="text-xs text-muted-foreground">
                            {subtask.number} - {subtask.description}
                            {subtask.wbsCode && (
                              <span className="ml-2 font-mono bg-secondary px-1 rounded">
                                {subtask.wbsCode}
                              </span>
                            )}
                          </p>
                        )}
                        <p className="text-sm text-foreground mt-2">
                          {entry.description}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-semibold">{entry.hours}h</div>
                        <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'}>
                          {entry.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Setup Instructions */}
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Ready to Set Up Supabase?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">What you'll get with Supabase:</h4>
                <ul className="space-y-1 text-sm">
                  <li>✅ Persistent data storage</li>
                  <li>✅ User authentication & security</li>
                  <li>✅ Real-time budget tracking</li>
                  <li>✅ Multi-user support</li>
                  <li>✅ Data export capabilities</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Quick Setup:</h4>
                <ol className="space-y-1 text-sm list-decimal ml-4">
                  <li>Click the green Supabase button (top right)</li>
                  <li>Create a new Supabase project</li>
                  <li>Environment variables will be set automatically</li>
                  <li>Database tables will be created</li>
                  <li>Start using the full timesheet system!</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};