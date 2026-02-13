import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import type { TimeEntry as DBTimeEntry } from "@/hooks/useTimeEntries";

interface TimesheetSummaryProps {
  entries: DBTimeEntry[];
  date: string;
  onSubmitForReview: () => void;
}

export const NewTimesheetSummary = ({ entries, date, onSubmitForReview }: TimesheetSummaryProps) => {
  const { getBudgetItemByWbsCode } = useTimeEntries();

  if (entries.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Daily Summary - {new Date(date).toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No time entries recorded for this date.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const hasUnsubmittedEntries = entries.some(entry => entry.status === 'draft');

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Daily Summary - {new Date(date).toLocaleDateString()}</span>
          <span className="text-lg font-bold text-primary">{totalHours} hours</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => {
          const budgetItem = getBudgetItemByWbsCode(entry.wbs_code);

          return (
            <div key={entry.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
                  <h4 className="font-medium">
                    {budgetItem?.project_number} - {budgetItem?.project_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {budgetItem?.task_number} - {budgetItem?.task_description}
                    {budgetItem?.subtask_number != null && (
                      <span> → {budgetItem.subtask_number} - {budgetItem.subtask_description}</span>
                    )}
                  </p>
                  {budgetItem && (
                    <p className="text-xs text-muted-foreground/70 font-mono">
                      {budgetItem.wbs_code}
                    </p>
                  )}
                  {entry.description && (
                    <p className="text-sm text-foreground mt-2">
                      {entry.description}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div className="font-semibold">{entry.hours}h</div>
                  <StatusBadge status={entry.status} />
                </div>
              </div>
            </div>
          );
        })}

        {hasUnsubmittedEntries && (
          <div className="pt-4 border-t">
            <Button onClick={onSubmitForReview} className="w-full">
              Submit Timesheet for Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};