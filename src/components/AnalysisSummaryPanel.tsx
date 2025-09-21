import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Scale,
  Shield,
  AlertTriangle,
  BookOpen,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DocumentAnalysisResult } from "@/hooks/uploadedFileContext";

interface AnalysisSummaryPanelProps {
  analysisResult: DocumentAnalysisResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisSummaryPanel: React.FC<AnalysisSummaryPanelProps> = ({
  analysisResult,
  isOpen,
  onClose,
}) => {
  const [clausesExpanded, setClausesExpanded] = React.useState<boolean>(true);
  const [risksExpanded, setRisksExpanded] = React.useState<boolean>(true);

  // Initialize sections as expanded when modal opens
  React.useEffect(() => {
    if (isOpen && analysisResult) {
      setClausesExpanded(true);
      setRisksExpanded(true);
    }
  }, [isOpen, analysisResult]);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset'; // Restore scrolling
    };
  }, [isOpen, onClose]);

  const getRiskSeverityColor = (riskArea: string) => {
    const highRiskTerms = ['termination', 'liability', 'penalty', 'breach', 'dispute'];
    const mediumRiskTerms = ['payment', 'delivery', 'performance', 'intellectual', 'confidentiality'];
    
    const lowerRiskArea = riskArea.toLowerCase();
    
    if (highRiskTerms.some(term => lowerRiskArea.includes(term))) {
      return { color: 'text-red-600', bg: 'bg-red-50 border-red-200', severity: 'High' };
    } else if (mediumRiskTerms.some(term => lowerRiskArea.includes(term))) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', severity: 'Medium' };
    } else {
      return { color: 'text-green-600', bg: 'bg-green-50 border-green-200', severity: 'Low' };
    }
  };

  const toggleClausesSection = () => {
    setClausesExpanded(prev => !prev);
  };

  const toggleRisksSection = () => {
    setRisksExpanded(prev => !prev);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-card rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">📊 Analysis Summary</h2>
            <p className="text-muted-foreground">
              Review the key clauses and legal risks from your documents
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-destructive hover:text-destructive-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!analysisResult ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No analysis results available.</p>
            </div>
          ) : (
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  {analysisResult.document_title || "Combined Legal Document Analysis"}
                </CardTitle>
                {analysisResult.analyzed_files && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Analyzed Files:</strong> {analysisResult.analyzed_files.join(", ")}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Important Clauses Section */}
                <div>
                  <Button
                    variant="ghost"
                    onClick={toggleClausesSection}
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">Important Clauses</span>
                      <Badge variant="secondary" className="text-xs">
                        {analysisResult.important_clauses.length}
                      </Badge>
                    </div>
                    {clausesExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {clausesExpanded && (
                    <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {analysisResult.important_clauses.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No important clauses found in the document.
                        </div>
                      ) : (
                        analysisResult.important_clauses.map((clause, index) => (
                        <Card key={index} className="bg-blue-50 border-blue-200 text-sm">
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-blue-900 text-sm">
                                  {clause.clause_title}
                                </h4>
                                {clause.relevant_law && (
                                  <Badge variant="outline" className="text-xs">
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    Law
                                  </Badge>
                                )}
                              </div>
                              <div className="bg-white p-2 rounded border border-blue-200">
                                <p className="text-xs font-mono text-gray-700 leading-relaxed">
                                  "{clause.clause_text}"
                                </p>
                              </div>
                              <p className="text-xs text-blue-800">
                                <strong>Summary:</strong> {clause.summary}
                              </p>
                              {clause.relevant_law && (
                                <p className="text-xs text-blue-700">
                                  <strong>Relevant Law:</strong> {clause.relevant_law}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Legal Risks Section */}
                <div>
                  <Button
                    variant="ghost"
                    onClick={toggleRisksSection}
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">Legal Risks</span>
                      <Badge variant="secondary" className="text-xs">
                        {analysisResult.legal_risks.length}
                      </Badge>
                    </div>
                    {risksExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {risksExpanded && (
                    <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {analysisResult.legal_risks.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No legal risks identified in the document.
                        </div>
                      ) : (
                        analysisResult.legal_risks.map((risk, index) => {
                        const severityStyle = getRiskSeverityColor(risk.risk_area);
                        return (
                          <Card key={index} className={`${severityStyle.bg} border text-sm`}>
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className={`font-medium ${severityStyle.color} text-sm`}>
                                    {risk.risk_area}
                                  </h4>
                                  <Badge variant="outline" className={`text-xs ${severityStyle.color}`}>
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {severityStyle.severity}
                                  </Badge>
                                </div>
                                <p className="text-xs">
                                  <strong>Description:</strong> {risk.description}
                                </p>
                                <p className="text-xs">
                                  <strong>Consequence:</strong> {risk.potential_consequence}
                                </p>
                                <p className="text-xs">
                                  <strong>Related Clause:</strong> {risk.related_clause}
                                </p>
                                {risk.relevant_law && (
                                  <p className="text-xs">
                                    <strong>Relevant Law:</strong> {risk.relevant_law}
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Legal Disclaimer */}
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-xs">
                    <strong>Disclaimer:</strong> {analysisResult.notes}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button onClick={onClose} className="w-full" variant="outline">
            Close Summary
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisSummaryPanel;