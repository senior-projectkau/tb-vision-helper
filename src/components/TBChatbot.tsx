import { useState } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const TB_RESPONSES: Record<string, string> = {
  'symptoms': 'Common TB symptoms include persistent cough (lasting 3+ weeks), chest pain, coughing up blood, weight loss, fever, night sweats, and fatigue. If you experience these symptoms, consult a healthcare professional.',
  'treatment': 'TB treatment typically involves a combination of antibiotics taken for 6-9 months. The most common drugs include isoniazid, rifampin, ethambutol, and pyrazinamide. Treatment must be completed as prescribed by a doctor.',
  'contagious': 'TB is contagious and spreads through airborne droplets when someone with active pulmonary TB coughs, sneezes, or speaks. However, it requires prolonged close contact for transmission.',
  'prevention': 'TB prevention includes: getting vaccinated with BCG (in some countries), avoiding close contact with active TB patients, maintaining good ventilation, covering mouth when coughing, and regular screening if at high risk.',
  'diagnosis': 'TB diagnosis involves chest X-rays, sputum tests, skin tests (TST), blood tests (IGRA), and sometimes CT scans or biopsies. Multiple tests may be needed for accurate diagnosis.',
  'types': 'There are two main types: Latent TB (inactive, not contagious) and Active TB (symptomatic, contagious). Active TB can affect lungs (pulmonary) or other body parts (extrapulmonary).'
};

export const TBChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your TB information assistant. I can help answer questions about tuberculosis symptoms, treatment, prevention, and more. What would you like to know?',
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const generateResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Check if the message is TB-related at all
    const tbKeywords = ['tb', 'tuberculosis', 'chest', 'lung', 'cough', 'x-ray', 'xray'];
    const isTbRelated = tbKeywords.some(keyword => message.includes(keyword));
    
    // If not TB-related, respond appropriately
    if (!isTbRelated) {
      return 'I\'m specifically designed to help with tuberculosis (TB) related questions. I can provide information about TB symptoms, treatment, prevention, diagnosis, and types. Is there something about TB you\'d like to know?';
    }
    
    // Enhanced keyword matching for TB-related questions
    if (message.includes('prevent') || message.includes('prevention') || 
        message.includes('how to avoid') || message.includes('stop getting')) {
      return TB_RESPONSES.prevention;
    }
    
    if (message.includes('symptom') || message.includes('sign') || 
        message.includes('how do i know') || message.includes('what are the')) {
      return TB_RESPONSES.symptoms;
    }
    
    if (message.includes('treat') || message.includes('cure') || 
        message.includes('medicine') || message.includes('drug') || message.includes('antibiotic')) {
      return TB_RESPONSES.treatment;
    }
    
    if (message.includes('contagious') || message.includes('spread') || 
        message.includes('catch') || message.includes('transmit')) {
      return TB_RESPONSES.contagious;
    }
    
    if (message.includes('diagnos') || message.includes('detect') || 
        message.includes('find out') || message.includes('how to know')) {
      return TB_RESPONSES.diagnosis;
    }
    
    if (message.includes('type') || message.includes('kind') || 
        message.includes('different') || message.includes('latent') || message.includes('active')) {
      return TB_RESPONSES.types;
    }
    
    // Check for specific question patterns
    if (message.includes('what') && (message.includes('tb') || message.includes('tuberculosis'))) {
      return 'Tuberculosis (TB) is an infectious disease caused by bacteria that primarily affects the lungs. It can be serious but is treatable with proper medical care.';
    }
    
    if (message.includes('test') || message.includes('screening') || message.includes('check')) {
      return 'TB testing includes chest X-rays, sputum tests, tuberculin skin tests, and blood tests. Regular screening is important for high-risk individuals.';
    }
    
    if (message.includes('vaccine') || message.includes('bcg') || message.includes('shot')) {
      return 'The BCG vaccine provides some protection against TB, especially in children. Its effectiveness varies by region and is not used in all countries.';
    }
    
    // Fallback for TB-related questions that don't match specific patterns
    return 'I can help with information about TB symptoms, treatment, prevention, diagnosis, and types. Could you be more specific about what aspect of tuberculosis you\'d like to know about?';
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    };

    const botResponse: Message = {
      id: (Date.now() + 1).toString(),
      text: generateResponse(inputValue),
      isBot: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, botResponse]);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-primary shadow-glow hover:scale-105 transition-all duration-300 z-50 animate-pulse-glow"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[500px] bg-card/95 backdrop-blur-md shadow-upload border-2 z-40 flex flex-col animate-scale-in">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-primary rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">TB Medical Assistant</h3>
                <p className="text-xs text-white/80">Ask me about tuberculosis</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.isBot ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {message.isBot && (
                    <div className="p-2 bg-gradient-primary rounded-full flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.isBot
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {message.text}
                  </div>
                  
                  {!message.isBot && (
                    <div className="p-2 bg-muted rounded-full flex-shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about TB symptoms, treatment..."
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                size="icon"
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};