import { useState } from "react";
import { Header } from "@/components/layout/header";
import { TimeEntryForm } from "@/components/timesheet/time-entry-form";
import { TimesheetSummary } from "@/components/timesheet/timesheet-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeEntry } from "@/types/timesheet";
import { mockTimeEntries, mockEmployees } from "@/data/mockData";
import { CalendarDays, TrendingUp, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(mockTimeEntries);
  const { toast } = useToast();

  // Mock current user (in real app, this would come from auth)
  const currentUser = mockEmployees[0]; // John Smith

  const handleNewTimeEntry = (entryData: Omit<TimeEntry, 'id' | 'employeeId' | 'employeeName' | 'status'>) => {
    const newEntry: TimeEntry = {
      ...entryData,
      id: Math.random().toString(36).substr(2, 9),
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      status: 'draft'
    };
    
    setTimeEntries(prev => [...prev, newEntry]);
    toast({
      title: "Time entry saved",
      description: `Added ${entryData.hours} hours to your timesheet.`,
    });
  };

  const handleSubmitForReview = () => {
    const draftEntries = timeEntries.filter(entry => 
      entry.status === 'draft' && 
      entry.date === selectedDate &&
      entry.employeeId === currentUser.id
    );
    
    if (draftEntries.length === 0) return;

    const updatedEntries = timeEntries.map(entry => {
      if (entry.status === 'draft' && entry.date === selectedDate && entry.employeeId === currentUser.id) {
        return {
          ...entry,
          status: 'submitted' as const,
          submittedAt: new Date().toISOString()
        };
      }
      return entry;
    });

    setTimeEntries(updatedEntries);
    toast({
      title: "Timesheet submitted",
      description: `Your timesheet for ${new Date(selectedDate).toLocaleDateString()} has been submitted for review.`,
    });
  };

  const todaysEntries = timeEntries.filter(entry => 
    entry.date === selectedDate && entry.employeeId === currentUser.id
  );

  const thisWeekEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    return entryDate >= startOfWeek && entry.employeeId === currentUser.id;
  });

  const weeklyHours = thisWeekEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const approvedHours = thisWeekEntries.filter(entry => entry.status === 'approved').reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header currentUser={currentUser} />
      
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
                  <p className="text-2xl font-bold text-foreground">1</p>
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
          <TimeEntryForm
            onSubmit={handleNewTimeEntry}
            selectedDate={selectedDate}
          />
          
          <TimesheetSummary
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
