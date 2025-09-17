import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { NewTimeEntryForm } from "@/components/timesheet/NewTimeEntryForm";
import { NewTimesheetSummary } from "@/components/timesheet/NewTimesheetSummary";
import { AuthForm } from "@/components/auth/AuthForm";
import { DemoMode } from "@/components/DemoMode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, TrendingUp, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTimeEntries } from "@/hooks/useTimeEntries";

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const { toast } = useToast();
  const { user, employee, loading: authLoading } = useAuth();
  
  console.log('Auth state:', { user: !!user, employee: !!employee, authLoading });
  const { 
    timeEntries, 
    projects,
    budgetItems,
    loading: timeEntriesLoading, 
    addTimeEntry, 
    submitTimesheet 
  } = useTimeEntries();

  // Show auth form if not authenticated
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !employee) {
    return <AuthForm />;
  }

  const handleNewTimeEntry = async (entryData: {
    projectId: string;
    taskId: string;
    subtaskId?: string;
    hours: number;
    description: string;
  }) => {
    // Find the WBS code for the selected subtask
    const subtaskNumber = entryData.subtaskId ? parseFloat(entryData.subtaskId) : 0;
    const budgetItem = budgetItems.find(item => 
      item.project_number === parseInt(entryData.projectId) &&
      item.task_number === parseInt(entryData.taskId) &&
      item.subtask_number === subtaskNumber
    );
    
    if (!budgetItem) {
      console.error('Could not find WBS code for selected subtask');
      return;
    }

    await addTimeEntry({
      wbs_code: budgetItem.wbs_code,
      entry_date: selectedDate,
      hours: entryData.hours,
      description: entryData.description,
    });
  };

  const handleSubmitForReview = async () => {
    await submitTimesheet(selectedDate);
  };

  const todaysEntries = timeEntries.filter(entry => 
    entry.entry_date === selectedDate
  );

  const thisWeekEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.entry_date);
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    return entryDate >= startOfWeek;
  });

  const weeklyHours = thisWeekEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const approvedHours = thisWeekEntries.filter(entry => entry.status === 'approved').reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header currentUser={employee} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <p className="text-2xl font-bold text-foreground">{projects.length}</p>
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
                  <p className="text-2xl font-bold text-foreground">3</p>
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

        {/* Time Entry and Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <NewTimeEntryForm
            onSubmit={handleNewTimeEntry}
            selectedDate={selectedDate}
          />
          
          <NewTimesheetSummary
            entries={todaysEntries}
            date={selectedDate}
            onSubmitForReview={handleSubmitForReview}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
