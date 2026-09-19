import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Printer, Settings } from "lucide-react";

export function CustomerLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-secondary text-secondary-foreground border-b border-secondary-foreground/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:text-primary transition-colors">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Printer className="w-5 h-5" />
            </div>
            <span>JandC Print Shop</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Customer navigation">
            <Link 
              href="/track" 
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                location === "/track"
                  ? "bg-secondary-foreground/10 text-secondary-foreground"
                  : "text-secondary-foreground/75 hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
              }`}
            >
              Track Order
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-secondary-foreground/55 hover:bg-secondary-foreground/10 hover:text-secondary-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              Staff
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10">
        {children}
      </main>
      <footer className="border-t bg-card py-4 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4">
          JandC Print Shop · Mon–Sat, 8:00 AM–6:00 PM
        </div>
      </footer>
    </div>
  );
}
