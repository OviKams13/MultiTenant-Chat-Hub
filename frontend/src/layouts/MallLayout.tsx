import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/mall" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-semibold hidden sm:block">Multi-tenant Chatbots Hub</span>
          </Link>
          {onSearch && (
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search shops…"
                value={searchQuery}
                onChange={e => onSearch(e.target.value)}
              />
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="shrink-0">
            Log out
          </Button>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
};

export default MallLayout;
