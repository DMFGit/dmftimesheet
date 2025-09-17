import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeEntry } from '@/types/timesheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TimeEntryWithEmployee extends TimeEntry {
  employee_name?: string;
  project_name?: string;
  task_description?: string;
  subtask_description?: string;
}

export default function AdminReview() {
  const { user, employee } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  // Check admin access
  const isAdmin = employee?.role === 'admin' || user?.email === 'dina@dmfengineering.com';

  useEffect(() => {
    if (isAdmin) {
      fetchPendingTimeEntries();
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

  const handleReview = async (entryId: string, status: 'approved' | 'rejected') => {
    try {
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

      toast({
        title: "Success",
        description: `Time entry ${status} successfully`,
      });

      // Remove from list
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
      
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
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Time Entry Review</h1>
        <p className="text-muted-foreground">
          Review and approve submitted time entries
        </p>
      </div>

      {timeEntries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No time entries pending review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {timeEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {entry.employee_name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {entry.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(entry.entry_date), 'MMM d, yyyy')}
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
    </div>
  );
}