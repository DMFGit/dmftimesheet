import { Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  currentUser?: {
    name: string;
    role: string;
  };
}

export function Header({ currentUser }: HeaderProps) {
  return (
    <header className="bg-gradient-primary shadow-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">DMF Timesheet</h1>
              <p className="text-primary-light/80 text-sm">Civil Engineering Time Tracking</p>
            </div>
          </div>
          
          {currentUser && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white font-medium">{currentUser.name}</p>
                <p className="text-primary-light/80 text-sm capitalize">{currentUser.role}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}