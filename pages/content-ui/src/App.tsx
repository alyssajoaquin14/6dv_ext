// src/pages/content/ContentScript.tsx
import React, { useEffect, useState } from 'react';
import Overlay from './overlay';
import TokenInputForm from './tokenInputForm';

const ContentScript: React.FC = () => {
  const [clickedElement, setClickedElement] = useState<HTMLElement | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [token, setToken] = useState('');
  const [flow, setFlow] = useState('model');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoRect, setVideoRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleUrlChange = (message: any) => {
      if (message.type === 'url_changed') {
        // Handle the URL change, e.g., reload the content script or stop certain actions
        window.location.reload(); // Reload the content script if needed
      }
    };

    chrome.runtime.onMessage.addListener(handleUrlChange);

    return () => {
      chrome.runtime.onMessage.removeListener(handleUrlChange);
    };
  }, []);
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'VIDEO') {
        setClickedElement(target);
      } else {
        setClickedElement(null);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  useEffect(() => {
    const messageListener = (request: any, sender: any, sendResponse: any) => {
      if (request.action === 'getClickedElement') {
        sendResponse({ element: clickedElement ? clickedElement.outerHTML : null });
      } else if (request.type === 'video_selected') {
        setFlow(request.flow);
        const video = document.querySelector(`video[src="${request.srcUrl}"]`) as HTMLVideoElement | null;
        if (video) {
          const rect = video.getBoundingClientRect();
          setVideoRect(rect);
        }
        chrome.runtime.sendMessage({ type: 'check_user' });

        chrome.runtime.onMessage.addListener(function listener(response, sender, sendResponse) {
          if (response.user === true) {
            if (!response.rolo) {
              setErrorMessage('No token found. Please enter your token.');
            } else if (response.credits > 0) {
              const video = document.querySelector(`video[src="${request.srcUrl}"]`) as HTMLVideoElement | null;
              setToken(response.rolo);
              if (video) {
                setVideoElement(video); // Set the specific video element
                setShowOverlay(true);
              } else {
                console.log('Video element not found');
              }
            } else if (response.credits === 0) {
              setErrorMessage('You do not have enough credits to perform this action. Please purchase more credits.');
            } else if (response.error === 'supabase_error') {
              setErrorMessage('An error occurred while fetching your credits. Please try again.');
            }
          } else if (response.user === false) {
            setShowTokenForm(true);
          }
        });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [clickedElement]);

  const handleReEnterToken = () => {
    chrome.runtime.sendMessage({ type: 'clear_token' }, () => {
      setShowTokenForm(true);
      setErrorMessage(null); // Clear the error message
    });
  };

  return (
    <>
      {!showOverlay && videoRect && (
        <div
          style={{
            position: 'fixed',
            top: videoRect.top,
            left: videoRect.left,
            width: videoRect.width,
            height: videoRect.height,
            zIndex: 999,
          }}>
          {showTokenForm && <TokenInputForm closeForm={() => setShowTokenForm(false)} />}
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#D3D3D3',
                color: '#7c3aed',
                padding: '15px',
                margin: '10px 0',
                borderRadius: '8px',
                border: '1px solid #8b5cf6', // purple border
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '18px',
                zIndex: 10000,
                position: 'absolute',
                top: '30%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80%',
                maxWidth: '400px',
                boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
              }}>
              {errorMessage}
              <button
                style={{
                  marginTop: '15px',
                  padding: '5px 10px',
                  backgroundColor: '#7c3aed', // vibrant purple button
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s',
                }}
                onClick={handleReEnterToken}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#6d28d9')} // darker purple on hover
                onMouseOut={e => (e.currentTarget.style.backgroundColor = '#7c3aed')}>
                Re-enter Access Token
              </button>
            </div>
          )}
        </div>
      )}
      {videoElement && showOverlay && (
        <Overlay videoElement={videoElement} onClose={() => setShowOverlay(false)} userId={token} flow={flow} />
      )}
    </>
  );
};

export default ContentScript;
