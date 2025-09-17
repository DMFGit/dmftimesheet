import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AuthForm } from "@/components/auth/AuthForm";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTimeEntries } from "@/hooks/useTimeEntries";
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

const WeeklyTimesheet = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 0 }) // Start on Sunday
  );
  
  const { user, employee, loading: authLoading } = useAuth();
  const { timeEntries, budgetItems, loading: timeEntriesLoading } = useTimeEntries();

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

  const projects = Object.keys(weeklyData);
  const hasData = projects.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Entry Summary
            </CardTitle>
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
                                  <span className="text-muted-foreground">-</span>
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
                            <Badge
                              variant={total >= 8 ? "default" : total > 0 ? "secondary" : "outline"}
                              className="font-semibold"
                            >
                              {total}h / 8h
                            </Badge>
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
                  Time entries you create will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        {hasData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold text-primary">
                      {Object.values(dailyTotals).reduce((sum, hours) => sum + hours, 0)}h
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                    <p className="text-2xl font-bold text-foreground">{projects.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Daily Hours</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Math.round((Object.values(dailyTotals).reduce((sum, hours) => sum + hours, 0) / 7) * 10) / 10}h
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default WeeklyTimesheet;