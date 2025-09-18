import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Shield, Lock, Users, Eye } from 'lucide-react';

export const SecurityStatus = () => {
  const { user, employee } = useAuth();
  
  // Only show to admin users
  const isAdmin = employee?.role === 'admin';

  if (!isAdmin) {
    return null;
  }

  const securityFeatures = [
    {
      name: "Role-Based Access Control",
      status: "implemented",
      description: "Users cannot modify their own roles or sensitive fields",
      icon: <Users className="h-4 w-4" />,
    },
    {
      name: "Security Audit Logging",
      status: "implemented", 
      description: "All role and status changes are logged for security monitoring",
      icon: <Eye className="h-4 w-4" />,
    },
    {
      name: "Enhanced Authentication",
      status: "implemented",
      description: "Email redirect configured for secure sign-up flow",
      icon: <Lock className="h-4 w-4" />,
    },
    {
      name: "Database Security",
      status: "implemented",
      description: "Row Level Security policies prevent unauthorized data access",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      name: "Leaked Password Protection",
      status: "warning",
      description: "Enable in Supabase Auth settings for additional password security",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "implemented":
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Manual Setup Required
        </Badge>;
      default:
        return <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Missing
        </Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Status Overview
          </CardTitle>
          <CardDescription>
            Current security implementations and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">{feature.name}</h4>
                    {getStatusBadge(feature.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Manual Action Required:</strong> To complete security setup, enable "Leaked Password Protection" 
          in your Supabase dashboard under Authentication → Settings → Security.
        </AlertDescription>
      </Alert>
    </div>
  );
};