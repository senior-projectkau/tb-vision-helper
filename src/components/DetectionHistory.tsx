import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, Calendar, Eye, Download, User, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DetectionRecord {
  id: string;
  prediction: 'normal' | 'tuberculosis';
  confidence: number;
  image_path: string;
  created_at: string;
  patient_name: string | null;
}

interface PatientGroup {
  patientName: string;
  detections: DetectionRecord[];
}

export default function DetectionHistory() {
  const [detections, setDetections] = useState<DetectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchDetectionHistory();
    }
  }, [user]);

  const fetchDetectionHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tb_detections')
        .select('id, prediction, confidence, image_path, created_at, patient_name')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Type cast the prediction field to match our interface
      const typedDetections: DetectionRecord[] = (data || []).map(record => ({
        ...record,
        prediction: record.prediction as 'normal' | 'tuberculosis',
        patient_name: record.patient_name as string | null
      }));

      setDetections(typedDetections);
      
      // Auto-expand all patients on first load
      const patientNames = new Set(typedDetections.map(d => d.patient_name || 'Unknown Patient'));
      setExpandedPatients(patientNames);
    } catch (error) {
      console.error('Error fetching detection history:', error);
      toast({
        title: "Error",
        description: "Failed to load detection history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group detections by patient name
  const groupedDetections = useMemo(() => {
    const groups: Map<string, DetectionRecord[]> = new Map();
    
    detections.forEach(detection => {
      const patientName = detection.patient_name || 'Unknown Patient';
      if (!groups.has(patientName)) {
        groups.set(patientName, []);
      }
      groups.get(patientName)!.push(detection);
    });

    // Convert to array and sort by most recent detection date
    const patientGroups: PatientGroup[] = Array.from(groups.entries()).map(([patientName, dets]) => ({
      patientName,
      detections: dets
    }));

    // Sort groups by the most recent detection in each group
    patientGroups.sort((a, b) => {
      const aDate = new Date(a.detections[0].created_at).getTime();
      const bDate = new Date(b.detections[0].created_at).getTime();
      return bDate - aDate;
    });

    return patientGroups;
  }, [detections]);

  const togglePatient = (patientName: string) => {
    setExpandedPatients(prev => {
      const next = new Set(prev);
      if (next.has(patientName)) {
        next.delete(patientName);
      } else {
        next.add(patientName);
      }
      return next;
    });
  };

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from('xray-uploads')
      .getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadImage = async (imagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('xray-uploads')
        .download(imagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = imagePath;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Image downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Error",
        description: "Failed to download image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPatientStats = (dets: DetectionRecord[]) => {
    const tbCount = dets.filter(d => d.prediction === 'tuberculosis').length;
    const normalCount = dets.filter(d => d.prediction === 'normal').length;
    return { tbCount, normalCount, total: dets.length };
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Detection History</h2>
          <p className="text-muted-foreground">View your previous chest X-ray analysis results organized by patient</p>
        </div>
        <Button onClick={fetchDetectionHistory} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : detections.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-muted rounded-full">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">No Analysis History</h3>
                <p className="text-muted-foreground">Upload your first chest X-ray to get started</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedDetections.map((group) => {
            const stats = getPatientStats(group.detections);
            const isExpanded = expandedPatients.has(group.patientName);
            
            return (
              <Collapsible key={group.patientName} open={isExpanded}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader 
                      className="cursor-pointer hover:bg-muted/50 transition-colors pb-3"
                      onClick={() => togglePatient(group.patientName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="p-2 bg-primary/10 rounded-full">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold">{group.patientName}</CardTitle>
                            <CardDescription>
                              {stats.total} scan{stats.total !== 1 ? 's' : ''} • 
                              Last: {formatDate(group.detections[0].created_at)}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {stats.normalCount > 0 && (
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {stats.normalCount} Normal
                            </Badge>
                          )}
                          {stats.tbCount > 0 && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {stats.tbCount} TB Detected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {group.detections.map((detection) => (
                        <div 
                          key={detection.id} 
                          className="flex space-x-4 p-3 bg-muted/30 rounded-lg border"
                        >
                          <div className="relative">
                            <img 
                              src={getImageUrl(detection.image_path)}
                              alt="Chest X-ray" 
                              className="h-20 w-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedImage(getImageUrl(detection.image_path))}
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0"
                              onClick={() => downloadImage(detection.image_path)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(detection.created_at)}
                              </div>
                              <Badge 
                                variant={detection.prediction === 'normal' ? 'default' : 'destructive'}
                                className="flex items-center gap-1"
                              >
                                {detection.prediction === 'normal' ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                                <span className="capitalize">{detection.prediction}</span>
                              </Badge>
                            </div>
                            <CardDescription className="text-sm">
                              <strong>Confidence:</strong> {detection.confidence}%
                            </CardDescription>
                            <CardDescription className="text-sm">
                              {detection.prediction === 'normal' ? 
                                'No signs of tuberculosis detected' : 
                                'Potential tuberculosis indicators found'
                              }
                            </CardDescription>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img 
              src={selectedImage}
              alt="Chest X-ray - Full Size" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}