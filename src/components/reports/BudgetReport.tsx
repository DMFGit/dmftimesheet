import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useAuth } from "@/hooks/useAuth";

interface BudgetAnalysis {
  subtaskId: string;
  subtaskNumber: string;
  subtaskDescription: string;
  wbsCode: string;
  budgetAmount: number;
  totalHours: number;
  totalCost: number;
  utilizationPercent: number;
  status: 'under-budget' | 'on-track' | 'over-budget';
}

export const BudgetReport = () => {
  const { timeEntries, subtasks, getSubtaskById } = useTimeEntries();
  const { employee } = useAuth();
  const [budgetAnalysis, setBudgetAnalysis] = useState<BudgetAnalysis[]>([]);
  
  // Get the hourly rate from the employee data
  const hourlyRate = employee?.["Default Billing Rate"] || 75; // Default rate if not set

  useEffect(() => {
    if (timeEntries.length === 0 || subtasks.length === 0) return;

    const analysis: BudgetAnalysis[] = [];

    subtasks.forEach(subtask => {
      const relatedEntries = timeEntries.filter(entry => 
        entry.subtask_id === subtask.id && entry.status === 'approved'
      );

      const totalHours = relatedEntries.reduce((sum, entry) => sum + entry.hours, 0);
      const totalCost = totalHours * hourlyRate;
      const utilizationPercent = subtask.budget > 0 ? (totalCost / subtask.budget) * 100 : 0;

      let status: 'under-budget' | 'on-track' | 'over-budget';
      if (utilizationPercent <= 75) {
        status = 'under-budget';
      } else if (utilizationPercent <= 90) {
        status = 'on-track';
      } else {
        status = 'over-budget';
      }

      analysis.push({
        subtaskId: subtask.id,
        subtaskNumber: subtask.number,
        subtaskDescription: subtask.description,
        wbsCode: subtask.wbs_code || '',
        budgetAmount: subtask.budget,
        totalHours,
        totalCost,
        utilizationPercent,
        status
      });
    });

    // Sort by utilization percentage (highest first)
    analysis.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
    setBudgetAnalysis(analysis);
  }, [timeEntries, subtasks, hourlyRate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under-budget':
        return 'text-success';
      case 'on-track':
        return 'text-warning';
      case 'over-budget':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent <= 75) return 'bg-success';
    if (percent <= 90) return 'bg-warning';
    return 'bg-destructive';
  };

  const totalBudget = budgetAnalysis.reduce((sum, item) => sum + item.budgetAmount, 0);
  const totalSpent = budgetAnalysis.reduce((sum, item) => sum + item.totalCost, 0);
  const overallUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">${totalSpent.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Overall Utilization</p>
              <p className={`text-2xl font-bold ${getStatusColor(overallUtilization <= 75 ? 'under-budget' : overallUtilization <= 90 ? 'on-track' : 'over-budget')}`}>
                {overallUtilization.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subtask Budget Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WBS Code</TableHead>
                <TableHead>Subtask</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetAnalysis.map((item) => (
                <TableRow key={item.subtaskId}>
                  <TableCell className="font-mono text-sm">
                    {item.wbsCode}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.subtaskNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.subtaskDescription}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    ${item.budgetAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.totalHours}h
                  </TableCell>
                  <TableCell className="text-right">
                    ${item.totalCost.toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right ${getStatusColor(item.status)}`}>
                    {item.utilizationPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <div className="w-full">
                      <Progress 
                        value={Math.min(item.utilizationPercent, 100)} 
                        className="h-2"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};