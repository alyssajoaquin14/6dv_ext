import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Circle, Line } from 'react-konva';
import EmailInputAndGenerateButton from './emailInputAndGenerateButton';
import LoadingAnimation from './loadingAnimation';

interface OverlayProps {
  videoElement: HTMLVideoElement;
  onClose: () => void;
  userId: string;
  flow: string;
}

const Overlay: React.FC<OverlayProps> = ({ videoElement, onClose, userId, flow }) => {
  // Initialize dots with arbitrary starting coordinates
  const [dots, setDots] = useState<{ x: number; y: number }[]>([]);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [maskSrc, setMaskSrc] = useState<string | null>(null);
  const [showMask, setShowMask] = useState(false);
  const [nextStepText, setNextStepText] = useState('Drag the dots to position the line to capture the character');
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [posCoordPercent, setPosCoordPercent] = useState<number[][] | null>(null);
  const [positiveCoordinates, setPositiveCoordinates] = useState<number[][] | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const calculateOverlayStyle = () => {
    const videoRect = videoElement.getBoundingClientRect();
    return {
      position: 'absolute' as const,
      top: `${videoRect.top + window.scrollY}px`,
      left: `${videoRect.left + window.scrollX}px`,
      width: `${videoRect.width}px`,
      height: `${videoRect.height}px`,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      zIndex: 1000,
      pointerEvents: 'auto' as 'auto',
    };
  };

  const updateOverlayPosition = () => {
    if (overlayRef.current && videoElement) {
      const videoRect = videoElement.getBoundingClientRect();
      overlayRef.current.style.top = `${videoRect.top + window.scrollY}px`;
      overlayRef.current.style.left = `${videoRect.left + window.scrollX}px`;
      overlayRef.current.style.width = `${videoRect.width}px`;
      overlayRef.current.style.height = `${videoRect.height}px`;

      setStageSize({ width: videoRect.width, height: videoRect.height });
    }
  };

  useEffect(() => {
    // Update overlay position on mount
    updateOverlayPosition();

    // Update overlay position on resize or scroll
    const handleResizeOrScroll = () => {
      updateOverlayPosition();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [videoElement]);

  useEffect(() => {
    if (stageSize.width && stageSize.height) {
      // Updated initial dots for a smaller and less diagonal line
      const initialDots = [
        { x: (80 / stageSize.width) * 100, y: (80 / stageSize.height) * 100 }, // Closer to top-left
        { x: (stageSize.width / 3 / stageSize.width) * 100, y: (stageSize.height / 3 / stageSize.height) * 100 }, // Closer to center
        { x: (stageSize.width / 2 / stageSize.width) * 100, y: (stageSize.height / 2.5 / stageSize.height) * 100 }, // Slightly to the right and down
      ];
      setDots(initialDots);
    }
  }, [stageSize]);

  useEffect(() => {
    const messageListener = (request: any) => {
      if (request.type === 'mask_generated') {
        setIsLoading(false);
        const maskData = request.mask;
        if (maskData) {
          setMaskSrc(`data:image/png;base64,${maskData}`);
          setShowMask(true);
          setShowGenerateButton(false);
          setNextStepText('Is this mask correct?');
        }
      } else if (request.type === 'error_occurred') {
        setIsLoading(false);
        displayErrorMessage(request.message);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const displayErrorMessage = (message: string) => {
    setErrorMessage(message);
  };

  const handleGenerateMask = () => {
    setIsGenerating(true);
    setIsLoading(true);
    setNextStepText('Loading, this can take a few mins on cold start...');

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const b64Image = canvas.toDataURL('image/png');
    setCurrentFrame(b64Image);
    const img = new Image();
    img.src = b64Image;

    img.onload = function () {
      const actualImageWidth = img.naturalWidth;
      const actualImageHeight = img.naturalHeight;

      const coordsPercent = dots.map(pos => [pos.x / 100, pos.y / 100]);
      const coordinates = dots.map(pos => {
        const newX = Math.round((pos.x / 100) * actualImageWidth);
        const newY = Math.round((pos.y / 100) * actualImageHeight);
        return [newX, newY];
      });

      setPosCoordPercent(coordsPercent);
      setPositiveCoordinates(coordinates);

      chrome.runtime.sendMessage({
        type: 'get_mask_for_frame',
        b64Image,
        positive_coordinates: coordinates,
        positive_coords_percent: coordsPercent,
        user_id: userId,
      });
    };
  };

  const handleConfirmYes = () => {
    setNextStepText('');
    setShowMask(false);
    setShowEmailForm(true);
  };

  const handleConfirmNo = () => {
    setNextStepText('Drag the dots to the desired positions');
    setShowMask(false);
    const initialDots = [
      { x: (80 / stageSize.width) * 100, y: (80 / stageSize.height) * 100 }, // Closer to top-left
      { x: (stageSize.width / 3 / stageSize.width) * 100, y: (stageSize.height / 3 / stageSize.height) * 100 }, // Closer to center
      { x: (stageSize.width / 2 / stageSize.width) * 100, y: (stageSize.height / 2.5 / stageSize.height) * 100 }, // Slightly to the right and down
    ];

    // Set the dots state to reappear
    setDots(initialDots);
    setIsGenerating(false);
    // Ensure the generate button is shown again if needed
    setShowGenerateButton(true);
  };

  return (
    <div ref={overlayRef} style={calculateOverlayStyle()}>
      {/* Instructional Text */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: 'white',
          fontSize: '16px',
          zIndex: 10,
        }}>
        {nextStepText}
      </div>

      {/* Exit Button */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          zIndex: 10,
        }}
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}>
        X
      </div>

      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            zIndex: 1005,
            textAlign: 'center',
          }}>
          {errorMessage}
        </div>
      )}
      <LoadingAnimation isLoading={isLoading} />

      {/* Konva Stage and Layers */}
      {!isGenerating && (
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 9 }}>
          <Layer>
            {/* Line connecting the dots */}
            <Line
              points={dots.flatMap(dot => [(dot.x * stageSize.width) / 100, (dot.y * stageSize.height) / 100])}
              stroke="white"
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
            />

            {/* Draggable dots */}
            {dots.map((dot, index) => (
              <Circle
                key={index}
                x={(dot.x * stageSize.width) / 100}
                y={(dot.y * stageSize.height) / 100}
                radius={5}
                fill="blue"
                draggable
                onDragMove={e => {
                  // Update dot positions while maintaining their relative positions within the overlay
                  const newX = (e.target.x() / stageSize.width) * 100;
                  const newY = (e.target.y() / stageSize.height) * 100;

                  const newDots = [...dots];
                  newDots[index] = { x: newX, y: newY };
                  setDots(newDots);

                  // Optionally, ensure generate button is shown when all dots are positioned
                  setShowGenerateButton(newDots.length === 3);
                }}
                // Set cursor to indicate grabbing
                onMouseEnter={e => {
                  const stage = e.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = 'grab';
                  }
                }}
                onMouseLeave={e => {
                  const stage = e.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = 'default';
                  }
                }}
                onDragStart={e => {
                  const stage = e.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = 'grabbing';
                  }
                }}
                onDragEnd={e => {
                  const stage = e.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = 'grab';
                  }
                }}
              />
            ))}
          </Layer>
        </Stage>
      )}

      {/* Generate Button */}

      {showGenerateButton && (
        <button
          onClick={e => {
            e.stopPropagation();
            handleGenerateMask();
          }}
          disabled={isGenerating}
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            padding: '5px 20px',
            backgroundColor: isGenerating ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            zIndex: 10,
            fontSize: '20px',
          }}>
          {isGenerating ? 'Generating...' : 'Capture Character'}
        </button>
      )}
      {/* Display mask image */}
      {maskSrc && showMask && (
        <img
          src={maskSrc}
          alt="Generated Mask"
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: 'auto',
            pointerEvents: 'none',
          }}
        />
      )}

      {nextStepText === 'Is this mask correct?' && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: '10px',
            display: 'flex',
            gap: '10px',
            zIndex: 10,
          }}>
          <button
            onClick={e => {
              e.stopPropagation();
              handleConfirmYes();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: 'green',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
            }}>
            Yes
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              handleConfirmNo();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: 'red',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '20px',
            }}>
            No
          </button>
        </div>
      )}

      {showEmailForm && posCoordPercent && positiveCoordinates && currentFrame && (
        <EmailInputAndGenerateButton
          videoElement={videoElement}
          userId={userId}
          onClose={onClose}
          positiveCoordinates={positiveCoordinates}
          positiveCoordsPercent={posCoordPercent}
          flow={flow}
          currentFrame={currentFrame}
          maskSrc={maskSrc}
        />
      )}
    </div>
  );
};

export default Overlay;
