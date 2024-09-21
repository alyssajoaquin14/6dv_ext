import '@src/SidePanel.css';
import React, { useEffect, useState } from 'react';

interface FrameData {
  frameData: string;
}

const SidePanel: React.FC = () => {
  const [frameCount, setFrameCount] = useState<number>(0);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [email, setEmail] = useState<string>('');
  const [isMaskLoading, setIsMaskLoading] = useState<boolean>(false);
  const [maskSrc, setMaskSrc] = useState<string>('');
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    const handleFrameData = (message: FrameData) => {
      if (message.frameData) {
        if (frames.length >= 10) return; // Limit to 10 frames
        setFrames(prevFrames => [...prevFrames, message.frameData]);
        setFrameCount(prevCount => prevCount + 1);
      }
    };

    chrome.runtime.onMessage.addListener(handleFrameData);

    return () => {
      chrome.runtime.onMessage.removeListener(handleFrameData);
    };
  }, [frames]);

  const handleGenerateMask = async () => {
    if (selectedFrameIndex === null || !selectedPoint) {
      alert('Please select a frame and point.');
      return;
    }

    setIsMaskLoading(true);

    chrome.runtime.sendMessage(
      {
        type: 'get_mask_for_frame',
        b64Image: frames[selectedFrameIndex],
        positive_coordinates: [[selectedPoint.x, selectedPoint.y]],
      },
      (response: { success: boolean; mask?: string }) => {
        setIsMaskLoading(false);
        if (response.success && response.mask) {
          setMaskSrc(`data:image/png;base64,${response.mask}`);
        } else {
          alert('Failed to generate mask.');
        }
      },
    );
  };

  const handleGenerate3DVideo = () => {
    if (!email) {
      alert('Please enter your email.');
      return;
    }

    chrome.runtime.sendMessage({
      type: 'generate_3d_video',
      frames,
      selectedFrame: selectedFrameIndex,
      selectedPoint: selectedPoint ? [selectedPoint.x, selectedPoint.y] : [],
      title: '3D Video',
      description: '3D Video Description',
      email,
    });
  };

  const handleVideoSelect = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: findVideoElement,
      });
    });
  };

  const findVideoElement = () => {
    const videoElement = document.querySelector('video') as HTMLVideoElement | null;
    if (!videoElement) {
      alert('No video element found.');
      return;
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    videoElement.addEventListener('play', () => {
      const captureInterval = setInterval(() => {
        if (videoElement.paused || videoElement.ended) {
          clearInterval(captureInterval);
          return;
        }
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/png');
        chrome.runtime.sendMessage({ type: 'frame_data', frameData });
      }, 1000 / 30);
    });
    return videoElement.id || 'No ID';
  };

  const handleFrameClick = (index: number) => {
    setSelectedFrameIndex(index);
    const selectedImage = document.querySelectorAll('.grabbed-frame')[index] as HTMLImageElement;

    selectedImage.addEventListener('click', event => {
      const rect = selectedImage.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setSelectedPoint({ x, y });
    });
  };

  return (
    <div className="side-panel">
      <h1>6DV Maker</h1>
      <button id="selectVideoButton">Connect to Video</button>

      <div id="imageCount" className={frames.length > 0 ? '' : 'hidden'}>
        <span>Play video to capture frames</span>
        <span id="frameCount">{frameCount}</span>
        <span>/10</span>
      </div>

      <div id="frameContainer">
        {frames.map((frame, index) => (
          <img
            key={index}
            src={frame}
            alt={`Frame ${index}`}
            className="grabbed-frame"
            style={{ width: '100px', height: 'auto', margin: '5px' }}
            onClick={() => handleFrameClick(index)}
          />
        ))}
      </div>

      {selectedFrameIndex !== null && (
        <div id="selected-image">
          <img src={frames[selectedFrameIndex]} alt="Selected" style={{ width: '100%' }} />
        </div>
      )}

      <div id="mask-generation-button-container" className={selectedFrameIndex !== null ? '' : 'hidden'}>
        <button onClick={handleGenerateMask}>Generate Mask</button>
      </div>

      {isMaskLoading && <p>Loading, this can take a few mins on cold start...</p>}

      {maskSrc && (
        <div id="selected-mask">
          <img src={maskSrc} alt="Mask" style={{ width: '100%' }} />
        </div>
      )}

      <input
        type="email"
        id="emailInput"
        placeholder="Enter your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <button id="generate3DVideoButton" onClick={handleGenerate3DVideo}>
        Generate 3D Video
      </button>
    </div>
  );
};

export default SidePanel;
