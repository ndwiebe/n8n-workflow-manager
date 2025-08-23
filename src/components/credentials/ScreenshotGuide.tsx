/**
 * Screenshot Guide Component
 * Interactive screenshot walkthrough with annotations and highlights
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Zoom,
  Fade,
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ArrowForward as ArrowForwardIcon,
  TouchApp as TouchAppIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';

import {
  ScreenshotGuide as ScreenshotGuideType,
  ScreenshotAnnotation
} from '../../types/smartCredentials';

interface ScreenshotGuideProps {
  screenshot: ScreenshotGuideType;
  onAnnotationClick?: (annotation: ScreenshotAnnotation) => void;
  showFullscreenOption?: boolean;
  autoplayAnnotations?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export const ScreenshotGuide: React.FC<ScreenshotGuideProps> = ({
  screenshot,
  onAnnotationClick,
  showFullscreenOption = true,
  autoplayAnnotations = false,
  maxWidth = 800,
  maxHeight = 600
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [showAllAnnotations, setShowAllAnnotations] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [autoplayIndex, setAutoplayIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Auto-play annotations
  useEffect(() => {
    if (autoplayAnnotations && screenshot.annotations.length > 0) {
      const interval = setInterval(() => {
        setAutoplayIndex(prev => (prev + 1) % screenshot.annotations.length);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [autoplayAnnotations, screenshot.annotations.length]);

  // Update active annotation based on autoplay
  useEffect(() => {
    if (autoplayAnnotations && screenshot.annotations.length > 0) {
      setActiveAnnotation(screenshot.annotations[autoplayIndex]?.id || null);
    }
  }, [autoplayIndex, autoplayAnnotations, screenshot.annotations]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleAnnotationClick = (annotation: ScreenshotAnnotation) => {
    setActiveAnnotation(annotation.id === activeAnnotation ? null : annotation.id);
    if (onAnnotationClick) {
      onAnnotationClick(annotation);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const getAnnotationStyle = (annotation: ScreenshotAnnotation) => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${annotation.x}%`,
      top: `${annotation.y}%`,
      width: annotation.width ? `${annotation.width}%` : 'auto',
      height: annotation.height ? `${annotation.height}%` : 'auto',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      zIndex: annotation.id === activeAnnotation ? 10 : 5,
      transform: annotation.id === activeAnnotation ? 'scale(1.1)' : 'scale(1)',
    };

    switch (annotation.type) {
      case 'highlight':
        return {
          ...baseStyle,
          border: `3px ${annotation.style} ${annotation.color}`,
          backgroundColor: `${annotation.color}20`,
          borderRadius: '4px',
          minWidth: '20px',
          minHeight: '20px',
        };
      
      case 'arrow':
        return {
          ...baseStyle,
          width: '30px',
          height: '30px',
          color: annotation.color,
        };
      
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: annotation.color,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          maxWidth: '200px',
        };
      
      case 'click':
        return {
          ...baseStyle,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: `3px ${annotation.style} ${annotation.color}`,
          backgroundColor: `${annotation.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        };
      
      case 'type':
        return {
          ...baseStyle,
          border: `2px ${annotation.style} ${annotation.color}`,
          backgroundColor: `${annotation.color}10`,
          borderRadius: '4px',
          minWidth: '100px',
          minHeight: '30px',
        };
      
      default:
        return baseStyle;
    }
  };

  const renderAnnotation = (annotation: ScreenshotAnnotation) => {
    const style = getAnnotationStyle(annotation);
    const isActive = annotation.id === activeAnnotation;

    return (
      <Zoom in={showAllAnnotations} key={annotation.id}>
        <Box
          style={style}
          onClick={() => handleAnnotationClick(annotation)}
          onMouseEnter={() => !autoplayAnnotations && setActiveAnnotation(annotation.id)}
          onMouseLeave={() => !autoplayAnnotations && setActiveAnnotation(null)}
        >
          {annotation.type === 'arrow' && (
            <ArrowForwardIcon
              style={{
                color: annotation.color,
                transform: 'rotate(45deg)',
                fontSize: '24px',
              }}
            />
          )}
          
          {annotation.type === 'click' && (
            <TouchAppIcon
              style={{
                color: annotation.color,
                fontSize: '20px',
              }}
            />
          )}
          
          {annotation.type === 'type' && (
            <EditIcon
              style={{
                color: annotation.color,
                fontSize: '16px',
                position: 'absolute',
                top: '2px',
                right: '2px',
              }}
            />
          )}
          
          {annotation.type === 'text' && annotation.text && (
            <Typography variant="caption" style={{ color: 'white' }}>
              {annotation.text}
            </Typography>
          )}
          
          {/* Tooltip for active annotation */}
          {isActive && annotation.text && annotation.type !== 'text' && (
            <Tooltip
              title={annotation.text}
              open={true}
              placement="top"
              arrow
            >
              <Box />
            </Tooltip>
          )}
        </Box>
      </Zoom>
    );
  };

  const getImageSrc = () => {
    // Use mobile image if available and on mobile device
    if (isMobile && screenshot.mobileImageUrl) {
      return screenshot.mobileImageUrl;
    }
    return screenshot.imageUrl;
  };

  return (
    <>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 2,
          maxWidth: fullscreen ? '100%' : maxWidth,
          margin: fullscreen ? 0 : 'auto',
        }}
      >
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {screenshot.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {screenshot.description}
            </Typography>
          </Box>
          
          <Box display="flex" gap={1}>
            <Tooltip title="Zoom In">
              <IconButton
                size="small"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Zoom Out">
              <IconButton
                size="small"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={showAllAnnotations ? "Hide Annotations" : "Show Annotations"}>
              <IconButton
                size="small"
                onClick={() => setShowAllAnnotations(!showAllAnnotations)}
                color={showAllAnnotations ? "primary" : "default"}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            
            {showFullscreenOption && (
              <Tooltip title="Fullscreen">
                <IconButton
                  size="small"
                  onClick={() => setFullscreen(true)}
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Image Container */}
        <Box
          ref={containerRef}
          sx={{
            position: 'relative',
            overflow: 'auto',
            maxHeight: fullscreen ? '80vh' : maxHeight,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'grey.50',
          }}
        >
          {imageError ? (
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setImageError(false);
                    setImageLoaded(false);
                  }}
                >
                  Retry
                </Button>
              }
            >
              Failed to load screenshot. Please check your internet connection.
            </Alert>
          ) : (
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <img
                ref={imageRef}
                src={getImageSrc()}
                alt={screenshot.alternativeText}
                style={{
                  width: '100%',
                  height: 'auto',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.3s ease',
                  display: imageLoaded ? 'block' : 'none',
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              
              {/* Loading placeholder */}
              {!imageLoaded && !imageError && (
                <Box
                  sx={{
                    width: '100%',
                    height: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'grey.100',
                  }}
                >
                  <Typography color="text.secondary">
                    Loading screenshot...
                  </Typography>
                </Box>
              )}
              
              {/* Annotations Overlay */}
              {imageLoaded && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    pointerEvents: showAllAnnotations ? 'auto' : 'none',
                  }}
                >
                  {screenshot.annotations.map(renderAnnotation)}
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Active Annotation Details */}
        {activeAnnotation && (
          <Fade in={true}>
            <Alert
              severity="info"
              sx={{ mt: 2 }}
              icon={<HelpOutlineIcon />}
            >
              {(() => {
                const annotation = screenshot.annotations.find(a => a.id === activeAnnotation);
                return annotation?.text || 'Click here to continue';
              })()}
            </Alert>
          </Fade>
        )}

        {/* Legend */}
        {screenshot.annotations.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Annotations ({screenshot.annotations.length}):
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {screenshot.annotations.map((annotation, index) => (
                <Button
                  key={annotation.id}
                  size="small"
                  variant={annotation.id === activeAnnotation ? "contained" : "outlined"}
                  onClick={() => handleAnnotationClick(annotation)}
                  sx={{
                    borderColor: annotation.color,
                    color: annotation.id === activeAnnotation ? 'white' : annotation.color,
                    backgroundColor: annotation.id === activeAnnotation ? annotation.color : 'transparent',
                    '&:hover': {
                      backgroundColor: `${annotation.color}20`,
                    },
                  }}
                >
                  {index + 1}. {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)}
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Fullscreen Dialog */}
      <Dialog
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        maxWidth={false}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: 'black',
            color: 'white',
          },
        }}
      >
        <DialogContent sx={{ p: 1 }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={getImageSrc()}
              alt={screenshot.alternativeText}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
            
            {/* Fullscreen Annotations */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: showAllAnnotations ? 'auto' : 'none',
              }}
            >
              {screenshot.annotations.map(renderAnnotation)}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ position: 'absolute', top: 0, right: 0 }}>
          <IconButton
            onClick={() => setFullscreen(false)}
            sx={{ color: 'white' }}
          >
            <FullscreenExitIcon />
          </IconButton>
        </DialogActions>
      </Dialog>
    </>
  );
};