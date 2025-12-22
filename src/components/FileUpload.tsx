import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileUploadProps {
  onUpload: (file: File, patientName: string) => void;
}

export const FileUpload = ({ onUpload }: FileUploadProps) => {
  const [error, setError] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setError("");
      setSelectedFile(file);
    }
  }, []);

  const onDropRejected = useCallback(() => {
    setError("Please upload a valid image file (JPG, PNG, or DICOM)");
  }, []);

  const handleSubmit = () => {
    if (!selectedFile) {
      setError("Please select an X-ray image");
      return;
    }
    if (!patientName.trim()) {
      setError("Please enter the patient's name");
      return;
    }
    setError("");
    onUpload(selectedFile, patientName.trim());
    setSelectedFile(null);
    setPatientName("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.dcm', '.dicom']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div className="max-w-2xl mx-auto">
      {/* Patient Name Input */}
      <Card className="p-6 mb-6 bg-card shadow-md border">
        <div className="space-y-2">
          <Label htmlFor="patientName" className="flex items-center gap-2 text-foreground font-medium">
            <User className="h-4 w-4" />
            Patient Name
          </Label>
          <Input
            id="patientName"
            type="text"
            placeholder="Enter patient's full name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            This name will be used to organize and identify the X-ray in your history
          </p>
        </div>
      </Card>

      {/* File Upload Area */}
      <Card className="p-8 bg-gradient-card shadow-upload border-2 border-dashed border-border transition-all duration-300 hover:border-primary/50">
        <div
          {...getRootProps()}
          className={`cursor-pointer text-center transition-all duration-300 ${
            isDragActive ? 'scale-105' : ''
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="mb-6">
            <div className="p-4 bg-gradient-primary rounded-full w-fit mx-auto mb-4">
              {isDragActive ? (
                <FileImage className="h-8 w-8 text-white animate-pulse" />
              ) : selectedFile ? (
                <FileImage className="h-8 w-8 text-white" />
              ) : (
                <Upload className="h-8 w-8 text-white" />
              )}
            </div>
            
            <h3 className="text-xl font-semibold mb-2">
              {isDragActive 
                ? "Drop your X-ray here" 
                : selectedFile 
                  ? `Selected: ${selectedFile.name}`
                  : "Upload Chest X-ray"
              }
            </h3>
            
            <p className="text-muted-foreground mb-4">
              {selectedFile 
                ? "Click again to select a different file"
                : "Drag and drop your chest X-ray image, or click to browse"
              }
            </p>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Supported formats: JPG, PNG, DICOM</p>
              <p>Maximum file size: 10MB</p>
            </div>
          </div>

          {!selectedFile && (
            <Button 
              variant="outline" 
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
            >
              <Upload className="mr-2 h-4 w-4" />
              Select X-ray Image
            </Button>
          )}
        </div>
      </Card>

      {/* Submit Button */}
      {selectedFile && (
        <div className="mt-6 flex justify-center">
          <Button 
            onClick={handleSubmit}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          >
            Analyze X-ray for {patientName || 'Patient'}
          </Button>
        </div>
      )}

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