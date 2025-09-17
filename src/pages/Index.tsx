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
import { AuthForm } from "@/components/auth/AuthForm";
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus, History, CalendarDays, TrendingUp, Users, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { parseDateSafe } from "@/lib/utils";

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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 0 }) // Start on Sunday
  );
  
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
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
    loading: timeEntriesLoading 
  } = useTimeEntries();
  const { toast } = useToast();

  // Show auth form if not authenticated
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !employee) {
    return <AuthForm />;
  }

  // Generate the week days (Sunday through Saturday)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Filter time entries for the current week
  const weekTimeEntries = useMemo(() => {
    const weekStart = currentWeekStart;
    const weekEnd = addDays(weekStart, 6);
    
    return timeEntries.filter(entry => {
      const entryDate = parseDateSafe(entry.entry_date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
  }, [timeEntries, currentWeekStart]);

  // Group entries by project and day
  const weeklyData = useMemo(() => {
    const data: WeeklyData = {};
    
    weekTimeEntries.forEach(entry => {
      // Find budget item to get project name
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

  // Calculate daily totals
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

  // Get recent entries (last 8 unique subtasks)
  const recentEntries = useMemo(() => {
    const uniqueEntries = new Map<string, RecentEntry>();
    
    // Sort time entries by creation date (most recent first)
    const sortedEntries = [...timeEntries].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    sortedEntries.forEach(entry => {
      if (uniqueEntries.size >= 8) return;
      
      const budgetItem = budgetItems.find(item => item.wbs_code === entry.wbs_code);
      if (!budgetItem) return;

      const key = entry.wbs_code;
      if (!uniqueEntries.has(key)) {
        // Find the subtask info
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

  const openQuickEntry = (date: string) => {
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
      
      // Reset dependent fields when parent changes
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

    // Find the WBS code for the selected subtask
    const subtaskNumber = quickEntryForm.subtaskId ? parseFloat(quickEntryForm.subtaskId) : 0;
    const budgetItem = budgetItems.find(item => 
      item.project_number === parseInt(quickEntryForm.projectId) &&
      item.task_number === parseInt(quickEntryForm.taskId) &&
      item.subtask_number === subtaskNumber
    );
    
    if (!budgetItem) {
      toast({
        title: "Error",
        description: "Could not find WBS code for selected subtask",
        variant: "destructive"
      });
      return;
    }

    await addTimeEntry({
      wbs_code: budgetItem.wbs_code,
      entry_date: quickEntryForm.selectedDate,
      hours: quickEntryForm.hours,
      description: quickEntryForm.description,
    });

    setQuickEntryOpen(false);
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

  const projects = Object.keys(weeklyData);
  const hasData = projects.length > 0;
  const weeklyHours = Object.values(dailyTotals).reduce((sum, hours) => sum + hours, 0);
  const approvedHours = weekTimeEntries.filter(entry => entry.status === 'approved').reduce((sum, entry) => sum + Number(entry.hours), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
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
                  <p className="text-2xl font-bold text-foreground">{getUniqueProjects().length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-warning" />
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
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Weekly Timesheet</h1>
            <p className="text-muted-foreground">
              Week of {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* Weekly Calendar Grid */}
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
                Quick Add
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
                            <div className="font-medium text-sm">
                              {project.projectName}
                            </div>
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
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant={hours >= 8 ? "default" : "secondary"}
                                        className="cursor-help"
                                      >
                                        {hours}h
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <div className="space-y-1">
                                        <div className="font-semibold">{hours} hours</div>
                                        {descriptions.length > 0 && (
                                          <div className="text-sm">
                                            {descriptions.map((desc, i) => (
                                              <div key={i}>• {desc}</div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
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
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No time entries for this week</p>
                <p className="text-sm text-muted-foreground">
                  Click the + buttons or Quick Add to create time entries
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Entry Dialog */}
        <Dialog open={quickEntryOpen} onOpenChange={setQuickEntryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Add Time Entry - {quickEntryForm.selectedDate ? format(parseDateSafe(quickEntryForm.selectedDate), 'MMM d, yyyy') : ''}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
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
                          {getSubtasksByTask(quickEntryForm.taskId).map((subtask) => {
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
                  Add Time Entry
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