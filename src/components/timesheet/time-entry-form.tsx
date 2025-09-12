import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CalendarIcon, Plus, Trash2 } from "lucide-react";
import { mockProjects, mockTasks, mockSubtasks } from "@/data/mockData";
import { Project, Task, Subtask, TimeEntry } from "@/types/timesheet";

interface TimeEntryFormProps {
  onSubmit: (entry: Omit<TimeEntry, 'id' | 'employeeId' | 'employeeName' | 'status'>) => void;
  selectedDate: string;
}

interface FormEntry {
  projectId: string;
  taskId: string;
  subtaskId: string;
  hours: number;
  description: string;
}

export function TimeEntryForm({ onSubmit, selectedDate }: TimeEntryFormProps) {
  const [entries, setEntries] = useState<FormEntry[]>([
    { projectId: '', taskId: '', subtaskId: '', hours: 0, description: '' }
  ]);

  const addNewEntry = () => {
    setEntries([...entries, { projectId: '', taskId: '', subtaskId: '', hours: 0, description: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof FormEntry, value: string | number) => {
    const updated = entries.map((entry, i) => {
      if (i === index) {
        const newEntry = { ...entry, [field]: value };
        // Reset dependent fields when parent changes
        if (field === 'projectId') {
          newEntry.taskId = '';
          newEntry.subtaskId = '';
        } else if (field === 'taskId') {
          newEntry.subtaskId = '';
        }
        return newEntry;
      }
      return entry;
    });
    setEntries(updated);
  };

  const getAvailableTasks = (projectId: string): Task[] => {
    return mockTasks.filter(task => task.projectId === projectId);
  };

  const getAvailableSubtasks = (taskId: string): Subtask[] => {
    return mockSubtasks.filter(subtask => subtask.taskId === taskId);
  };

  const handleSubmit = () => {
    const validEntries = entries.filter(entry => 
      entry.projectId && entry.taskId && entry.hours > 0
    );

    validEntries.forEach(entry => {
      onSubmit({
        date: selectedDate,
        projectId: entry.projectId,
        taskId: entry.taskId,
        subtaskId: entry.subtaskId || undefined,
        hours: entry.hours,
        description: entry.description
      });
    });

    // Reset form
    setEntries([{ projectId: '', taskId: '', subtaskId: '', hours: 0, description: '' }]);
  };

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const isValid = entries.some(entry => entry.projectId && entry.taskId && entry.hours > 0);

  return (
    <Card className="shadow-md">
      <CardHeader className="bg-gradient-subtle">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Time Entry for {new Date(selectedDate).toLocaleDateString()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {entries.map((entry, index) => (
          <div key={index} className="p-4 border border-border rounded-lg bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-card-foreground">Entry {index + 1}</h4>
              {entries.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEntry(index)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`project-${index}`}>Project</Label>
                <Select
                  value={entry.projectId}
                  onValueChange={(value) => updateEntry(index, 'projectId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    {mockProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.number} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`task-${index}`}>Task</Label>
                <Select
                  value={entry.taskId}
                  onValueChange={(value) => updateEntry(index, 'taskId', value)}
                  disabled={!entry.projectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    {getAvailableTasks(entry.projectId).map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.number} - {task.unit} - {task.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`subtask-${index}`}>Subtask (Optional)</Label>
                <Select
                  value={entry.subtaskId}
                  onValueChange={(value) => updateEntry(index, 'subtaskId', value)}
                  disabled={!entry.taskId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subtask" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    {getAvailableSubtasks(entry.taskId).map((subtask) => (
                      <SelectItem key={subtask.id} value={subtask.id}>
                        {subtask.number} - {subtask.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`hours-${index}`}>Hours</Label>
                <Select
                  value={entry.hours.toString()}
                  onValueChange={(value) => updateEntry(index, 'hours', parseFloat(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hours" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour} {hour === 1 ? 'hour' : 'hours'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`description-${index}`}>Description</Label>
              <Textarea
                id={`description-${index}`}
                placeholder="Describe the work performed..."
                value={entry.description}
                onChange={(e) => updateEntry(index, 'description', e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={addNewEntry}
            className="text-primary border-primary/20 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Entry
          </Button>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total: {totalHours} hours</p>
            <Button
              onClick={handleSubmit}
              disabled={!isValid}
              className="mt-2 bg-primary hover:bg-primary-hover"
            >
              Save Time Entries
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}