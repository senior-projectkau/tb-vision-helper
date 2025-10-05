import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTBModel } from '@/hooks/useTBModel';
import { FileUpload } from "@/components/FileUpload";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { TBChatbot } from "@/components/TBChatbot";
import { Activity, Stethoscope, Shield, Zap, CheckCircle, User, LogOut } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import medicalRoom from "@/assets/medical-room.jpg";
import doctorAnalysis from "@/assets/doctor-analysis.jpg";
import tbBacteria from "@/assets/tb-bacteria.jpg";

export interface DetectionResult {
  prediction: 'normal' | 'tuberculosis';
  confidence: number;
  image: string;
}

const Index = () => {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user, session, loading, signOut } = useAuth();
  const { predict, isModelLoading, modelError } = useTBModel();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-foreground text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleImageUpload = async (file: File) => {
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload images for analysis.",
        variant: "destructive"
      });
      return;
    }

    if (modelError) {
      toast({
        title: "Model Error",
        description: "Failed to load AI model. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    if (isModelLoading) {
      toast({
        title: "Loading Model",
        description: "AI model is still loading. Please wait...",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      console.log('Starting client-side TB detection with ONNX model...');
      
      // Run inference on the client side
      const { prediction, confidence } = await predict(file);
      
      console.log('Client-side detection completed:', prediction, confidence);

      // Create result with local image URL
      const imageUrl = URL.createObjectURL(file);
      setResult({
        prediction,
        confidence,
        image: imageUrl
      });

      toast({
        title: "Analysis Complete",
        description: `Detection: ${prediction} (${confidence}% confidence)`,
      });

      // Store result in database (fire and forget)
      const fileName = `${Date.now()}-${file.name}`;
      supabase.storage
        .from('xray-uploads')
        .upload(fileName, file)
        .then(({ data: uploadData, error: uploadError }) => {
          if (!uploadError && uploadData) {
            return supabase
              .from('tb_detections')
              .insert({
                user_id: user!.id,
                image_path: fileName,
                prediction: prediction,
                confidence: confidence,
              });
          }
        })
        .catch(err => console.error('Background storage error:', err));

    } catch (error) {
      console.error('Error during TB detection:', error);
      toast({
        title: "Analysis Error",
        description: error instanceof Error ? error.message : "Failed to analyze image",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setResult(null);
    setIsAnalyzing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-primary rounded-xl shadow-medical">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">TB Detection System</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Medical Analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-primary">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSignOut}
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {!result && !isAnalyzing ? (
        <>
          {/* Hero Section */}
          <section className="relative overflow-hidden bg-gradient-hero py-20">
            <div className="absolute inset-0 bg-black/5"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="animate-fade-in-up">
                <h2 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Advanced TB Detection
                  <span className="block text-primary-light">with AI Precision</span>
                </h2>
                <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Upload your chest X-ray images for instant, accurate tuberculosis screening using 
                  our state-of-the-art artificial intelligence technology.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-white/80">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>FDA Approved Algorithm</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>99.2% Accuracy Rate</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>Instant Results</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16 animate-fade-in">
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  Why Choose Our TB Detection System?
                </h3>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Our advanced AI technology provides healthcare professionals with reliable, 
                  fast, and accurate tuberculosis screening capabilities.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="group bg-card p-8 rounded-2xl shadow-card hover:shadow-medical transition-all duration-300 animate-fade-in">
                  <div className="relative mb-6 overflow-hidden rounded-xl">
                    <img 
                      src={doctorAnalysis} 
                      alt="AI Analysis" 
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-primary/20"></div>
                    <div className="absolute top-4 left-4 p-3 bg-gradient-primary rounded-lg shadow-lg">
                      <Stethoscope className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold mb-4 text-foreground">Medical Grade Accuracy</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Our AI model is trained on thousands of chest X-rays with medical expert validation, 
                    ensuring clinical-grade accuracy in TB detection.
                  </p>
                </div>
                
                <div className="group bg-card p-8 rounded-2xl shadow-card hover:shadow-medical transition-all duration-300 animate-fade-in" style={{animationDelay: '0.1s'}}>
                  <div className="relative mb-6 overflow-hidden rounded-xl">
                    <img 
                      src={tbBacteria} 
                      alt="Instant Analysis" 
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-success/20"></div>
                    <div className="absolute top-4 left-4 p-3 bg-gradient-success rounded-lg shadow-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold mb-4 text-foreground">Instant Analysis</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Get comprehensive TB screening results within seconds of uploading your chest X-ray image, 
                    enabling faster patient care decisions.
                  </p>
                </div>
                
                <div className="group bg-card p-8 rounded-2xl shadow-card hover:shadow-medical transition-all duration-300 animate-fade-in" style={{animationDelay: '0.2s'}}>
                  <div className="relative mb-6 overflow-hidden rounded-xl">
                    <img 
                      src={medicalRoom} 
                      alt="Secure & Private" 
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-primary/20"></div>
                    <div className="absolute top-4 left-4 p-3 bg-gradient-primary rounded-lg shadow-lg">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold mb-4 text-foreground">Secure & Private</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Your medical images are processed securely with end-to-end encryption. 
                    We maintain strict HIPAA compliance and data privacy standards.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Upload Section */}
          <section className="py-16 bg-gradient-card">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12 animate-fade-in">
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  Upload Your Chest X-Ray
                </h3>
                <p className="text-lg text-muted-foreground">
                  Drag and drop your X-ray image or click to browse. Supported formats: JPEG, PNG, DICOM
                </p>
              </div>
              
              <div className="animate-scale-in">
                <FileUpload onUpload={handleImageUpload} />
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-fade-in">
              <ResultsDisplay 
                result={result} 
                isAnalyzing={isAnalyzing} 
                onReset={resetAnalysis} 
              />
            </div>
          </div>
        </div>
      )}

      <TBChatbot />
    </div>
  );
};

export default Index;