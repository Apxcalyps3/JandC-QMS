import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Settings } from "lucide-react";
import { JNConnectLogo } from "@/components/ui/jnconnect-logo";

export function CustomerLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-secondary text-secondary-foreground border-b border-secondary-foreground/10 sticky top-0 z-10">
        <div className="h-1 bg-gradient-to-r from-primary via-sky-500 to-primary w-full" />
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-4 py-2.5 md:px-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-95 transition-opacity group">
            <div className="bg-white p-1 px-2 rounded-lg shadow-sm flex items-center justify-center border border-white/20 transition-transform group-hover:scale-105">
              <JNConnectLogo className="h-7 w-auto" />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight text-white font-black text-xl leading-tight">
                JNConnect
              </span>
              <span className="hidden sm:inline text-[11px] font-medium text-slate-300 leading-tight">
                A QMS for JandC Internet Cafe and Services
              </span>
            </div>
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
        <div className="max-w-6xl mx-auto px-4 space-y-1">
          <p className="font-medium text-foreground/80">JNConnect · Internet Cafe and Printing Services</p>
          <p>Mon–Sat, 8:00 AM–6:00 PM · Contact: 09169305712 · email: jandcnet87@gmail.com</p>
        </div>
      </footer>
    </div>
  );
}
