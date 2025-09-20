import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Moon, 
  Sun, 
  Monitor, 
  Shield, 
  MapPin, 
  Info, 
  ExternalLink,
  Scale,
  Globe,
  Lock
} from "lucide-react";
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";

export default function Settings() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  };

  const getThemeIcon = (themeOption: Theme) => {
    switch (themeOption) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground text-lg">
            Customize your MyLegal experience and learn about our service
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Appearance Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Choose your preferred theme and display options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Theme</Label>
                <div className="space-y-3">
                  {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
                    <div key={themeOption} className="flex items-center gap-3">
                      <Button
                        variant={theme === themeOption ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleThemeChange(themeOption)}
                        className="w-20 justify-start"
                      >
                        {getThemeIcon(themeOption)}
                      </Button>
                      <Label className="capitalize cursor-pointer flex-1">
                        {themeOption === 'system' ? 'System Preference' : themeOption}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regional Information */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Regional Scope
              </CardTitle>
              <CardDescription>
                Information about our legal jurisdiction coverage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary-light rounded-lg">
                <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-primary mb-1">Malaysia Focus</h4>
                  <p className="text-sm text-primary/80">
                    This preview version focuses on Kuala Lumpur, Malaysia legal context and jurisdiction.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Primary Jurisdiction:</strong> Kuala Lumpur, Malaysia
                </p>
                <p>
                  <strong>Legal System:</strong> Malaysian Common Law System
                </p>
                <p>
                  <strong>Language:</strong> English and Bahasa Malaysia support
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Learn about how we protect your information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-success-light rounded-lg">
                  <Lock className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-success mb-1">Secure Processing</h4>
                    <p className="text-sm text-success/80">
                      All document processing happens on secure AWS infrastructure with enterprise-grade encryption.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>End-to-end encryption</span>
                    <span className="text-success">✓ Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data retention</span>
                    <span>Processing only</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Document storage</span>
                    <span>Not stored permanently</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Privacy Policy
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Terms of Service
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                About MyLegal
              </CardTitle>
              <CardDescription>
                Information about this AI legal assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <Scale className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">MyLegal AI Assistant</h3>
                  <p className="text-sm text-muted-foreground">Version 1.0.0 (Preview)</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What We Do</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    MyLegal helps Malaysian citizens understand legal documents through AI-powered analysis. 
                    We identify key clauses, assess potential risks, and provide plain-language explanations 
                    of complex legal terms.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Technology</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Built with AWS Amplify Gen 2, React, and advanced AI models to provide 
                    accurate and reliable legal document analysis.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Important Notice</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    This tool provides informational analysis only and does not constitute legal advice. 
                    For specific legal matters, please consult with qualified Malaysian legal professionals.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  © 2024 MyLegal. Built for the Malaysian Rakyat.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}