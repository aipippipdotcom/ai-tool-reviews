import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, PenSquare, Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="AIPipPip" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-xl font-bold">
            <span className="text-gradient">AI</span><span className="text-foreground">PipPip</span><span className="text-red-500">.Net</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className="px-3 py-2 text-sm font-bold text-foreground hover:text-primary transition-colors rounded-md hover:bg-secondary"
          >
            Home
          </Link>
          <Link
            to="/categories"
            className="px-3 py-2 text-sm font-bold text-foreground hover:text-primary transition-colors rounded-md hover:bg-secondary"
          >
            Categories
          </Link>
          <Link
            to="/about"
            className="px-3 py-2 text-sm font-bold text-foreground hover:text-primary transition-colors rounded-md hover:bg-secondary"
          >
            About
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 glow">
                <PenSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Write</span>
              </Button>
            </Link>
          )}
          {user && (
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary">Home</Link>
          <Link to="/categories" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary">Categories</Link>
          <Link to="/about" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary">About</Link>
        </div>
      )}
    </header>
  );
};

export default Header;
