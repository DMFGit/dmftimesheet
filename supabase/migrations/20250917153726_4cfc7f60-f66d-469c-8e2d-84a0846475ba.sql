-- Fix security issues with views by using SECURITY INVOKER
DROP VIEW IF EXISTS project_hierarchy;
DROP VIEW IF EXISTS task_hierarchy; 
DROP VIEW IF EXISTS budget_items;

CREATE OR REPLACE VIEW project_hierarchy 
WITH (security_invoker = true) AS
SELECT DISTINCT
  "Project_#" as project_number,
  "Project_Name" as project_name,
  "Contract" as contract
FROM "Project_Budgets"
ORDER BY "Project_#";

CREATE OR REPLACE VIEW task_hierarchy 
WITH (security_invoker = true) AS
SELECT DISTINCT
  "Project_#" as project_number,
  "Task_#" as task_number,
  "Task_Description" as task_description,
  "Task_Unit" as task_unit
FROM "Project_Budgets"
ORDER BY "Project_#", "Task_#";

CREATE OR REPLACE VIEW budget_items 
WITH (security_invoker = true) AS
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