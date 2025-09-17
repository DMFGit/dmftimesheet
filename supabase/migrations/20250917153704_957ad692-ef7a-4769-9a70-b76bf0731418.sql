-- Phase 1: Update Time_Entries table to use WBS Code instead of normalized IDs
ALTER TABLE "Time_Entries" ADD COLUMN wbs_code TEXT;

-- Since there are no existing time entries, we can directly make it NOT NULL
ALTER TABLE "Time_Entries" ALTER COLUMN wbs_code SET NOT NULL;

-- Drop the old foreign key columns
ALTER TABLE "Time_Entries" DROP COLUMN project_id;
ALTER TABLE "Time_Entries" DROP COLUMN task_id; 
ALTER TABLE "Time_Entries" DROP COLUMN subtask_id;

-- Add foreign key constraint to ensure wbs_code exists in Project_Budgets
ALTER TABLE "Time_Entries" ADD CONSTRAINT fk_time_entries_wbs_code 
FOREIGN KEY (wbs_code) REFERENCES "Project_Budgets"("WBS Code");

-- Create database view for hierarchical project structure from Project_Budgets
CREATE OR REPLACE VIEW project_hierarchy AS
SELECT DISTINCT
  "Project_#" as project_number,
  "Project_Name" as project_name,
  "Contract" as contract
FROM "Project_Budgets"
ORDER BY "Project_#";

CREATE OR REPLACE VIEW task_hierarchy AS
SELECT DISTINCT
  "Project_#" as project_number,
  "Task_#" as task_number,
  "Task_Description" as task_description,
  "Task_Unit" as task_unit
FROM "Project_Budgets"
ORDER BY "Project_#", "Task_#";

CREATE OR REPLACE VIEW budget_items AS
SELECT 
  "WBS Code" as wbs_code,
  "Project_#" as project_number,
  "Project_Name" as project_name,
  "Contract" as contract,
  "Task_#" as task_number,
  "Task_Description" as task_description,
  "Task_Unit" as task_unit,
  "Subtask_#" as subtask_number,
  "Subtask_Description" as subtask_description,
  "Fee_Structure" as fee_structure,
  CASE 
    WHEN "Budget" ~ '^\$[0-9,]+\.?[0-9]*$' THEN 
      CAST(REPLACE(REPLACE("Budget", '$', ''), ',', '') AS NUMERIC)
    ELSE 0 
  END as budget_amount,
  CASE 
    WHEN "DMF_Budget" ~ '^\$[0-9,]+\.?[0-9]*$' THEN 
      CAST(REPLACE(REPLACE("DMF_Budget", '$', ''), ',', '') AS NUMERIC)
    ELSE 0 
  END as dmf_budget_amount
FROM "Project_Budgets"
ORDER BY "Project_#", "Task_#", "Subtask_#";