import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, projectHierarchy, localDate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a timesheet assistant. Given a transcript of someone describing their work week and a list of available projects/tasks/subtasks, suggest time entries.

AVAILABLE PROJECTS/TASKS (JSON):
${JSON.stringify(projectHierarchy)}

RULES:
- Match the described work to the most appropriate project/task/subtask from the hierarchy
- Each suggestion needs: wbs_code, hours, description, entry_date (YYYY-MM-DD format)
- Hours should be in 0.5 increments
- If the user mentions "today", use exactly this date: ${localDate || new Date().toISOString().split('T')[0]}
- If the user mentions specific days, use those. Otherwise distribute across the current work week (Mon-Fri)
- The current local date for the user is: ${localDate || new Date().toISOString().split('T')[0]}
- The description should be concise (1-2 sentences)
- Only suggest entries for work that matches available projects
- The work week starts on Monday`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here's what I did this week:\n\n${transcript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_time_entries",
              description: "Return suggested time entries based on the work description",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        wbs_code: { type: "string", description: "The WBS code from the project hierarchy" },
                        hours: { type: "number", description: "Hours worked (0.5 increments)" },
                        description: { type: "string", description: "Brief description of the work" },
                        entry_date: { type: "string", description: "Date in YYYY-MM-DD format" },
                        project_name: { type: "string", description: "Name of the project for display" },
                        task_description: { type: "string", description: "Task description for display" },
                      },
                      required: ["wbs_code", "hours", "description", "entry_date", "project_name", "task_description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_time_entries" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No suggestions generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-time-entries error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
