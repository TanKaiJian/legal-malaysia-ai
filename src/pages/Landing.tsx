import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileSearch, 
  MessageSquare, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  Users,
  Zap
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Document Analysis",
    description: "Upload legal documents and get instant AI-powered analysis of key clauses and terms."
  },
  {
    icon: AlertTriangle,
    title: "Risk Assessment", 
    description: "Identify potential legal risks and receive actionable recommendations to protect your interests."
  },
  {
    icon: MessageSquare,
    title: "AI Legal Chatbot",
    description: "Ask questions about legal documents in plain language and get clear, understandable answers."
  }
];

const steps = [
  {
    step: "01",
    title: "Upload Document",
    description: "Drop your legal document (PDF, DOCX, or text) into our secure analyzer."
  },
  {
    step: "02", 
    title: "AI Analysis",
    description: "Our advanced AI reviews the document and extracts key information automatically."
  },
  {
    step: "03",
    title: "Get Insights",
    description: "Receive plain-language summaries, risk assessments, and actionable recommendations."
  },
  {
    step: "04",
    title: "Take Action",
    description: "Use the insights to make informed decisions and protect your legal interests."
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-3xl"></div>
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light/20 rounded-full text-sm font-medium mb-8">
            <Shield className="w-4 h-4" />
            Trusted Legal AI for Malaysian Citizens
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            AI Legal Assistant
            <br />
            <span className="text-accent">for the Rakyat</span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            Simplify complex legal documents with AI. Get instant analysis, identify risks, 
            and understand your legal agreements in plain language.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* UPDATED: Match "Analyze Document" styling */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Link to="/chatbot">
                <MessageSquare className="w-5 h-5 mr-2" />
                Try AI Chatbot
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Link to="/analyzer">
                <FileSearch className="w-5 h-5 mr-2" />
                Analyze Document
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Legal AI Tools
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to understand and analyze legal documents with confidence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-card hover:shadow-elegant transition-all duration-300 border-0 bg-card-elevated">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Get legal insights in four simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose MyLegal?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Plain Language Explanations</h3>
                    <p className="text-muted-foreground">Complex legal jargon translated into clear, understandable language.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Malaysian Law Focus</h3>
                    <p className="text-muted-foreground">Specifically designed for Kuala Lumpur and Malaysian legal context.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Instant Analysis</h3>
                    <p className="text-muted-foreground">Get comprehensive document analysis in seconds, not hours.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
                    <p className="text-muted-foreground">Your documents are processed securely with enterprise-grade privacy.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-card">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Trusted by Malaysians</h3>
                <p className="text-muted-foreground">Join thousands who trust MyLegal for their legal document needs.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-success-light rounded-lg">
                  <span className="font-semibold">Documents Analyzed</span>
                  <span className="text-2xl font-bold text-success">50,000+</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary-light rounded-lg">
                  <span className="font-semibold">Active Users</span>
                  <span className="text-2xl font-bold text-primary">12,000+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Understand Your Legal Documents?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start analyzing your contracts, agreements, and legal documents today with AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="hero" size="lg" className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90">
              <Link to="/analyzer">
                <Zap className="w-5 h-5 mr-2" />
                Start Analysis
              </Link>
            </Button>
            {/* UPDATED: Match "Start Analysis" styling */}
            <Button
              asChild
              variant="hero"
              size="lg"
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90"
            >
              <Link to="/chatbot">
                <MessageSquare className="w-5 h-5 mr-2" />
                Chat with AI
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-card border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">MyLegal</span>
          </div>
          <p className="text-muted-foreground mb-4">
            AI Legal Assistant for Malaysian Citizens
          </p>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>© 2024 MyLegal. All rights reserved.</p>
            <p>Focused on Kuala Lumpur, Malaysia jurisdiction</p>
            <p className="font-semibold">Privacy-first • Secure • Reliable</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
