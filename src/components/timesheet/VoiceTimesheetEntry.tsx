import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mic, MicOff, Loader2, CheckCircle, X, Sparkles, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { BudgetItem } from "@/types/timesheet";

interface TimeSuggestion {
  wbs_code: string;
  hours: number;
  description: string;
  entry_date: string;
  project_name: string;
  task_description: string;
}

interface VoiceTimesheetEntryProps {
  budgetItems: BudgetItem[];
  onAddEntries: (entries: { wbs_code: string; entry_date: string; hours: number; description: string }[]) => Promise<void>;
}

export function VoiceTimesheetEntry({ budgetItems, onAddEntries }: VoiceTimesheetEntryProps) {
  const [open, setOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [suggestions, setSuggestions] = useState<TimeSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in this browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = transcript;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error !== "aborted") {
        toast({
          title: "Voice Error",
          description: `Speech recognition error: ${event.error}`,
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [transcript, toast]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const processTranscript = useCallback(async () => {
    if (!transcript.trim()) {
      toast({ title: "No text", description: "Please record or type what you did this week.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setSuggestions([]);

    try {
      // Build a simplified hierarchy for the AI
      const hierarchy = budgetItems.map((item) => ({
        wbs_code: item.wbs_code,
        project_number: item.project_number,
        project_name: item.project_name,
        task_number: item.task_number,
        task_description: item.task_description,
        subtask_number: item.subtask_number,
        subtask_description: item.subtask_description,
      }));

      const { data, error } = await supabase.functions.invoke("suggest-time-entries", {
        body: { transcript: transcript.trim(), projectHierarchy: hierarchy },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        return;
      }

      const items = data?.suggestions || [];
      setSuggestions(items);
      setSelectedSuggestions(new Set(items.map((_: any, i: number) => i)));
    } catch (err) {
      console.error("Error processing transcript:", err);
      toast({ title: "Error", description: "Failed to generate suggestions. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [transcript, budgetItems, toast]);

  const toggleSuggestion = useCallback((index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const addSelectedEntries = useCallback(async () => {
    const entries = suggestions
      .filter((_, i) => selectedSuggestions.has(i))
      .map((s) => ({
        wbs_code: s.wbs_code,
        entry_date: s.entry_date,
        hours: s.hours,
        description: s.description,
      }));

    if (entries.length === 0) {
      toast({ title: "None selected", description: "Select at least one suggestion to add.", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    try {
      await onAddEntries(entries);
      toast({ title: "Success", description: `Added ${entries.length} time entries.` });
      setOpen(false);
      setTranscript("");
      setSuggestions([]);
      setSelectedSuggestions(new Set());
    } catch (err) {
      console.error("Error adding entries:", err);
      toast({ title: "Error", description: "Failed to add some entries.", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  }, [suggestions, selectedSuggestions, onAddEntries, toast]);

  const totalSelectedHours = suggestions
    .filter((_, i) => selectedSuggestions.has(i))
    .reduce((sum, s) => sum + s.hours, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { stopListening(); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mic className="h-4 w-4" />
          Voice Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Voice Timesheet Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Record or type */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Tell us what you worked on this week. Mention projects, tasks, and how long things took.
            </p>
            <div className="flex gap-2">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={isListening ? stopListening : startListening}
                className="gap-2"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isListening ? "Stop Recording" : "Start Recording"}
              </Button>
              {isListening && (
                <Badge variant="outline" className="animate-pulse text-destructive border-destructive">
                  ● Listening...
                </Badge>
              )}
            </div>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder='e.g. "This week I spent about 3 hours on Monday doing design review for the highway project, then Tuesday and Wednesday I was mostly doing structural analysis, about 6 hours each day..."'
              className="min-h-[100px]"
            />
          </div>

          {/* Step 2: Process */}
          <Button
            onClick={processTranscript}
            disabled={!transcript.trim() || isProcessing}
            className="w-full gap-2"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isProcessing ? "Analyzing..." : "Generate Suggestions"}
          </Button>

          {/* Step 3: Review suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Suggested Time Entries</h3>
                <Badge variant="secondary">{totalSelectedHours}h selected</Badge>
              </div>

              {suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedSuggestions.has(index)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "opacity-60 hover:opacity-80"
                  }`}
                  onClick={() => toggleSuggestion(index)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {suggestion.entry_date}
                          </Badge>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {suggestion.hours}h
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mt-1 truncate">{suggestion.project_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{suggestion.task_description}</p>
                        <p className="text-xs mt-1">{suggestion.description}</p>
                      </div>
                      <div className="shrink-0">
                        {selectedSuggestions.has(index) ? (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                onClick={addSelectedEntries}
                disabled={selectedSuggestions.size === 0 || isAdding}
                className="w-full gap-2"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add {selectedSuggestions.size} Entries ({totalSelectedHours}h)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
