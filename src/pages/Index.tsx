import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { TBChatbot } from "@/components/TBChatbot";
import { Stethoscope, Shield, Brain } from "lucide-react";

export interface DetectionResult {
  prediction: 'normal' | 'tuberculosis';
  confidence: number;
  image: string;
}

const Index = () => {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageUpload = async (file: File) => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock result - in real implementation, this would call your backend
    const mockResult: DetectionResult = {
      prediction: Math.random() > 0.5 ? 'tuberculosis' : 'normal',
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
      image: URL.createObjectURL(file)
    };
    
    setResult(mockResult);
    setIsAnalyzing(false);
  };

  const resetAnalysis = () => {
    setResult(null);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-card">
      {/* Header */}
      <header className="border-b bg-card shadow-medical">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">TB Detection System</h1>
              <p className="text-muted-foreground">AI-powered tuberculosis detection from chest X-rays</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!result && !isAnalyzing && (
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Advanced TB Detection
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Upload a chest X-ray image and get instant AI-powered analysis to detect tuberculosis with high accuracy
              </p>
              
              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                <div className="p-6 bg-card rounded-xl shadow-medical">
                  <div className="p-3 bg-gradient-primary rounded-lg w-fit mx-auto mb-4">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">AI-Powered Analysis</h3>
                  <p className="text-sm text-muted-foreground">Advanced deep learning model trained on thousands of X-ray images</p>
                </div>
                
                <div className="p-6 bg-card rounded-xl shadow-medical">
                  <div className="p-3 bg-gradient-success rounded-lg w-fit mx-auto mb-4">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">High Accuracy</h3>
                  <p className="text-sm text-muted-foreground">Confidence scores and detailed analysis for medical professionals</p>
                </div>
                
                <div className="p-6 bg-card rounded-xl shadow-medical">
                  <div className="p-3 bg-gradient-primary rounded-lg w-fit mx-auto mb-4">
                    <Stethoscope className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">Medical Grade</h3>
                  <p className="text-sm text-muted-foreground">Designed to assist healthcare professionals in diagnosis</p>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <FileUpload onUpload={handleImageUpload} />
          </div>
        )}

        {(isAnalyzing || result) && (
          <ResultsDisplay 
            result={result} 
            isAnalyzing={isAnalyzing} 
            onReset={resetAnalysis} 
          />
        )}
      </main>

      {/* Chatbot */}
      <TBChatbot />
    </div>
  );
};

export default Index;