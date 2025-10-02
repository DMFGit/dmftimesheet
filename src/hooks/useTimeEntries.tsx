import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { BudgetItem, ProjectHierarchy, TaskHierarchy } from '@/types/timesheet';

export interface TimeEntry {
  id: string;
  employee_id: string;
  wbs_code: string;
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

export const useTimeEntries = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [projects, setProjects] = useState<ProjectHierarchy[]>([]);
  const [tasks, setTasks] = useState<TaskHierarchy[]>([]);
  const [loading, setLoading] = useState(false);
  const { employee } = useAuth();
  const { toast } = useToast();

  // Fetch all data
  useEffect(() => {
    if (employee) {
      fetchTimeEntries();
      fetchBudgetData();
    }
  }, [employee]);

  const fetchTimeEntries = async () => {
    if (!employee) return;

    const { data, error } = await supabase
      .from('Time_Entries')
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

    setTimeEntries((data || []) as TimeEntry[]);
  };

  const fetchBudgetData = async () => {
    if (!employee) return;

    if (employee.role === 'admin') {
      // Admin: Use separate functions that include financial data
      const { data: budgetData, error: budgetError } = await supabase
        .rpc('get_budget_data_admin_only');

      if (budgetError) {
        console.error('Error fetching budget items:', budgetError);
        toast({
          title: "Error",
          description: "Failed to fetch project data",
          variant: "destructive",
        });
        return;
      }

      setBudgetItems(budgetData || []);

      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .rpc('get_project_data_admin_only');

      if (projectError) {
        console.error('Error fetching projects:', projectError);
        return;
      }

      setProjects(projectData || []);

      // Fetch task data
      const { data: taskData, error: taskError } = await supabase
        .rpc('get_task_data_admin_only');

      if (taskError) {
        console.error('Error fetching tasks:', taskError);
        return;
      }

      setTasks(taskData || []);
    } else {
      // Employee: Use single function that excludes financial data
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .rpc('get_project_hierarchy_employee');

      if (hierarchyError) {
        console.error('Error fetching project hierarchy:', hierarchyError);
        toast({
          title: "Error",
          description: "Failed to fetch project data",
          variant: "destructive",
        });
        return;
      }

      // Transform employee data to match BudgetItem type (add missing financial fields)
      const budgetItemsWithDefaults = (hierarchyData || []).map(item => ({
        ...item,
        budget_amount: 0, // Hidden from employees
        dmf_budget_amount: 0 // Hidden from employees
      }));

      setBudgetItems(budgetItemsWithDefaults);

      // Extract unique projects from hierarchy data
      const uniqueProjects = Array.from(
        new Map(
          (hierarchyData || []).map(item => [
            item.project_number,
            {
              project_number: item.project_number,
              project_name: item.project_name,
              contract: item.contract
            }
          ])
        ).values()
      );
      setProjects(uniqueProjects);

      // Extract unique tasks from hierarchy data
      const uniqueTasks = Array.from(
        new Map(
          (hierarchyData || []).map(item => [
            `${item.project_number}-${item.task_number}`,
            {
              project_number: item.project_number,
              task_number: item.task_number,
              task_description: item.task_description,
              task_unit: item.task_unit
            }
          ])
        ).values()
      );
      setTasks(uniqueTasks);
    }
  };

  const addTimeEntry = async (entryData: {
    wbs_code: string;
    entry_date: string;
    hours: number;
    description?: string;
  }) => {
    if (!employee) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('Time_Entries')
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
      setTimeEntries(prev => [data as TimeEntry, ...prev]);
      toast({
        title: "Time entry saved",
        description: `Added ${entryData.hours} hours to your timesheet.`,
      });
    }

    setLoading(false);
  };

  const updateTimeEntry = async (entryId: string, entryData: {
    wbs_code: string;
    entry_date: string;
    hours: number;
    description?: string;
  }) => {
    if (!employee) return;

    setLoading(true);
    
    // Find the existing entry to check its current status
    const existingEntry = timeEntries.find(entry => entry.id === entryId);
    
    // For rejected entries, reset status to draft and clear review data
    const updateData = existingEntry?.status === 'rejected' ? {
      ...entryData,
      status: 'draft',
      reviewed_at: null,
      reviewed_by: null,
      review_notes: null
    } : entryData;
    
    const { data, error } = await supabase
      .from('Time_Entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('employee_id', employee.id)
      .in('status', ['draft', 'rejected']) // Allow updating draft and rejected entries
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update time entry",
        variant: "destructive",
      });
    } else {
      setTimeEntries(prev => prev.map(entry => 
        entry.id === entryId ? data as TimeEntry : entry
      ));
      
      if (existingEntry?.status === 'rejected') {
        toast({
          title: "Entry Updated",
          description: "Rejected entry has been updated and reset to draft status.",
        });
      }
    }

    setLoading(false);
  };

  const deleteTimeEntry = async (entryId: string) => {
    if (!employee) return;

    setLoading(true);
    const { error } = await supabase
      .from('Time_Entries')
      .delete()
      .eq('id', entryId)
      .eq('employee_id', employee.id)
      .in('status', ['draft', 'rejected']); // Allow deleting draft and rejected entries

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete time entry",
        variant: "destructive",
      });
    } else {
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
    }

    setLoading(false);
  };

  const submitTimesheet = async (date: string) => {
    if (!employee) return;

    setLoading(true);
    const { error } = await supabase
      .from('Time_Entries')
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

  // Helper functions to work with the new structure
  const getBudgetItemByWbsCode = (wbsCode: string) => budgetItems.find(item => item.wbs_code === wbsCode);
  
  const getProjectByNumber = (projectNumber: number) => projects.find(p => p.project_number === projectNumber);
  
  // Get unique projects (deduplicated by project number)
  const getUniqueProjects = () => {
    const unique = new Map();
    projects.forEach(project => {
      if (!unique.has(project.project_number)) {
        unique.set(project.project_number, {
          project_number: project.project_number,
          project_name: project.project_name,
          contract: project.contract // Keep first contract found for reference
        });
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.project_number - b.project_number);
  };
  
  const getTasksByProject = (projectNumber: number) => 
    tasks.filter(t => t.project_number === projectNumber).sort((a, b) => a.task_number - b.task_number);
  
  const getBudgetItemsByProject = (projectNumber: number) => 
    budgetItems.filter(item => item.project_number === projectNumber);
  
  const getBudgetItemsByTask = (projectNumber: number, taskNumber: number) => 
    budgetItems.filter(item => item.project_number === projectNumber && item.task_number === taskNumber);

  // Legacy compatibility functions (for components that haven't been updated yet)
  const getProjectById = (id: string) => {
    const projectNumber = parseInt(id);
    const project = getProjectByNumber(projectNumber);
    return project ? {
      id: project.project_number.toString(),
      name: project.project_name,
      number: project.project_number.toString(),
    } : null;
  };

  const getTaskById = (id: string) => {
    const budgetItem = budgetItems.find(item => item.task_number.toString() === id);
    return budgetItem ? {
      id: budgetItem.task_number.toString(),
      number: budgetItem.task_number.toString(),
      description: budgetItem.task_description,
      unit: budgetItem.task_unit,
    } : null;
  };

  const getSubtaskById = (id: string) => {
    const budgetItem = budgetItems.find(item => 
      item.subtask_number != null && item.subtask_number.toString() === id
    );
    return budgetItem ? {
      id: budgetItem.subtask_number!.toString(),
      number: budgetItem.subtask_number!.toString(),
      description: budgetItem.subtask_description || '',
      wbs_code: budgetItem.wbs_code || '',
      budget: budgetItem.budget_amount || 0,
      fee_structure: budgetItem.fee_structure || '',
    } : null;
  };

  return {
    timeEntries,
    budgetItems,
    projects,
    tasks,
    loading,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    submitTimesheet,
    getBudgetItemByWbsCode,
    getProjectByNumber,
    getUniqueProjects,
    getTasksByProject,
    getBudgetItemsByProject,
    getBudgetItemsByTask,
    // Legacy compatibility
    getProjectById,
    getTaskById,
    getSubtaskById,
    getSubtasksByTask: (projectId: string, taskId: string) => {
      const projectNumber = parseInt(projectId);
      const taskNumber = parseInt(taskId);
      return budgetItems
        .filter(item => item.project_number === projectNumber && item.task_number === taskNumber && item.subtask_number != null)
        .map(item => ({
          id: item.subtask_number!.toString(),
          task_id: taskNumber.toString(),
          number: item.subtask_number!.toString(),
          description: item.subtask_description || '',
          wbs_code: item.wbs_code || '',
          budget: item.budget_amount || 0,
          fee_structure: item.fee_structure || '',
        }))
        .sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
    },
    refreshData: fetchTimeEntries,
  };
};