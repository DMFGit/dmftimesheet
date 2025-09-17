import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { Plus, Trash2 } from "lucide-react";
import { parseDateSafe } from "@/lib/utils";
import { format } from "date-fns";

interface TimeEntryFormProps {
  onSubmit: (entryData: {
    projectId: string;
    taskId: string;
    subtaskId?: string;
    hours: number;
    description: string;
  }) => void;
  selectedDate: string;
}

interface FormEntry {
  projectId: string;
  taskId: string;
  subtaskId?: string;
  hours: number;
  description: string;
}

export const NewTimeEntryForm = ({ onSubmit, selectedDate }: TimeEntryFormProps) => {
  const { 
    projects, 
    getTasksByProject, 
    getSubtasksByTask, 
    getUniqueProjects,
    loading 
  } = useTimeEntries();
  
  const [entries, setEntries] = useState<FormEntry[]>([{
    projectId: '',
    taskId: '',
    subtaskId: '',
    hours: 0,
    description: ''
  }]);

  const addNewEntry = () => {
    setEntries([...entries, {
      projectId: '',
      taskId: '',
      subtaskId: '',
      hours: 0,
      description: ''
    }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof FormEntry, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    
    // Reset dependent fields when parent changes
    if (field === 'projectId') {
      newEntries[index].taskId = '';
      newEntries[index].subtaskId = '';
    } else if (field === 'taskId') {
      newEntries[index].subtaskId = '';
    }
    
    setEntries(newEntries);
  };

  const handleSubmit = () => {
    const validEntries = entries.filter(entry => 
      entry.projectId && entry.taskId && entry.hours > 0
    );
    
    validEntries.forEach(entry => onSubmit(entry));
    
    // Reset form
    setEntries([{
      projectId: '',
      taskId: '',
      subtaskId: '',
      hours: 0,
      description: ''
    }]);
  };

  const getTotalHours = () => {
    return entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Time Entry for {format(parseDateSafe(selectedDate), 'MMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {entries.map((entry, index) => (
          <div key={index} className="space-y-4 p-4 border rounded-lg relative">
            {entries.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(index)}
                className="absolute top-2 right-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select 
                  value={entry.projectId} 
                  onValueChange={(value) => updateEntry(index, 'projectId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
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
                  value={entry.taskId} 
                  onValueChange={(value) => updateEntry(index, 'taskId', value)}
                  disabled={!entry.projectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTasksByProject(parseInt(entry.projectId)).map((task) => (
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
                  value={entry.subtaskId || ''} 
                  onValueChange={(value) => updateEntry(index, 'subtaskId', value)}
                  disabled={!entry.taskId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subtask" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSubtasksByTask(entry.taskId).map((subtask) => {
                      const parentTask = getTasksByProject(parseInt(entry.projectId)).find(t => t.task_number.toString() === entry.taskId);
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
                  value={entry.hours.toString()} 
                  onValueChange={(value) => updateEntry(index, 'hours', parseFloat(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hours" />
                  </SelectTrigger>
                  <SelectContent>
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
                value={entry.description}
                onChange={(e) => updateEntry(index, 'description', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ))}

        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={addNewEntry}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Entry
          </Button>
          
          <div className="text-lg font-semibold">
            Total: {getTotalHours()} hours
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={loading || entries.every(entry => !entry.projectId || !entry.taskId || entry.hours === 0)}
        >
          Save Time Entries
        </Button>
      </CardContent>
    </Card>
  );
};