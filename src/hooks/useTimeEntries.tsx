import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface TimeEntry {
  id: string;
  employee_id: string;
  project_id: string;
  task_id: string;
  subtask_id: string | null;
  entry_date: string;
  hours: number;
  description: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  number: string;
  description: string | null;
  status: 'active' | 'inactive' | 'completed';
}

export interface Task {
  id: string;
  project_id: string;
  number: string;
  unit: string | null;
  description: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  number: string;
  description: string;
  wbs_code: string | null;
  budget: number;
  fee_structure: string | null;
}

export const useTimeEntries = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);
  const { employee } = useAuth();
  const { toast } = useToast();

  // Fetch all data
  useEffect(() => {
    if (employee) {
      fetchTimeEntries();
      fetchProjects();
      fetchTasks();
      fetchSubtasks();
    }
  }, [employee]);

  const fetchTimeEntries = async () => {
    if (!employee) return;

    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employee.id)
      .order('entry_date', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch time entries",
        variant: "destructive",
      });
      return;
    }

    setTimeEntries(data || []);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    setProjects(data || []);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('number');

    if (error) {
      console.error('Error fetching tasks:', error);
      return;
    }

    setTasks(data || []);
  };

  const fetchSubtasks = async () => {
    const { data, error } = await supabase
      .from('subtasks')
      .select('*')
      .order('number');

    if (error) {
      console.error('Error fetching subtasks:', error);
      return;
    }

    setSubtasks(data || []);
  };

  const addTimeEntry = async (entryData: {
    project_id: string;
    task_id: string;
    subtask_id?: string;
    entry_date: string;
    hours: number;
    description?: string;
  }) => {
    if (!employee) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employee.id,
        ...entryData,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save time entry",
        variant: "destructive",
      });
    } else {
      setTimeEntries(prev => [data, ...prev]);
      toast({
        title: "Time entry saved",
        description: `Added ${entryData.hours} hours to your timesheet.`,
      });
    }

    setLoading(false);
  };

  const submitTimesheet = async (date: string) => {
    if (!employee) return;

    setLoading(true);
    const { error } = await supabase
      .from('time_entries')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('employee_id', employee.id)
      .eq('entry_date', date)
      .eq('status', 'draft');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit timesheet",
        variant: "destructive",
      });
    } else {
      await fetchTimeEntries(); // Refresh data
      toast({
        title: "Timesheet submitted",
        description: `Your timesheet for ${new Date(date).toLocaleDateString()} has been submitted for review.`,
      });
    }

    setLoading(false);
  };

  const getProjectById = (id: string) => projects.find(p => p.id === id);
  const getTaskById = (id: string) => tasks.find(t => t.id === id);
  const getSubtaskById = (id: string) => subtasks.find(s => s.id === id);
  const getTasksByProject = (projectId: string) => tasks.filter(t => t.project_id === projectId);
  const getSubtasksByTask = (taskId: string) => subtasks.filter(s => s.task_id === taskId);

  return {
    timeEntries,
    projects,
    tasks,
    subtasks,
    loading,
    addTimeEntry,
    submitTimesheet,
    getProjectById,
    getTaskById,
    getSubtaskById,
    getTasksByProject,
    getSubtasksByTask,
    refreshData: fetchTimeEntries,
  };
};