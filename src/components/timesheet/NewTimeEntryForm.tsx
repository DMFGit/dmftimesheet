import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { Plus, Trash2, Clock, History } from "lucide-react";
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

export const NewTimeEntryForm = ({ onSubmit, selectedDate }: TimeEntryFormProps) => {
  const { 
    projects, 
    timeEntries,
    budgetItems,
    getTasksByProject, 
    getSubtasksByTask, 
    getUniqueProjects,
    loading 
  } = useTimeEntries();
  
  const [entryMode, setEntryMode] = useState<'manual' | 'recents'>('manual');
  const [entries, setEntries] = useState<FormEntry[]>([{
    projectId: '',
    taskId: '',
    subtaskId: '',
    hours: 0,
    description: ''
  }]);

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

  const loadRecentEntry = (recentEntry: RecentEntry) => {
    const newEntry: FormEntry = {
      projectId: recentEntry.projectId,
      taskId: recentEntry.taskId,
      subtaskId: recentEntry.subtaskId,
      hours: 0,
      description: ''
    };
    
    setEntries([newEntry]);
  };

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
        {/* Entry Mode Toggle */}
        <div className="flex items-center justify-center space-x-2 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={entryMode === 'manual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEntryMode('manual')}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Manual Entry
          </Button>
          <Button
            type="button"
            variant={entryMode === 'recents' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEntryMode('recents')}
            className="flex-1"
          >
            <History className="h-4 w-4 mr-2" />
            Recents
          </Button>
        </div>

        {/* Recents Mode */}
        {entryMode === 'recents' ? (
          <div className="space-y-4">
            {recentEntries.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Recent Time Entries</Label>
                  <div className="grid gap-2">
                    {recentEntries.map((recent, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
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

                {/* Show selected entry for hours and description */}
                {entries[0].projectId && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected Entry</Label>
                      <div className="text-sm">
                        <div className="font-medium">
                          {budgetItems.find(item => 
                            item.project_number?.toString() === entries[0].projectId &&
                            item.task_number?.toString() === entries[0].taskId &&
                            item.subtask_number?.toString() === entries[0].subtaskId
                          )?.project_name}
                        </div>
                        <p className="text-muted-foreground">
                          {budgetItems.find(item => 
                            item.project_number?.toString() === entries[0].projectId &&
                            item.task_number?.toString() === entries[0].taskId &&
                            item.subtask_number?.toString() === entries[0].subtaskId
                          )?.task_description}
                          {budgetItems.find(item => 
                            item.project_number?.toString() === entries[0].projectId &&
                            item.task_number?.toString() === entries[0].taskId &&
                            item.subtask_number?.toString() === entries[0].subtaskId
                          )?.subtask_description && 
                            ` • ${budgetItems.find(item => 
                              item.project_number?.toString() === entries[0].projectId &&
                              item.task_number?.toString() === entries[0].taskId &&
                              item.subtask_number?.toString() === entries[0].subtaskId
                            )?.subtask_description}`
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hours</Label>
                        <Select 
                          value={entries[0].hours.toString()} 
                          onValueChange={(value) => updateEntry(0, 'hours', parseFloat(value))}
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
                        value={entries[0].description}
                        onChange={(e) => updateEntry(0, 'description', e.target.value)}
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
          <>
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
                      value={entry.taskId} 
                      onValueChange={(value) => updateEntry(index, 'taskId', value)}
                      disabled={!entry.projectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
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
                      <SelectContent className="bg-popover z-50">
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
          </>
        )}

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