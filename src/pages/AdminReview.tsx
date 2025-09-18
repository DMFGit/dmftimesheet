import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeEntry } from '@/types/timesheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, BarChart3, TrendingUp, Users, AlertTriangle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateSafe } from '@/lib/utils';
import { Header } from '@/components/layout/header';

interface TimeEntryWithEmployee extends TimeEntry {
  employee_name?: string;
  project_name?: string;
  task_description?: string;
  subtask_description?: string;
}

export default function AdminReview() {
  const { user, employee } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithEmployee[]>([]);
  const [draftEntries, setDraftEntries] = useState<TimeEntryWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const [dashboardStats, setDashboardStats] = useState({
    totalPending: 0,
    totalHours: 0,
    totalEmployees: 0,
    avgHoursPerEntry: 0,
    totalDrafts: 0,
    draftHours: 0
  });
  const { toast } = useToast();

  // Check admin access
  const isAdmin = employee?.role === 'admin' || user?.email === 'dina@dmfengineering.com';

  useEffect(() => {
    if (isAdmin) {
      fetchPendingTimeEntries();
      fetchDraftTimeEntries();
    }
  }, [isAdmin]);

  const fetchPendingTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('Time_Entries')
        .select(`
          *,
          Employees!Time_Entries_employee_id_fkey(name)
        `)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Enrich with project/task info
      const enrichedEntries = await Promise.all(
        data.map(async (entry: any) => {
          const { data: budgetData } = await supabase
            .from('Project_Budgets')
            .select('Project_Name, Task_Description, Subtask_Description')
            .eq('WBS Code', entry.wbs_code)
            .single();

          return {
            ...entry,
            employee_name: entry.Employees.name,
            project_name: budgetData?.Project_Name,
            task_description: budgetData?.Task_Description,
            subtask_description: budgetData?.Subtask_Description,
          };
        })
      );

      setTimeEntries(enrichedEntries);
      
      // Calculate dashboard stats
      const totalHours = enrichedEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
      const uniqueEmployees = new Set(enrichedEntries.map(entry => entry.employee_id)).size;
      
      setDashboardStats(prev => ({
        ...prev,
        totalPending: enrichedEntries.length,
        totalHours: totalHours,
        totalEmployees: uniqueEmployees,
        avgHoursPerEntry: enrichedEntries.length > 0 ? totalHours / enrichedEntries.length : 0
      }));
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch time entries for review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDraftTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('Time_Entries')
        .select(`
          *,
          Employees!Time_Entries_employee_id_fkey(name)
        `)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Enrich with project/task info
      const enrichedDraftEntries = await Promise.all(
        data.map(async (entry: any) => {
          const { data: budgetData } = await supabase
            .from('Project_Budgets')
            .select('Project_Name, Task_Description, Subtask_Description')
            .eq('WBS Code', entry.wbs_code)
            .single();

          return {
            ...entry,
            employee_name: entry.Employees.name,
            project_name: budgetData?.Project_Name,
            task_description: budgetData?.Task_Description,
            subtask_description: budgetData?.Subtask_Description,
          };
        })
      );

      setDraftEntries(enrichedDraftEntries);
      
      // Calculate draft stats
      const draftHours = enrichedDraftEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
      
      setDashboardStats(prev => ({
        ...prev,
        totalDrafts: enrichedDraftEntries.length,
        draftHours: draftHours
      }));
    } catch (error) {
      console.error('Error fetching draft entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch draft entries",
        variant: "destructive",
      });
    }
  };

  const handleReview = async (entryId: string, status: 'approved' | 'rejected') => {
    try {
      const entry = timeEntries.find(e => e.id === entryId);
      if (!entry) return;

      const updateData: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: employee?.id,
      };

      if (status === 'rejected' && reviewNotes[entryId]) {
        updateData.review_notes = reviewNotes[entryId];
      }

      const { error } = await supabase
        .from('Time_Entries')
        .update(updateData)
        .eq('id', entryId);

      if (error) throw error;

      // Send notification via edge function
      const notificationType = status === 'approved' ? 'time_entry_approved' : 'time_entry_rejected';
      
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: notificationType,
            employeeId: entry.employee_id,
            entryDetails: {
              date: entry.entry_date,
              hours: entry.hours,
              projectName: entry.project_name,
              taskDescription: entry.task_description,
              wbsCode: entry.wbs_code,
            },
            reviewNotes: reviewNotes[entryId] || null,
          },
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the main operation if notification fails
      }

      toast({
        title: "Success",
        description: `Time entry ${status} successfully and notification sent`,
      });

      // Remove from list and update stats
      setTimeEntries(prev => {
        const updatedEntries = prev.filter(entry => entry.id !== entryId);
        const totalHours = updatedEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
        const uniqueEmployees = new Set(updatedEntries.map(entry => entry.employee_id)).size;
        
        setDashboardStats(prev => ({
          ...prev,
          totalPending: updatedEntries.length,
          totalHours: totalHours,
          totalEmployees: uniqueEmployees,
          avgHoursPerEntry: updatedEntries.length > 0 ? totalHours / updatedEntries.length : 0
        }));
        
        return updatedEntries;
      });
      
      // Clear review notes
      setReviewNotes(prev => {
        const updated = { ...prev };
        delete updated[entryId];
        return updated;
      });

    } catch (error) {
      console.error('Error reviewing time entry:', error);
      toast({
        title: "Error",
        description: "Failed to review time entry",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6 space-y-8">
        {/* Page Header */}
        <div className="border-b border-border pb-6">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Review and manage submitted time entries
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Reviews
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalPending}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats.totalPending === 0 ? "All caught up!" : "Entries waiting for review"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Hours
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Hours pending approval
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Draft Entries
              </CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalDrafts}</div>
              <p className="text-xs text-muted-foreground">
                Incomplete entries
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Draft Hours
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.draftHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Hours in drafts
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Employees
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                With pending entries
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Hours/Entry
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.avgHoursPerEntry.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Average per submission
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reviews Section */}
        <div className="space-y-6">
          <Tabs defaultValue="submitted" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-auto grid-cols-2">
                <TabsTrigger value="submitted">
                  Submitted ({dashboardStats.totalPending})
                </TabsTrigger>
                <TabsTrigger value="drafts">
                  Drafts ({dashboardStats.totalDrafts})
                </TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchPendingTimeEntries();
                  fetchDraftTimeEntries();
                }}
                disabled={loading}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <TabsContent value="submitted" className="space-y-6">

              {timeEntries.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                    <h3 className="text-lg font-semibold mb-2">All reviews complete!</h3>
                    <p className="text-muted-foreground">No time entries pending review at the moment.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {timeEntries.map((entry) => (
                    <Card key={entry.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl font-semibold">
                            {entry.employee_name}
                          </CardTitle>
                          <Badge variant="default" className="text-sm">
                            {entry.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(parseDateSafe(entry.entry_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{entry.hours} hours</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{entry.wbs_code}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Submitted {entry.submitted_at ? format(new Date(entry.submitted_at), 'MMM d') : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {entry.project_name && (
                          <div>
                            <h4 className="font-medium mb-1">Project</h4>
                            <p className="text-sm text-muted-foreground">{entry.project_name}</p>
                          </div>
                        )}

                        {entry.task_description && (
                          <div>
                            <h4 className="font-medium mb-1">Task</h4>
                            <p className="text-sm text-muted-foreground">{entry.task_description}</p>
                          </div>
                        )}

                        {entry.subtask_description && (
                          <div>
                            <h4 className="font-medium mb-1">Subtask</h4>
                            <p className="text-sm text-muted-foreground">{entry.subtask_description}</p>
                          </div>
                        )}

                        {entry.description && (
                          <div>
                            <h4 className="font-medium mb-1">Description</h4>
                            <p className="text-sm text-muted-foreground">{entry.description}</p>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium mb-2">Review Notes (Optional)</h4>
                          <Textarea
                            placeholder="Add notes for rejection or comments..."
                            value={reviewNotes[entry.id] || ''}
                            onChange={(e) => setReviewNotes(prev => ({
                              ...prev,
                              [entry.id]: e.target.value
                            }))}
                            className="mb-3"
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => handleReview(entry.id, 'rejected')}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleReview(entry.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="drafts" className="space-y-6">
              {draftEntries.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Edit className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                    <h3 className="text-lg font-semibold mb-2">No draft entries</h3>
                    <p className="text-muted-foreground">All employees have submitted their timesheets.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {draftEntries.map((entry) => (
                    <Card key={entry.id} className="hover:shadow-lg transition-shadow border-warning-light">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl font-semibold">
                            {entry.employee_name}
                          </CardTitle>
                          <Badge variant="secondary" className="text-sm bg-warning-light text-warning-foreground">
                            {entry.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(parseDateSafe(entry.entry_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{entry.hours} hours</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{entry.wbs_code}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Last updated {format(new Date(entry.updated_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>

                        {entry.project_name && (
                          <div>
                            <h4 className="font-medium mb-1">Project</h4>
                            <p className="text-sm text-muted-foreground">{entry.project_name}</p>
                          </div>
                        )}

                        {entry.task_description && (
                          <div>
                            <h4 className="font-medium mb-1">Task</h4>
                            <p className="text-sm text-muted-foreground">{entry.task_description}</p>
                          </div>
                        )}

                        {entry.subtask_description && (
                          <div>
                            <h4 className="font-medium mb-1">Subtask</h4>
                            <p className="text-sm text-muted-foreground">{entry.subtask_description}</p>
                          </div>
                        )}

                        {entry.description && (
                          <div>
                            <h4 className="font-medium mb-1">Description</h4>
                            <p className="text-sm text-muted-foreground">{entry.description}</p>
                          </div>
                        )}

                        <div className="bg-warning-light/50 p-3 rounded-md">
                          <p className="text-sm text-warning-foreground">
                            <AlertTriangle className="h-4 w-4 inline mr-2" />
                            This entry is still in draft status and has not been submitted for review.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}