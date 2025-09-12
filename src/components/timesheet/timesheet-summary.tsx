import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TimeEntry } from "@/types/timesheet";
import { Clock, FileText, Send } from "lucide-react";
import { mockSubtasks, mockTasks, mockProjects } from "@/data/mockData";

interface TimesheetSummaryProps {
  entries: TimeEntry[];
  date: string;
  onSubmitForReview: () => void;
}

export function TimesheetSummary({ entries, date, onSubmitForReview }: TimesheetSummaryProps) {
  if (entries.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Daily Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No time entries for {new Date(date).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const hasUnsubmittedEntries = entries.some(entry => entry.status === 'draft');

  const getSubtaskInfo = (subtaskId?: string) => {
    if (!subtaskId) return null;
    return mockSubtasks.find(s => s.id === subtaskId);
  };

  const getTaskInfo = (taskId: string) => {
    return mockTasks.find(t => t.id === taskId);
  };

  const getProjectInfo = (projectId: string) => {
    return mockProjects.find(p => p.id === projectId);
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="bg-gradient-subtle">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Daily Summary - {new Date(date).toLocaleDateString()}
          </CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totalHours}h</p>
            <p className="text-sm text-muted-foreground">Total Hours</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {entries.map((entry) => {
          const project = getProjectInfo(entry.projectId);
          const task = getTaskInfo(entry.taskId);
          const subtask = getSubtaskInfo(entry.subtaskId);

          return (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={entry.status} />
                  <span className="font-medium text-primary">{entry.hours}h</span>
                </div>
                <h4 className="font-medium text-card-foreground">
                  {project?.name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {task?.unit} - {task?.description}
                  {subtask && ` → ${subtask.description}`}
                </p>
                {entry.description && (
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    "{entry.description}"
                  </p>
                )}
                {subtask && (
                  <p className="text-xs text-muted-foreground mt-1">
                    WBS: {subtask.wbsCode} | Budget: ${subtask.budget.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {hasUnsubmittedEntries && (
          <div className="pt-4 border-t border-border">
            <Button
              onClick={onSubmitForReview}
              className="w-full bg-primary hover:bg-primary-hover"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Timesheet for Review
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Once submitted, you won't be able to edit these entries
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}