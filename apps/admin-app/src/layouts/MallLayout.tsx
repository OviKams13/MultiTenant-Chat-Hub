import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, LogOut, Search } from "lucide-react";

interface MallLayoutProps {
  children: ReactNode;
  searchQuery?: string;
  onSearch?: (q: string) => void;
}

const MallLayout = ({ children, searchQuery, onSearch }: MallLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/mall" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
              <Store className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-semibold hidden sm:block">MallBot</span>
          </Link>
          {onSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search shops…"
                value={searchQuery}
                onChange={e => onSearch(e.target.value)}
              />
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 shrink-0">
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
};

export default MallLayout;
