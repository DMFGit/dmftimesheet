import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Shield, Clock, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SecurityAuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

export const SecurityAuditLog = () => {
  const { user, employee } = useAuth();
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Only show to admin users
  const isAdmin = employee?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    
    fetchAuditLogs();
  }, [isAdmin]);

  const fetchAuditLogs = async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching audit logs:', error);
        toast({
          title: "Error",
          description: "Failed to load security audit logs",
          variant: "destructive",
        });
        return;
      }

      setAuditLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'role_change':
        return 'destructive';
      case 'status_change':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'role_change':
        return <AlertTriangle className="h-4 w-4" />;
      case 'status_change':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (!isAdmin) {
    return null; // Don't render anything for non-admin users
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Audit Log
        </CardTitle>
        <CardDescription>
          Monitor sensitive operations and security events
        </CardDescription>
        <Button
          onClick={fetchAuditLogs}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading audit logs...</div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">No audit entries found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(entry.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getActionBadgeVariant(entry.action)}>
                        {entry.action.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        on {entry.table_name}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      {entry.old_values && (
                        <div>
                          <span className="font-medium">From: </span>
                          <code className="text-xs bg-muted px-1 rounded">
                            {JSON.stringify(entry.old_values)}
                          </code>
                        </div>
                      )}
                      {entry.new_values && (
                        <div>
                          <span className="font-medium">To: </span>
                          <code className="text-xs bg-muted px-1 rounded">
                            {JSON.stringify(entry.new_values)}
                          </code>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                      {entry.user_id && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          User: {entry.user_id.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};