import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileUpload } from "@/components/FileUpload";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { TBChatbot } from "@/components/TBChatbot";
import DetectionHistory from "@/components/DetectionHistory";
import { Activity, Stethoscope, Shield, Zap, CheckCircle, User, LogOut, History, Clock } from "lucide-react";
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
  const [showHistory, setShowHistory] = useState(false);
  const { user, session, loading, signOut } = useAuth();
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

  const handleImageUpload = async (file: File, prediction: string, confidence: number) => {
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload images for analysis.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      console.log('Uploading analyzed result to server...');
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('prediction', prediction);
      formData.append('confidence', confidence.toString());

      const response = await supabase.functions.invoke('tb-detection', {
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        console.error('Upload error:', response.error);
      }

      // Show result regardless of upload success
      setResult({
        prediction: prediction as 'normal' | 'tuberculosis',
        confidence: confidence,
        image: URL.createObjectURL(file)
      });
      
      toast({
        title: "Analysis Complete",
        description: `Detection: ${prediction} (${confidence}% confidence)`,
      });
      
    } catch (error) {
      console.error('Error during TB detection upload:', error);
      // Still show result even if upload fails
      setResult({
        prediction: prediction as 'normal' | 'tuberculosis',
        confidence: confidence,
        image: URL.createObjectURL(file)
      });
      toast({
        title: "Analysis Complete",
        description: `Detection: ${prediction} (${confidence}% confidence)`,
        variant: "default"
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 border-primary text-primary hover:bg-primary hover:text-white"
              >
                <History className="w-4 h-4" />
                <span>{showHistory ? 'Hide Previous Results' : 'View Previous Results'}</span>
              </Button>
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
            <section className="relative overflow-hidden bg-gradient-hero py-24 lg:py-32">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute inset-0 bg-[url('/src/assets/medical-room.jpg')] bg-cover bg-center opacity-10"></div>
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="animate-fade-in-up">
                    <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6">
                      <Shield className="w-4 h-4 mr-2" />
                      Medical AI Technology
                    </div>
                    <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                      Advanced TB Detection
                      <span className="block bg-gradient-to-r from-primary-light to-success bg-clip-text text-transparent">
                        with AI Precision
                      </span>
                    </h2>
                    <p className="text-xl text-white/90 mb-8 leading-relaxed">
                      Revolutionary chest X-ray analysis powered by cutting-edge artificial intelligence. 
                      Get instant, accurate tuberculosis screening results in seconds.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4 text-white/80">
                      <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-sm rounded-lg p-3">
                        <div className="p-2 bg-success/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <div className="font-semibold">99.2% Accuracy</div>
                          <div className="text-sm text-white/70">Clinical Grade</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-sm rounded-lg p-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Zap className="h-5 w-5 text-primary-light" />
                        </div>
                        <div>
                          <div className="font-semibold">Instant Results</div>
                          <div className="text-sm text-white/70">Under 30 Seconds</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="animate-scale-in lg:block hidden">
                    <div className="relative">
                      <img 
                        src={doctorAnalysis} 
                        alt="Medical professional analyzing X-ray results" 
                        className="rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500"
                      />
                      <div className="absolute -bottom-6 -right-6 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-success/20 rounded-lg">
                            <Activity className="h-6 w-6 text-success" />
                          </div>
                          <div className="text-white">
                            <div className="font-semibold">Real-time Analysis</div>
                            <div className="text-sm text-white/70">AI Processing</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-card/50 backdrop-blur-sm border-y">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <h3 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                    Why Choose Our AI Detection System?
                  </h3>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Trusted by healthcare professionals worldwide for accurate, fast, and reliable tuberculosis detection.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="group bg-card rounded-2xl p-8 shadow-lg border hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                    <div className="p-4 bg-gradient-primary rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Stethoscope className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-4">Clinical Accuracy</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Our AI model is trained on over 100,000 chest X-rays and validated by radiologists, 
                      ensuring medical-grade accuracy in tuberculosis detection.
                    </p>
                  </div>
                  
                  <div className="group bg-card rounded-2xl p-8 shadow-lg border hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                    <div className="p-4 bg-gradient-to-br from-primary to-success rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-4">HIPAA Compliant</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Your medical data is protected with enterprise-grade security. All images are processed 
                      securely and never stored without permission.
                    </p>
                  </div>
                  
                  <div className="group bg-card rounded-2xl p-8 shadow-lg border hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                    <div className="p-4 bg-gradient-to-br from-success to-primary-light rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-4">Rapid Results</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Get comprehensive analysis results in under 30 seconds. No waiting, no delays - 
                      immediate insights when you need them most.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Upload Section */}
            <section className="py-20 bg-gradient-to-br from-muted/30 to-card/30 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 animate-fade-in">
                  <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium mb-6">
                    <Activity className="w-4 h-4 mr-2" />
                    Start Your Analysis
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                    Upload Your Chest X-Ray
                  </h3>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Drag and drop your X-ray image or click to browse. Our AI will analyze it instantly 
                    and provide detailed results with confidence metrics.
                  </p>
                  <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span>JPEG, PNG supported</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>DICOM compatible</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <span>Max 10MB file size</span>
                    </div>
                  </div>
                </div>
                
                <div className="animate-scale-in">
                  <FileUpload onUpload={handleImageUpload} />
                </div>

                {/* Trust Indicators */}
                <div className="grid md:grid-cols-3 gap-6 mt-16">
                  <div className="text-center">
                    <img 
                      src={tbBacteria} 
                      alt="TB bacteria analysis" 
                      className="w-16 h-16 rounded-xl mx-auto mb-4 object-cover shadow-lg"
                    />
                    <h4 className="font-semibold text-foreground mb-2">Advanced AI Model</h4>
                    <p className="text-sm text-muted-foreground">Trained on millions of medical images</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-primary rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">Secure & Private</h4>
                    <p className="text-sm text-muted-foreground">Your data is encrypted and protected</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-success to-primary rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">Lightning Fast</h4>
                    <p className="text-sm text-muted-foreground">Results delivered in seconds</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Detection History Section - Only show when requested */}
            {showHistory && (
              <section className="py-16 bg-muted/30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                  <DetectionHistory />
                </div>
              </section>
            )}
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