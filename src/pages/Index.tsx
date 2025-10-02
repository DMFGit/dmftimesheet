import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { AuthForm } from "@/components/auth/AuthForm";
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus, History, CalendarDays, TrendingUp, Users, CheckCircle, Grid, List, Eye, Edit, Trash2, AlertTriangle, CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { parseDateSafe } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { TimeEntry } from "@/types/timesheet";

interface WeeklyData {
  [projectKey: string]: {
    projectName: string;
    days: {
      [dayKey: string]: {
        hours: number;
        descriptions: string[];
      };
    };
  };
}

interface RecentEntry {
  wbs_code: string;
  projectId: string;
  taskId: string;
  subtaskId: string;
  projectName: string;
  taskDescription: string;
  subtaskDescription: string;
  lastUsed: string;
}

interface QuickEntryForm {
  selectedDate: string;
  entryMode: 'manual' | 'recents';
  projectId: string;
  taskId: string;
  subtaskId: string;
  hours: number;
  description: string;
}

const Index = () => {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [quickEntryForm, setQuickEntryForm] = useState<QuickEntryForm>({
    selectedDate: '',
    entryMode: 'manual',
    projectId: '',
    taskId: '',
    subtaskId: '',
    hours: 0,
    description: ''
  });
  
  const { user, employee, loading: authLoading } = useAuth();
  const { 
    timeEntries, 
    budgetItems, 
    getTasksByProject, 
    getSubtasksByTask, 
    getUniqueProjects,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    loading: timeEntriesLoading 
  } = useTimeEntries();
  const { toast } = useToast();

  // ALL useMemo hooks MUST be here - before any conditional returns
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekTimeEntries = useMemo(() => {
    const weekStart = currentWeekStart;
    const weekEnd = addDays(weekStart, 6);
    
    return timeEntries.filter(entry => {
      const entryDate = parseDateSafe(entry.entry_date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
  }, [timeEntries, currentWeekStart]);

  const weeklyData = useMemo(() => {
    const data: WeeklyData = {};
    
    weekTimeEntries.forEach(entry => {
      const budgetItem = budgetItems.find(item => item.wbs_code === entry.wbs_code);
      const projectName = budgetItem?.project_name || entry.wbs_code;
      const projectKey = `${entry.wbs_code}`;
      
      if (!data[projectKey]) {
        data[projectKey] = {
          projectName,
          days: {}
        };
      }

      const dayKey = entry.entry_date;
      if (!data[projectKey].days[dayKey]) {
        data[projectKey].days[dayKey] = {
          hours: 0,
          descriptions: []
        };
      }

      data[projectKey].days[dayKey].hours += Number(entry.hours);
      if (entry.description) {
        data[projectKey].days[dayKey].descriptions.push(entry.description);
      }
    });

    return data;
  }, [weekTimeEntries, budgetItems]);

  const dailyTotals = useMemo(() => {
    const totals: { [dayKey: string]: number } = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      totals[dayKey] = 0;
      
      Object.values(weeklyData).forEach(project => {
        if (project.days[dayKey]) {
          totals[dayKey] += project.days[dayKey].hours;
        }
      });
    });

    return totals;
  }, [weekDays, weeklyData]);

  const recentEntries = useMemo(() => {
    const uniqueEntries = new Map<string, RecentEntry>();
    
    const sortedEntries = [...timeEntries].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    sortedEntries.forEach(entry => {
      if (uniqueEntries.size >= 8) return;
      
      const budgetItem = budgetItems.find(item => item.wbs_code === entry.wbs_code);
      if (!budgetItem) return;

      const key = entry.wbs_code;
      if (!uniqueEntries.has(key)) {
        const projectId = budgetItem.project_number?.toString() || '';
        const taskId = budgetItem.task_number?.toString() || '';
        const subtaskId = budgetItem.subtask_number?.toString() || '';

        uniqueEntries.set(key, {
          wbs_code: entry.wbs_code,
          projectId,
          taskId,
          subtaskId,
          projectName: budgetItem.project_name || '',
          taskDescription: budgetItem.task_description || '',
          subtaskDescription: budgetItem.subtask_description || '',
          lastUsed: entry.created_at
        });
      }
    });

    return Array.from(uniqueEntries.values());
  }, [timeEntries, budgetItems]);

  const dailyEntries = useMemo(() => {
    return timeEntries
      .filter(entry => entry.entry_date === selectedDate)
      .map(entry => {
        const budgetItem = budgetItems.find(item => item.wbs_code === entry.wbs_code);
        return {
          ...entry,
          projectName: budgetItem?.project_name || '',
          taskDescription: budgetItem?.task_description || '',
          subtaskDescription: budgetItem?.subtask_description || '',
          contract: budgetItem?.contract || ''
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [timeEntries, budgetItems, selectedDate]);

  // NOW conditional returns can happen AFTER all hooks
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !employee) {
    return <AuthForm />;
  }

  // Helper functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    } else {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    }
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const openQuickEntry = (date: string) => {
    setEditingEntry(null);
    setQuickEntryForm({
      selectedDate: date,
      entryMode: 'manual',
      projectId: '',
      taskId: '',
      subtaskId: '',
      hours: 0,
      description: ''
    });
    setQuickEntryOpen(true);
  };

  const openEditEntry = (entry: TimeEntry) => {
    const budgetItem = budgetItems.find(item => item.wbs_code === entry.wbs_code);
    
    setEditingEntry(entry);
    setQuickEntryForm({
      selectedDate: entry.entry_date,
      entryMode: 'manual',
      projectId: budgetItem?.project_number?.toString() || '',
      taskId: budgetItem?.task_number?.toString() || '',
      subtaskId: budgetItem?.subtask_number?.toString() || '',
      hours: Number(entry.hours),
      description: entry.description || ''
    });
    setQuickEntryOpen(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this time entry?')) {
      await deleteTimeEntry(entryId);
      toast({
        title: "Success",
        description: "Time entry deleted successfully",
      });
    }
  };

  const loadRecentEntry = (recentEntry: RecentEntry) => {
    setQuickEntryForm(prev => ({
      ...prev,
      entryMode: 'recents',
      projectId: recentEntry.projectId,
      taskId: recentEntry.taskId,
      subtaskId: recentEntry.subtaskId
    }));
  };

  const updateQuickEntryForm = (field: keyof QuickEntryForm, value: string | number) => {
    setQuickEntryForm(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'projectId') {
        updated.taskId = '';
        updated.subtaskId = '';
      } else if (field === 'taskId') {
        updated.subtaskId = '';
      }
      
      return updated;
    });
  };

  const handleQuickSubmit = async () => {
    if (!quickEntryForm.projectId || !quickEntryForm.taskId || quickEntryForm.hours === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const subtaskNumber = quickEntryForm.subtaskId ? parseFloat(quickEntryForm.subtaskId) : null;
    
    console.log('DEBUG - Looking for WBS code with:', {
      projectId: quickEntryForm.projectId,
      taskId: quickEntryForm.taskId,
      subtaskId: quickEntryForm.subtaskId,
      projectNumber: parseInt(quickEntryForm.projectId),
      taskNumber: parseInt(quickEntryForm.taskId),
      subtaskNumber
    });
    
    const matchingItems = budgetItems.filter(item => 
      item.project_number === parseInt(quickEntryForm.projectId) &&
      item.task_number === parseInt(quickEntryForm.taskId)
    );
    
    console.log('DEBUG - Matching items for project/task:', matchingItems.map(item => ({
      project: item.project_number,
      task: item.task_number,
      subtask: item.subtask_number,
      wbs: item.wbs_code
    })));
    
    const budgetItem = budgetItems.find(item => 
      item.project_number === parseInt(quickEntryForm.projectId) &&
      item.task_number === parseInt(quickEntryForm.taskId) &&
      (subtaskNumber === null ? item.subtask_number === null : item.subtask_number === subtaskNumber)
    );
    
    console.log('DEBUG - Found budgetItem:', budgetItem ? {
      wbs: budgetItem.wbs_code,
      project: budgetItem.project_number,
      task: budgetItem.task_number,
      subtask: budgetItem.subtask_number
    } : 'NOT FOUND');
    
    if (!budgetItem) {
      toast({
        title: "Error",
        description: subtaskNumber === null ? "Could not find WBS code for selected task" : "Could not find WBS code for selected subtask",
        variant: "destructive"
      });
      return;
    }

    const entryData = {
      wbs_code: budgetItem.wbs_code,
      entry_date: quickEntryForm.selectedDate,
      hours: quickEntryForm.hours,
      description: quickEntryForm.description,
    };

    if (editingEntry) {
      // Update existing entry
      await updateTimeEntry(editingEntry.id, entryData);
      toast({
        title: "Success",
        description: "Time entry updated successfully",
      });
    } else {
      // Add new entry
      await addTimeEntry(entryData);
      toast({
        title: "Success",
        description: "Time entry added successfully",
      });
    }

    setQuickEntryOpen(false);
    setEditingEntry(null);
    setQuickEntryForm({
      selectedDate: '',
      entryMode: 'manual',
      projectId: '',
      taskId: '',
      subtaskId: '',
      hours: 0,
      description: ''
    });
  };

  const handleSubmitTimesheet = async () => {
    if (draftEntries.length === 0) {
      toast({
        title: "Info",
        description: "No draft entries to submit",
        variant: "default"
      });
      return;
    }

    try {
      // Update all draft entries to submitted status
      const { error } = await supabase
        .from('Time_Entries')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('employee_id', employee?.id)
        .eq('status', 'draft')
        .gte('entry_date', format(currentWeekStart, 'yyyy-MM-dd'))
        .lte('entry_date', format(addDays(currentWeekStart, 6), 'yyyy-MM-dd'));

      if (error) throw error;

      // Send notification to admin
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'timesheet_submitted',
            employeeId: employee?.id,
            weekDetails: {
              weekStart: format(currentWeekStart, 'yyyy-MM-dd'),
              weekEnd: format(addDays(currentWeekStart, 6), 'yyyy-MM-dd'),
              totalHours: weeklyHours,
              entryCount: draftEntries.length
            }
          },
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the main operation if notification fails
      }

      toast({
        title: "Success",
        description: `Timesheet submitted successfully! ${draftEntries.length} entries submitted for review.`,
      });

      // Refresh data to update UI
      window.location.reload();

    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to submit timesheet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const projects = Object.keys(weeklyData);
  const hasData = projects.length > 0;
  const weeklyHours = Object.values(dailyTotals).reduce((sum, hours) => sum + hours, 0);
  const approvedHours = weekTimeEntries.filter(entry => entry.status === 'approved').reduce((sum, entry) => sum + Number(entry.hours), 0);
  const draftEntries = weekTimeEntries.filter(entry => entry.status === 'draft');
  const submittedEntries = weekTimeEntries.filter(entry => entry.status === 'submitted');
  const hasUnsubmittedEntries = draftEntries.length > 0;

  // Calculate billable hours (entries with budget amounts)
  const billableHours = weekTimeEntries
    .filter(entry => {
      const budgetItem = budgetItems.find(item => item.wbs_code === entry.wbs_code);
      return budgetItem && (budgetItem.budget_amount || budgetItem.dmf_budget_amount);
    })
    .reduce((sum, entry) => sum + Number(entry.hours), 0);
  
  const billablePercentage = weeklyHours > 0 ? (billableHours / 40) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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

          <Card className="shadow-md border-primary/20 bg-primary-light/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-foreground">Billable %</p>
                  <p className="text-3xl font-bold text-primary">{billablePercentage.toFixed(1)}%</p>
                  <p className="text-sm font-medium text-primary-foreground/80">{billableHours}h of 40h target</p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary" />
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
                  <p className="text-2xl font-bold text-foreground">{getUniqueProjects().length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Daily Hours</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round((weeklyHours / 7) * 10) / 10}h
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {viewMode === 'weekly' ? 'Weekly Timesheet' : 'Daily Timesheet'}
            </h1>
            <p className="text-muted-foreground">
              {viewMode === 'weekly' 
                ? `Week of ${format(currentWeekStart, 'MMM d')} - ${format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}`
                : format(parseDateSafe(selectedDate), 'EEEE, MMMM d, yyyy')
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 p-1 bg-muted rounded-lg">
              <Button
                variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('weekly')}
                className="flex-1"
              >
                <Grid className="h-4 w-4 mr-2" />
                Weekly
              </Button>
              <Button
                variant={viewMode === 'daily' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('daily')}
                className="flex-1"
              >
                <List className="h-4 w-4 mr-2" />
                Daily
              </Button>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              {viewMode === 'weekly' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous Week
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToCurrentWeek}
                    className="px-3"
                  >
                    <Calendar className="h-4 w-4" />
                    Current Week
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek('next')}
                  >
                    Next Week
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(format(addDays(parseDateSafe(selectedDate), -1), 'yyyy-MM-dd'))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous Day
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                    className="px-3"
                  >
                    <Calendar className="h-4 w-4" />
                    Today
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(format(addDays(parseDateSafe(selectedDate), 1), 'yyyy-MM-dd'))}
                  >
                    Next Day
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'weekly' ? (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time Entry Summary
                </CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => openQuickEntry(format(new Date(), 'yyyy-MM-dd'))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            </CardHeader>
          <CardContent>
            {authLoading || timeEntriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : hasData ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-3 border-b border-border font-semibold">
                        Project
                      </th>
                      {weekDays.map((day, index) => (
                        <th key={index} className="text-center p-3 border-b border-border font-semibold min-w-24">
                          <div>
                            <div className="text-sm">{format(day, 'EEE')}</div>
                            <div className="text-xs text-muted-foreground">{format(day, 'M/d')}</div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((projectKey) => {
                      const project = weeklyData[projectKey];
                      return (
                        <tr key={projectKey} className="hover:bg-muted/50">
                          <td className="p-3 border-b border-border">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="font-medium text-sm cursor-help">
                                  {project.projectName}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-warning-light border-warning">
                                <div className="space-y-1">
                                  <div className="font-semibold">{project.projectName}</div>
                                  {(() => {
                                    const budgetItem = budgetItems.find(item => item.wbs_code === projectKey);
                                    return budgetItem ? (
                                      <div className="text-sm space-y-1">
                                        {budgetItem.task_description && (
                                          <div><strong>Task:</strong> {budgetItem.task_description}</div>
                                        )}
                                        {budgetItem.subtask_description && (
                                          <div><strong>Subtask:</strong> {budgetItem.subtask_description}</div>
                                        )}
                                        {budgetItem.task_unit && (
                                          <div><strong>Unit:</strong> {budgetItem.task_unit}</div>
                                        )}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                            <div className="text-xs text-muted-foreground">
                              {projectKey}
                            </div>
                          </td>
                          {weekDays.map((day, index) => {
                            const dayKey = format(day, 'yyyy-MM-dd');
                            const dayData = project.days[dayKey];
                            const hours = dayData?.hours || 0;
                            const descriptions = dayData?.descriptions || [];
                            
                            return (
                              <td key={index} className="p-3 border-b border-border text-center">
                                {hours > 0 ? (
                                   <div className="flex flex-col items-center gap-1">
                                     <div className="flex items-center gap-1">
                                       <Tooltip>
                                         <TooltipTrigger asChild>
                                           <Badge
                                             variant={hours >= 8 ? "default" : "secondary"}
                                             className="cursor-help"
                                           >
                                             {hours}h
                                           </Badge>
                                         </TooltipTrigger>
                                          <TooltipContent className="max-w-xs bg-warning-light border-warning">
                                            <div className="space-y-1">
                                              <div className="font-semibold">{hours} hours</div>
                                              {(() => {
                                                const budgetItem = budgetItems.find(item => item.wbs_code === projectKey);
                                                return budgetItem ? (
                                                  <div className="text-sm space-y-1">
                                                    {budgetItem.task_description && (
                                                      <div><strong>Task:</strong> {budgetItem.task_description}</div>
                                                    )}
                                                    {budgetItem.subtask_description && (
                                                      <div><strong>Subtask:</strong> {budgetItem.subtask_description}</div>
                                                    )}
                                                    {budgetItem.task_unit && (
                                                      <div><strong>Unit:</strong> {budgetItem.task_unit}</div>
                                                    )}
                                                  </div>
                                                ) : null;
                                              })()}
                                              {descriptions.length > 0 && (
                                                <div className="text-sm border-t pt-1 mt-2">
                                                  <div className="font-medium mb-1">Notes:</div>
                                                  {descriptions.map((desc, i) => (
                                                    <div key={i}>• {desc}</div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </TooltipContent>
                                       </Tooltip>
                                       
                                       {/* Red warning indicator for rejected entries */}
                                       {weekTimeEntries.some(entry => 
                                         entry.entry_date === dayKey && 
                                         entry.wbs_code === projectKey && 
                                         entry.status === 'rejected'
                                       ) && (
                                         <AlertTriangle className="h-3 w-3 text-destructive" />
                                       )}
                                     </div>
                                    
                                     {/* Show edit and delete buttons for draft and rejected entries */}
                                     {weekTimeEntries.some(entry => 
                                       entry.entry_date === dayKey && 
                                       entry.wbs_code === projectKey && 
                                       (entry.status === 'draft' || entry.status === 'rejected')
                                     ) && (
                                       <div className="flex gap-1">
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           className="w-6 h-6 p-0 text-muted-foreground hover:text-primary"
                                           onClick={() => {
                                             const editableEntry = weekTimeEntries.find(entry => 
                                               entry.entry_date === dayKey && 
                                               entry.wbs_code === projectKey && 
                                               (entry.status === 'draft' || entry.status === 'rejected')
                                             );
                                             if (editableEntry) openEditEntry(editableEntry);
                                           }}
                                         >
                                           <Edit className="h-3 w-3" />
                                         </Button>
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           className="w-6 h-6 p-0 text-muted-foreground hover:text-destructive"
                                           onClick={() => {
                                             const deletableEntry = weekTimeEntries.find(entry => 
                                               entry.entry_date === dayKey && 
                                               entry.wbs_code === projectKey && 
                                               (entry.status === 'draft' || entry.status === 'rejected')
                                             );
                                             if (deletableEntry) handleDeleteEntry(deletableEntry.id);
                                           }}
                                         >
                                           <Trash2 className="h-3 w-3" />
                                         </Button>
                                       </div>
                                     )}
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-foreground w-8 h-8 p-0"
                                    onClick={() => openQuickEntry(dayKey)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td className="p-3 border-t border-border font-semibold">
                        Daily Totals
                      </td>
                      {weekDays.map((day, index) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const total = dailyTotals[dayKey] || 0;
                        
                        return (
                          <td key={index} className="p-3 border-t border-border text-center">
                            {total >= 8 ? (
                              <Badge
                                variant="default"
                                className="font-semibold"
                              >
                                {total}h / 8h
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-semibold text-muted-foreground hover:text-foreground"
                                onClick={() => openQuickEntry(dayKey)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {total}h / 8h
                              </Button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>

                {/* Weekly Summary & Submit Section */}
                <div className="border-t border-border pt-6 mt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-semibold">
                          Weekly Total: <span className="text-2xl text-primary">{weeklyHours}h</span>
                        </div>
                        {weeklyHours >= 40 && (
                          <Badge variant="default" className="text-sm">
                            Full Week
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Draft: {draftEntries.length} entries</span>
                        <span>Submitted: {submittedEntries.length} entries</span>
                        <span>Approved: {weekTimeEntries.filter(e => e.status === 'approved').length} entries</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {hasUnsubmittedEntries && (
                        <Button
                          onClick={handleSubmitTimesheet}
                          className="bg-primary hover:bg-primary/90"
                          size="lg"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Timesheet ({draftEntries.length} entries)
                        </Button>
                      )}
                      
                      {!hasUnsubmittedEntries && submittedEntries.length > 0 && (
                        <Badge variant="secondary" className="text-sm px-3 py-2">
                          <Clock className="h-4 w-4 mr-2" />
                          Timesheet Submitted - Awaiting Review
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No time entries for this week</p>
                <p className="text-sm text-muted-foreground">
                  Click the + buttons or Add Entry to create time entries
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        ) : (
          /* Daily View */
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Daily Time Entries - {format(parseDateSafe(selectedDate), 'MMM d, yyyy')}
                </CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => openQuickEntry(selectedDate)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {authLoading || timeEntriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : dailyEntries.length > 0 ? (
                <div className="space-y-4">
                  {dailyEntries.map((entry) => (
                    <div key={entry.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-2">
                             <Badge variant="outline" className="text-xs font-mono">
                               {entry.wbs_code}
                             </Badge>
                             <div className="flex items-center gap-1">
                               <Badge 
                                 variant={entry.status === 'approved' ? 'default' : entry.status === 'rejected' ? 'destructive' : 'secondary'}
                                 className="text-xs"
                               >
                                 {entry.status}
                               </Badge>
                               {entry.status === 'rejected' && (
                                 <AlertTriangle className="h-3 w-3 text-destructive" />
                               )}
                             </div>
                            
                            {/* Edit and Delete buttons for draft and rejected entries */}
                            {(entry.status === 'draft' || entry.status === 'rejected') && (
                              <div className="flex items-center gap-1 ml-auto">
                                {entry.status === 'rejected' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-xs text-warning">
                                        Fix & Resubmit
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit this rejected entry to fix issues and resubmit</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0 text-muted-foreground hover:text-primary"
                                  onClick={() => openEditEntry(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h3 className="font-semibold text-lg mb-1 cursor-help">{entry.projectName}</h3>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <div className="font-semibold">{entry.projectName}</div>
                                <div className="text-sm space-y-1">
                                  {entry.taskDescription && (
                                    <div><strong>Task:</strong> {entry.taskDescription}</div>
                                  )}
                                  {entry.subtaskDescription && (
                                    <div><strong>Subtask:</strong> {entry.subtaskDescription}</div>
                                  )}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Task:</span>
                              <span>{entry.taskDescription}</span>
                            </div>
                            
                            {entry.subtaskDescription && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Subtask:</span>
                                <span>{entry.subtaskDescription}</span>
                              </div>
                            )}
                            
                            {entry.contract && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Contract:</span>
                                <span>{entry.contract}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary mb-1">
                            {entry.hours}h
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'h:mm a')}
                          </div>
                        </div>
                      </div>
                      
                      {entry.description && (
                        <div className="border-t border-border pt-3 mt-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-muted-foreground min-w-fit">Description:</span>
                            <p className="text-sm text-foreground">{entry.description}</p>
                          </div>
                        </div>
                      )}
                      
                      {entry.review_notes && (
                        <div className="border-t border-border pt-3 mt-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-muted-foreground min-w-fit">Review Notes:</span>
                            <p className="text-sm text-destructive">{entry.review_notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="border-t border-border pt-4 mt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Hours:</span>
                      <span className="text-lg font-bold text-primary">
                        {dailyEntries.reduce((sum, entry) => sum + Number(entry.hours), 0)}h
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No time entries for this date</p>
                  <p className="text-sm text-muted-foreground">
                    Click Add Entry to create your first time entry for {format(parseDateSafe(selectedDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Entry Dialog */}
        <Dialog open={quickEntryOpen} onOpenChange={setQuickEntryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {quickEntryForm.selectedDate ? format(parseDateSafe(quickEntryForm.selectedDate), 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={quickEntryForm.selectedDate ? parseDateSafe(quickEntryForm.selectedDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          updateQuickEntryForm('selectedDate', format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("2020-01-01")
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Entry Mode Toggle */}
              <div className="flex items-center justify-center space-x-2 p-1 bg-muted rounded-lg">
                <Button
                  type="button"
                  variant={quickEntryForm.entryMode === 'manual' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => updateQuickEntryForm('entryMode', 'manual')}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Manual Entry
                </Button>
                <Button
                  type="button"
                  variant={quickEntryForm.entryMode === 'recents' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => updateQuickEntryForm('entryMode', 'recents')}
                  className="flex-1"
                >
                  <History className="h-4 w-4 mr-2" />
                  Recents
                </Button>
              </div>

              {/* Recents Mode */}
              {quickEntryForm.entryMode === 'recents' ? (
                <div className="space-y-4">
                  {recentEntries.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        <Label>Recent Time Entries</Label>
                        <div className="grid gap-2 max-h-60 overflow-y-auto">
                          {recentEntries.map((recent, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant={quickEntryForm.projectId === recent.projectId && 
                                       quickEntryForm.taskId === recent.taskId && 
                                       quickEntryForm.subtaskId === recent.subtaskId ? "default" : "outline"}
                              className="justify-start h-auto p-4 text-left"
                              onClick={() => loadRecentEntry(recent)}
                            >
                              <div className="flex-1">
                                <div className="font-semibold">{recent.projectName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {recent.taskDescription}
                                  {recent.subtaskDescription && ` • ${recent.subtaskDescription}`}
                                </div>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {recent.wbs_code}
                                </Badge>
                              </div>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Show hours and description inputs for selected entry */}
                      {quickEntryForm.projectId && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Hours</Label>
                              <Select 
                                value={quickEntryForm.hours.toString()} 
                                onValueChange={(value) => updateQuickEntryForm('hours', parseFloat(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select hours" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover z-50">
                                  {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((hour) => (
                                    <SelectItem key={hour} value={hour.toString()}>
                                      {hour} hours
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              placeholder="Describe the work performed..."
                              value={quickEntryForm.description}
                              onChange={(e) => updateQuickEntryForm('description', e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent entries found</p>
                      <p className="text-sm text-muted-foreground">Create some time entries to see them here</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual Entry Mode */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select 
                        value={quickEntryForm.projectId} 
                        onValueChange={(value) => updateQuickEntryForm('projectId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {getUniqueProjects().map((project) => (
                            <SelectItem key={project.project_number} value={project.project_number.toString()}>
                              {project.project_number} - {project.project_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Task</Label>
                      <Select 
                        value={quickEntryForm.taskId} 
                        onValueChange={(value) => updateQuickEntryForm('taskId', value)}
                        disabled={!quickEntryForm.projectId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {getTasksByProject(parseInt(quickEntryForm.projectId)).map((task) => (
                            <SelectItem key={task.task_number} value={task.task_number.toString()}>
                              {task.task_number} - {task.task_description}
                              {task.task_unit && <span className="text-muted-foreground ml-2">({task.task_unit})</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Subtask (Optional)</Label>
                      <Select 
                        value={quickEntryForm.subtaskId || ''} 
                        onValueChange={(value) => updateQuickEntryForm('subtaskId', value)}
                        disabled={!quickEntryForm.taskId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subtask" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {getSubtasksByTask(quickEntryForm.projectId, quickEntryForm.taskId).map((subtask) => {
                            const parentTask = getTasksByProject(parseInt(quickEntryForm.projectId)).find(t => t.task_number.toString() === quickEntryForm.taskId);
                            return (
                              <SelectItem key={subtask.id} value={subtask.id}>
                                {subtask.number} - {subtask.description}
                                {parentTask?.task_unit && <span className="text-muted-foreground ml-2">({parentTask.task_unit})</span>}
                                {subtask.wbs_code && <span className="text-xs text-muted-foreground ml-2">[{subtask.wbs_code}]</span>}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Hours</Label>
                      <Select 
                        value={quickEntryForm.hours.toString()} 
                        onValueChange={(value) => updateQuickEntryForm('hours', parseFloat(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select hours" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour} hours
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the work performed..."
                      value={quickEntryForm.description}
                      onChange={(e) => updateQuickEntryForm('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setQuickEntryOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleQuickSubmit}
                  disabled={!quickEntryForm.projectId || !quickEntryForm.taskId || quickEntryForm.hours === 0}
                >
                  {editingEntry ? 'Update Entry' : 'Add Time Entry'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Index;