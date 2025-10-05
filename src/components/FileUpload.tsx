import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTBModel } from "@/hooks/useTBModel";
import { toast } from "sonner";

interface FileUploadProps {
  onUpload: (file: File, prediction: string, confidence: number) => void;
}

export const FileUpload = ({ onUpload }: FileUploadProps) => {
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { predict, isModelLoading, modelError } = useTBModel();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setError("");
      setIsProcessing(true);
      
      try {
        toast.loading("Running AI analysis on X-ray...");
        
        // Run client-side inference with the ONNX model
        const { prediction, confidence } = await predict(file);
        
        toast.dismiss();
        toast.success(`Analysis complete: ${prediction} (${confidence}% confidence)`);
        
        // Pass results to parent along with file
        onUpload(file, prediction, confidence);
      } catch (err) {
        console.error('Prediction error:', err);
        setError(err instanceof Error ? err.message : 'Failed to analyze image');
        toast.dismiss();
        toast.error("Failed to analyze X-ray image");
      } finally {
        setIsProcessing(false);
      }
    }
  }, [onUpload, predict]);

  const onDropRejected = useCallback(() => {
    setError("Please upload a valid image file (JPG, PNG, or DICOM)");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.dcm', '.dicom']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing || isModelLoading
  });

  if (modelError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load AI model: {modelError}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {isModelLoading && (
        <Alert className="mb-4">
          <AlertDescription>
            Loading TB detection AI model... Please wait.
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="p-8 bg-gradient-card shadow-upload border-2 border-dashed border-border transition-all duration-300 hover:border-primary/50">
        <div
          {...getRootProps()}
          className={`cursor-pointer text-center transition-all duration-300 ${
            isDragActive ? 'scale-105' : ''
          } ${(isProcessing || isModelLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="mb-6">
            <div className="p-4 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
              {isDragActive ? (
                <FileImage className="h-8 w-8 text-white animate-pulse" />
              ) : (
                <Upload className="h-8 w-8 text-white" />
              )}
            </div>
            
            <h3 className="text-xl font-semibold mb-2">
              {isProcessing ? "Analyzing X-ray..." : isDragActive ? "Drop your X-ray here" : "Upload Chest X-ray"}
            </h3>
            
            <p className="text-muted-foreground mb-4">
              {isProcessing 
                ? "Running AI model inference..." 
                : "Drag and drop your chest X-ray image, or click to browse"}
            </p>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Supported formats: JPG, PNG, DICOM</p>
              <p>Maximum file size: 10MB</p>
              <p className="text-xs text-primary">✓ AI analysis powered by your trained ONNX model</p>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
            disabled={isProcessing || isModelLoading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isProcessing ? "Analyzing..." : "Select X-ray Image"}
          </Button>
        </div>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p className="mb-2">⚕️ For medical professionals and research purposes only</p>
        <p>This tool is designed to assist healthcare professionals and should not replace professional medical diagnosis</p>
      </div>
    </div>
  );
};