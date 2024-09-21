// src/pages/content/EmailInputAndGenerateButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import LoadingAnimation from './loadingAnimation';

interface EmailInputAndGenerateButtonProps {
  videoElement: HTMLVideoElement;
  userId: string;
  onClose: () => void;
  positiveCoordinates: number[][];
  positiveCoordsPercent: number[][];
  flow: string;
  currentFrame: string;
  maskSrc?: string | null;
}

const EmailInputAndGenerateButton: React.FC<EmailInputAndGenerateButtonProps> = ({
  videoElement,
  userId,
  onClose,
  positiveCoordinates,
  positiveCoordsPercent,
  flow,
  currentFrame,
  maskSrc,
}) => {
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [importantMessageVisible, setImportantMessageVisible] = useState(false);
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);
  const [inputAndButtonVisible, setInputAndButtonVisible] = useState(true);
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default behavior for space key
      if (event.key === ' ') {
        event.preventDefault();
      }
      // Stop propagation for all keys
      event.stopPropagation();
    };

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (inputElement) {
        inputElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, []);

  useEffect(() => {
    const handle3DVideoCreated = (response: any) => {
      if (response.type === '3d_video_created' && response.success) {
        setIsLoading(false);
        setSuccessMessageVisible(true);
        setUrl(response.voxelVideoUrl);
      }
    };

    chrome.runtime.onMessage.addListener(handle3DVideoCreated);

    return () => {
      chrome.runtime.onMessage.removeListener(handle3DVideoCreated);
    };
  }, []);

  const handleGenerate3DModel = () => {
    if (!maskSrc || !currentFrame) {
      alert('Mask or current frame is missing.');
      return;
    }

    setIsGenerating(true);
    setInputAndButtonVisible(false);

    chrome.runtime.sendMessage({
      type: 'generate_3d_model',
      title,
      user_id: userId,
      mask: maskSrc,
      frame: currentFrame,
    });

    setIsGenerating(false);
    onClose();
  };

  const handleGenerate3DVideo = () => {
    if (!title) {
      alert('Please enter a title.');
      return;
    }

    setIsGenerating(true);
    setInputAndButtonVisible(false);
    setImportantMessageVisible(true);
    videoElement.play();

    const captureFrameRate = 1; // Adjust as needed
    const frameCapture: string[] = [];
    let frameCount = 0;
    const frameInterval = 1000 / captureFrameRate;
    const totalDuration = 5000;

    frameCapture.push(currentFrame);

    const captureFrame = () => {
      if (frameCount >= totalDuration / frameInterval) {
        videoElement.pause();
        setImportantMessageVisible(false);
        setIsLoading(true);
        uploadFramesToServiceWorker(frameCapture, title, userId);
        return;
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/png');
        frameCapture.push(frameData);
      }

      frameCount++;
      setTimeout(captureFrame, frameInterval);
    };

    captureFrame();
  };

  const uploadFramesToServiceWorker = (frames: string[], title: string, userId: string) => {
    const frameIds: string[] = [];
    const description = 'placeholder';

    frames.forEach((frameData, index) => {
      chrome.runtime.sendMessage({
        type: 'upload_frame',
        frame: frameData,
        user_id: userId,
        frameIndex: index,
      });

      chrome.runtime.onMessage.addListener(function listener(response) {
        if (response.type === 'frame_uploaded' && response.frameIndex === index) {
          if (response.success) {
            frameIds.push(response.frame_id);
            if (frameIds.length === frames.length) {
              create3DVideoRequest(title, description, frameIds, userId);
            }
          } else {
            console.error(`Failed to upload frame ${index}`);
          }

          chrome.runtime.onMessage.removeListener(listener);
        }
      });
    });
  };

  const create3DVideoRequest = (title: string, description: string, frameIds: string[], userId: string) => {
    chrome.runtime.sendMessage({
      type: 'generate_3d_video',
      title,
      description,
      frames: frameIds,
      user_id: userId,
      positive_coordinates: positiveCoordinates,
      positive_coords_percent: positiveCoordsPercent,
      framerate: 1, // Adjust the frame rate as needed
    });

    setIsGenerating(false);
  };

  return (
    <div>
      {inputAndButtonVisible && !successMessageVisible && (
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter a title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              padding: '10px',
              width: '250px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              marginRight: '10px',
              fontSize: '16px',
            }}
            onKeyDown={e => {
              e.stopPropagation();
            }}
            onKeyUp={e => {
              e.stopPropagation();
            }}
            onKeyPress={e => {
              e.stopPropagation();
            }}
            onKeyDownCapture={e => {
              e.stopPropagation();
            }}
            onKeyUpCapture={e => {
              e.stopPropagation();
            }}
            onKeyPressCapture={e => {
              e.stopPropagation();
            }}
            autoFocus={true}
          />
          {flow === 'video' ? (
            <button
              onClick={handleGenerate3DVideo}
              disabled={isGenerating}
              style={{
                padding: '10px 20px',
                backgroundColor: isGenerating ? '#6c757d' : 'white',
                color: 'black',
                border: 'none',
                borderRadius: '3px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
              }}>
              {isGenerating ? 'Generating...' : 'Generate 3D Video'}
            </button>
          ) : (
            <button
              onClick={handleGenerate3DModel}
              disabled={isGenerating}
              style={{
                padding: '10px 20px',
                backgroundColor: isGenerating ? '#6c757d' : 'white',
                color: 'black',
                border: 'none',
                borderRadius: '3px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
              }}>
              {isGenerating ? 'Generating...' : 'Generate 3D Model'}
            </button>
          )}
        </div>
      )}

      {importantMessageVisible && flow === 'video' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1003,
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
          }}>
          <div
            style={{
              fontSize: '24px',
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              padding: '20px',
              borderRadius: '10px',
            }}>
            Important! Please don't close your browser or press pause/play. We are capturing frames for your video.
          </div>
        </div>
      )}

      <LoadingAnimation isLoading={isLoading} />
      {/* Display success message centered in the overlay */}
      {successMessageVisible && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1004,
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
          }}>
          <div
            style={{
              fontSize: '24px',
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              padding: '20px',
              borderRadius: '10px',
            }}>
            You can view your voxel video at{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#4CAF50' }}>
              {url}
            </a>
            . You will receive an email when it's finished!
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailInputAndGenerateButton;
