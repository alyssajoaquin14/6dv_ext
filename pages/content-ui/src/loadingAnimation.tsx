import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

const LOTTIE_ANIMATION_PATH = chrome.runtime.getURL('content-ui/loading-animation.json');

interface LoadingAnimationProps {
  isLoading: boolean;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ isLoading }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if isLoading is true and containerRef is valid
    if (containerRef.current && isLoading) {
      // Load the Lottie animation
      const animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: LOTTIE_ANIMATION_PATH,
      });

      // Return the cleanup function
      return () => {
        animation.destroy(); // Cleanup Lottie animation
      };
    }

    // Explicitly return undefined when the cleanup is not needed
    return undefined;
  }, [isLoading]);

  if (!isLoading) {
    return null; // Don't render anything if not loading
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '150px',
        height: '150px',
        zIndex: 10000,
      }}
    />
  );
};

export default LoadingAnimation;
