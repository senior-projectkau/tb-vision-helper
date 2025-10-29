import jsPDF from 'jspdf';

interface ReportData {
  patientName: string;
  date: Date;
  prediction: 'normal' | 'tuberculosis';
  confidence: number;
  image: string;
}

export const generatePDFReport = (data: ReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header with logo/title area
  doc.setFillColor(66, 153, 225); // Blue color
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TB Detection Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('AI-Powered Medical Analysis', pageWidth / 2, 30, { align: 'center' });
  
  // Reset text color for body
  doc.setTextColor(0, 0, 0);
  let yPosition = 55;
  
  // Patient Information Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Patient Name: ${data.patientName}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Report Date: ${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString()}`, 20, yPosition);
  yPosition += 15;
  
  // Analysis Results Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Analysis Results', 20, yPosition);
  yPosition += 10;
  
  // Result box
  const isPositive = data.prediction === 'tuberculosis';
  const resultColor = isPositive ? [239, 68, 68] : [34, 197, 94]; // Red or Green
  doc.setFillColor(resultColor[0], resultColor[1], resultColor[2]);
  doc.setDrawColor(resultColor[0], resultColor[1], resultColor[2]);
  doc.roundedRect(20, yPosition - 5, pageWidth - 40, 20, 3, 3, 'D');
  
  doc.setTextColor(resultColor[0], resultColor[1], resultColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const resultText = isPositive ? 'TUBERCULOSIS DETECTED' : 'NORMAL RESULT';
  doc.text(resultText, pageWidth / 2, yPosition + 5, { align: 'center' });
  yPosition += 25;
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Confidence Score: ${data.confidence}%`, 20, yPosition);
  yPosition += 8;
  
  // Confidence level description
  let confidenceLevel = '';
  if (data.confidence >= 90) confidenceLevel = 'Very high confidence';
  else if (data.confidence >= 70) confidenceLevel = 'High confidence';
  else confidenceLevel = 'Moderate confidence - consider additional testing';
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(confidenceLevel, 20, yPosition);
  yPosition += 15;
  
  // Recommendations Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommendations', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  if (isPositive) {
    const recommendations = [
      '• Consult a pulmonologist immediately',
      '• Consider sputum testing for confirmation',
      '• Follow infection control measures',
      '• Inform close contacts for screening'
    ];
    recommendations.forEach(rec => {
      doc.text(rec, 25, yPosition);
      yPosition += 7;
    });
  } else {
    const recommendations = [
      '• Continue regular health checkups',
      '• Maintain good respiratory hygiene',
      '• Monitor for any respiratory symptoms',
      '• Consider annual TB screening if at risk'
    ];
    recommendations.forEach(rec => {
      doc.text(rec, 25, yPosition);
      yPosition += 7;
    });
  }
  
  yPosition += 10;
  
  // Medical Disclaimer
  doc.setFillColor(252, 211, 77); // Warning yellow
  doc.roundedRect(20, yPosition - 3, pageWidth - 40, 25, 2, 2, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('⚕️ Medical Disclaimer', 25, yPosition + 5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const disclaimer = 'This AI analysis is for assistance only and should not replace professional medical';
  const disclaimer2 = 'diagnosis. Please consult with a qualified healthcare professional for proper';
  const disclaimer3 = 'medical evaluation.';
  doc.text(disclaimer, 25, yPosition + 11);
  doc.text(disclaimer2, 25, yPosition + 16);
  doc.text(disclaimer3, 25, yPosition + 21);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('TB Detection System - AI-Powered Medical Analysis', pageWidth / 2, 285, { align: 'center' });
  doc.text(`Report generated on ${new Date().toLocaleString()}`, pageWidth / 2, 290, { align: 'center' });
  
  // Save the PDF
  const fileName = `TB_Report_${data.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
