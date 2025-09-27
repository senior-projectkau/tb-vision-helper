import { useEffect } from 'react';

export const useCustomScript = () => {
  useEffect(() => {
    // ✅ Your JavaScript module code goes here instead of yourScript.js
    console.log('🚀 Custom JavaScript module loaded successfully!');
    
    // Example: Initialize any third-party libraries
    const initializeLibraries = () => {
      console.log('📚 Libraries initialized');
      // Add your library initialization code here
    };

    // Example: Global event listeners
    const handleGlobalClick = () => {
      console.log('🖱️ Global click detected');
    };

    // Example: Custom animations or effects
    const runAnimations = () => {
      console.log('✨ Custom animations running');
      // Add your animation code here
    };

    initializeLibraries();
    document.addEventListener('click', handleGlobalClick);
    runAnimations();

    // Cleanup when component unmounts
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      console.log('🧹 Custom script cleanup completed');
    };
  }, []);

  // ✅ Export any functions you want to use in React components
  const triggerCustomEvent = () => {
    console.log('🎯 Custom function triggered from React component!');
    // Add your custom functionality here
    const event = new CustomEvent('customAction', { 
      detail: { message: 'Hello from custom script!' } 
    });
    document.dispatchEvent(event);
  };

  const performCalculation = (a: number, b: number) => {
    console.log(`🔢 Calculating: ${a} + ${b} = ${a + b}`);
    return a + b;
  };

  return { 
    triggerCustomEvent, 
    performCalculation 
  };
};