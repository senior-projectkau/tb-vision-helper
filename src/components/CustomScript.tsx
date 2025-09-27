import { useEffect, useRef } from 'react';

const CustomScript = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ✅ This replaces your yourScript.js file content
    console.log('🎨 Custom DOM manipulation script loaded');
    
    if (containerRef.current) {
      // Example: Dynamic content creation
      const successMessage = document.createElement('div');
      successMessage.innerHTML = `
        <div class="flex items-center space-x-2 text-green-600 font-medium">
          <span>✅</span>
          <span>JavaScript Module Successfully Loaded!</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">
          Your custom JavaScript is now working in React
        </div>
      `;
      successMessage.className = 'p-4 bg-green-50 border border-green-200 rounded-lg';
      
      containerRef.current.appendChild(successMessage);
    }

    // Example: Advanced DOM operations
    const addInteractivity = () => {
      const elements = document.querySelectorAll('.interactive-element');
      elements.forEach(el => {
        el.addEventListener('mouseover', () => {
          console.log('🎯 Interactive element hovered');
        });
      });
    };

    // Example: Dynamic style injection
    const injectStyles = () => {
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        .custom-script-container {
          animation: fadeInUp 0.5s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(styleSheet);
    };

    addInteractivity();
    injectStyles();

    // Cleanup
    return () => {
      console.log('🧹 Custom DOM script cleanup');
    };
  }, []);

  return (
    <div ref={containerRef} className="custom-script-container p-4 interactive-element">
      {/* This container will be populated by your custom JavaScript */}
    </div>
  );
};

export default CustomScript;