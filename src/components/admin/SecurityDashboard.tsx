import { SecurityStatus } from './SecurityStatus';
import { SecurityAuditLog } from './SecurityAuditLog';
import { useAuth } from '@/hooks/useAuth';

export const SecurityDashboard = () => {
  const { user, employee } = useAuth();
  
  // Only show to admin users
  const isAdmin = employee?.role === 'admin' || user?.email === 'dina@dmfengineering.com';

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Security Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor system security status and audit sensitive operations
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityStatus />
        <SecurityAuditLog />
      </div>
    </div>
  );
};