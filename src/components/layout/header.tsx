import { Clock, User, Shield, FileCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import DMFLogo from "@/assets/DMF_Logo-02.svg";

export function Header() {
  const { user, employee, signOut } = useAuth();
  const location = useLocation();
  
  const isAdmin = employee?.role === 'admin' || user?.email === 'dina@dmfengineering.com';

  return (
    <header className="bg-gradient-primary shadow-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
              <img 
                src={DMFLogo} 
                alt="DMF Engineering" 
                className="h-10 w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Admin Review Link */}
            {isAdmin && (
              <Link to="/admin/review">
                <Button 
                  variant={location.pathname === '/admin/review' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-white hover:bg-white/20 border-white/20"
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Review
                </Button>
              </Link>
            )}

            {/* User Info */}
            {employee && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-white font-medium">{employee.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-primary-light/80 text-sm capitalize">{employee.role}</p>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}