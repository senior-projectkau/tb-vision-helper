import { CheckCircle, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DetectionResult } from "@/pages/Index";

interface ResultsDisplayProps {
  result: DetectionResult | null;
  isAnalyzing: boolean;
  onReset: () => void;
}

export const ResultsDisplay = ({ result, isAnalyzing, onReset }: ResultsDisplayProps) => {
  if (isAnalyzing) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 bg-gradient-card shadow-upload text-center">
          <div className="mb-6">
            <div className="p-4 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Analyzing X-ray...</h3>
            <p className="text-muted-foreground">
              Our AI model is processing your chest X-ray image
            </p>
          </div>
          
          <div className="space-y-3">
            <Progress value={33} className="w-full" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Preprocessing image...</p>
              <p>• Running AI analysis...</p>
              <p>• Calculating confidence scores...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!result) return null;

  const isPositive = result.prediction === 'tuberculosis';
  const confidenceColor = result.confidence >= 90 ? 'text-success' : 
                         result.confidence >= 70 ? 'text-warning' : 'text-destructive';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image Display */}
        <Card className="p-6 bg-gradient-card shadow-medical">
          <h3 className="text-lg font-semibold mb-4">Analyzed X-ray</h3>
          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
            <img 
              src={result.image} 
              alt="Uploaded chest X-ray" 
              className="w-full h-full object-cover"
            />
          </div>
        </Card>

        {/* Results */}
        <Card className="p-6 bg-gradient-card shadow-medical">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${
                isPositive ? 'bg-warning/10' : 'bg-success/10'
              }`}>
                {isPositive ? (
                  <AlertTriangle className="h-6 w-6 text-warning" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-success" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  {isPositive ? 'Tuberculosis Detected' : 'Normal Result'}
                </h3>
                <p className="text-muted-foreground">
                  AI Analysis Complete
                </p>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Confidence Score</span>
                <span className={`font-bold text-lg ${confidenceColor}`}>
                  {result.confidence}%
                </span>
              </div>
              
              <Progress 
                value={result.confidence} 
                className="w-full h-2"
              />
              
              <div className="text-sm text-muted-foreground">
                {result.confidence >= 90 && "Very high confidence"}
                {result.confidence >= 70 && result.confidence < 90 && "High confidence"}
                {result.confidence < 70 && "Moderate confidence - consider additional testing"}
              </div>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="bg-accent/20 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-accent-foreground mb-2">
              ⚕️ Medical Disclaimer
            </h4>
            <p className="text-sm text-accent-foreground">
              This AI analysis is for assistance only and should not replace professional medical diagnosis. 
              Please consult with a qualified healthcare professional for proper medical evaluation.
            </p>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="font-semibold">Recommendations</h4>
            {isPositive ? (
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Consult a pulmonologist immediately</li>
                <li>• Consider sputum testing for confirmation</li>
                <li>• Follow infection control measures</li>
                <li>• Inform close contacts for screening</li>
              </ul>
            ) : (
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Continue regular health checkups</li>
                <li>• Maintain good respiratory hygiene</li>
                <li>• Monitor for any respiratory symptoms</li>
                <li>• Consider annual TB screening if at risk</li>
              </ul>
            )}
          </div>

          <Button 
            onClick={onReset} 
            variant="outline" 
            className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Analyze Another X-ray
          </Button>
        </Card>
      </div>
    </div>
  );
};