/**
 * Settings Panel (System Customization & Account Security)
 * Standard Operating Procedure Manual: Doc ID SOP-QMS-2026-001 (Section 5.1.5 & 8)
 * JANDC Internet Cafe and Services
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  ShieldCheck, 
  Palette, 
  QrCode, 
  Power, 
  Printer, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Check, 
  RefreshCw,
  Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettings } from "@/lib/admin-settings-state";
import { usePrinterHardware } from "@/lib/printer-hardware-state";

export function SettingsPanel() {
  const { toast } = useToast();
  const { settings, updateSettings } = useAdminSettings();
  const { printers } = usePrinterHardware();

  const [adminName, setAdminName] = useState(settings.adminName);
  const [adminRole, setAdminRole] = useState(settings.adminRole);
  const [qrKey, setQrKey] = useState(settings.adminQrKey);

  const handleSaveProfile = () => {
    updateSettings({ adminName, adminRole });
    toast({
      title: "Admin Profile Updated",
      description: "Staff credentials and operational roles saved.",
    });
  };

  const handleRegenerateQrKey = () => {
    const newKey = `JANDC-ADMIN-KEY-${Date.now().toString(36).toUpperCase()}-AUTH`;
    setQrKey(newKey);
    updateSettings({ adminQrKey: newKey });
    toast({
      title: "Limited Admin QR Key Regenerated",
      description: "New authorization token generated for terminal scanning.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Settings Panel · System Customization & Security
          </h1>
          <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
            SOP 5.1.5 & 8
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Interface personalization, administrator credential management, limited admin QR authentication, and operational status controls.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* SECTION 1: System Operational State & Daily Routine (SOP 8.2) */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-bold">QMS System Operational State</CardTitle>
            </div>
            <CardDescription className="text-xs">
              SOP Section 8.2: Toggle system state to OFFLINE / CLOSED during end-of-shift closing routine.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">
                  Current System State
                </span>
                <span
                  className={`text-lg font-black ${
                    settings.systemState === "ONLINE" ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {settings.systemState === "ONLINE" ? "ONLINE / OPEN" : "OFFLINE / CLOSED"}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {settings.systemState === "ONLINE"
                    ? "Accepting all incoming walk-in and scheduled orders."
                    : "Queue locked for batch post-closing production (SOP 8.2)."}
                </p>
              </div>

              <Button
                variant={settings.systemState === "ONLINE" ? "destructive" : "default"}
                size="sm"
                onClick={() =>
                  updateSettings({
                    systemState: settings.systemState === "ONLINE" ? "OFFLINE" : "ONLINE",
                  })
                }
                className="font-bold text-xs"
              >
                {settings.systemState === "ONLINE" ? "Switch to OFFLINE" : "Switch to ONLINE"}
              </Button>
            </div>

            {/* Audio notifications */}
            <div className="p-3 rounded-lg border bg-card flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground block">Real-Time Audio Chimes</span>
                <span className="text-[11px] text-muted-foreground">
                  Emits dual-tone synthesizer chime when new paid orders arrive (SOP 5.1.1).
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ audioAlertsEnabled: !settings.audioAlertsEnabled })}
                className="h-8 text-xs gap-1.5"
              >
                {settings.audioAlertsEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-primary" /> Enabled
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" /> Muted
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: UI Customization (SOP 5.1.5) */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-bold">UI Theme & Typography</CardTitle>
            </div>
            <CardDescription className="text-xs">
              SOP Section 5.1.5: Customize dashboard theme, font sizing, and visual contrast for counter staff ergonomics.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {/* Theme Selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">System Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "light", label: "Light Mode" },
                  { key: "dark", label: "Dark Mode" },
                  { key: "high-contrast", label: "High Contrast" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => updateSettings({ theme: t.key as any })}
                    className={`py-2 px-3 rounded-md border font-semibold text-xs transition-all ${
                      settings.theme === t.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Dashboard Font Size</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "compact", label: "Compact (14px)" },
                  { key: "default", label: "Standard (16px)" },
                  { key: "large", label: "Large (17px)" },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => updateSettings({ fontSize: s.key as any })}
                    className={`py-2 px-3 rounded-md border font-semibold text-xs transition-all ${
                      settings.fontSize === s.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Account & Limited Admin QR Key (SOP 5.1.5 & 5.2 Step 1) */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-bold">Admin Profile & Roles</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Manage terminal login credentials and operational roles for counter operators.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Staff / Manager Name</label>
              <Input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Operational Role</label>
              <select
                value={adminRole}
                onChange={(e) => setAdminRole(e.target.value as any)}
                className="w-full h-9 rounded-md border bg-background px-3 text-xs"
              >
                <option value="Store Manager">Store Manager (Nora Bobier)</option>
                <option value="Counter Staff">Counter Staff</option>
                <option value="System Administrator">System Administrator</option>
              </select>
            </div>

            <Button onClick={handleSaveProfile} size="sm" className="font-bold text-xs mt-1">
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

        {/* SECTION 4: Limited Admin QR Code Authentication Key */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-bold">Limited Admin QR Authentication Key</CardTitle>
            </div>
            <CardDescription className="text-xs">
              SOP Section 5.2 Step 1: Scan this QR key on authorized counter tablets for seamless login.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-foreground block">Active Terminal QR Token</span>
                <span className="font-mono text-[11px] text-muted-foreground break-all">
                  {qrKey}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateQrKey}
                className="h-8 text-xs shrink-0 gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Key
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary shrink-0" />
              <span>
                Counter staff scan this token upon shift opening (SOP 8.1 Opening Routine) to authenticate without typing passwords repeatedly.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: Printer Hardware Stations Overview */}
        <Card className="border shadow-xs md:col-span-2">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-bold">Connected Standard Printers Fleet</CardTitle>
            </div>
            <CardDescription className="text-xs">
              SOP Section 1.2: Standard document printers and authorized paper stock configurations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              {printers.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border bg-card space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-foreground">{p.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {p.ppm} PPM
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-[11px]">{p.model}</div>
                  <div className="text-foreground pt-1 border-t text-[11px]">
                    Supported Trays: <strong>{p.trays.join(", ")}</strong>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
