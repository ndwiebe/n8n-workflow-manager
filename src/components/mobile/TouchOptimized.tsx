import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  IconButton,
  Card,
  CardContent,
  Box,
  Typography,
  Fab,
  Switch,
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  styled,
  ButtonProps,
  CardProps,
  alpha
} from '@mui/material';
import {
  TouchApp,
  SwipeLeft,
  SwipeRight,
  PanTool
} from '@mui/icons-material';

// Touch-optimized button with larger touch targets
const TouchButton = styled(Button)<ButtonProps>(({ theme }) => ({
  minHeight: 48, // WCAG AAA minimum touch target
  minWidth: 48,
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: 12,
  textTransform: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease-in-out',
  '&:active': {
    transform: 'scale(0.98)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
  },
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  // Larger padding for better touch experience
  padding: theme.spacing(1.5, 3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2, 4),
    fontSize: '1.1rem',
  }
}));

// Touch-optimized icon button
const TouchIconButton = styled(IconButton)(({ theme }) => ({
  minHeight: 48,
  minWidth: 48,
  borderRadius: 12,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: 'all 0.2s ease-in-out',
  '&:active': {
    transform: 'scale(0.95)',
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.15),
    transform: 'translateY(-1px)',
  }
}));

// Swipeable card component
interface SwipeableCardProps extends CardProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

const SwipeableCard = styled(Card)<SwipeableCardProps>(({ theme }) => ({
  position: 'relative',
  overflow: 'visible',
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'grab',
  '&:active': {
    cursor: 'grabbing',
  },
  '&:hover': {
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    transform: 'translateY(-2px)',
  }
}));

// Touch-optimized switch with larger touch area
const TouchSwitch = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(22px)',
      '& .MuiSwitch-thumb:before': {
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          '#fff',
        )}" d="m8.229 14.062-3.521-3.541L5.75 9.479l2.479 2.459 6.021-6L15.292 7Z"/></svg>')`,
      },
      '& + .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: theme.palette.primary.main,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: theme.palette.common.white,
    width: 32,
    height: 32,
    '&:before': {
      content: "''",
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
        '#999',
      )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
    },
  },
  '& .MuiSwitch-track': {
    opacity: 1,
    backgroundColor: theme.palette.grey[400],
    borderRadius: 20 / 2,
  },
}));

// Touch gesture handler component
interface TouchGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

const TouchGesture: React.FC<TouchGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50
}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > threshold;
    const isRightSwipe = distanceX < -threshold;
    const isUpSwipe = distanceY > threshold;
    const isDownSwipe = distanceY < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
    if (isUpSwipe && onSwipeUp) {
      onSwipeUp();
    }
    if (isDownSwipe && onSwipeDown) {
      onSwipeDown();
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
};

// Touch-optimized slider
const TouchSlider = styled(Slider)(({ theme }) => ({
  height: 8,
  '& .MuiSlider-track': {
    border: 'none',
    height: 8,
    borderRadius: 4,
  },
  '& .MuiSlider-rail': {
    height: 8,
    borderRadius: 4,
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  },
  '& .MuiSlider-thumb': {
    height: 32,
    width: 32,
    backgroundColor: '#fff',
    border: `3px solid ${theme.palette.primary.main}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    lineHeight: 1.2,
    fontSize: 12,
    background: 'unset',
    padding: 0,
    width: 32,
    height: 32,
    borderRadius: '50% 50% 50% 0',
    backgroundColor: theme.palette.primary.main,
    transformOrigin: 'bottom left',
    transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
    '&:before': { display: 'none' },
    '&.MuiSlider-valueLabelOpen': {
      transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
    },
    '& > *': {
      transform: 'rotate(45deg)',
    },
  },
}));

// Main component showcasing touch-optimized elements
const TouchOptimized: React.FC = () => {
  const [switchValue, setSwitchValue] = useState(false);
  const [sliderValue, setSliderValue] = useState(30);
  const theme = useTheme();

  const handleSwipeLeft = () => {
    console.log('Swiped left');
  };

  const handleSwipeRight = () => {
    console.log('Swiped right');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Touch-Optimized Components
      </Typography>

      {/* Touch Buttons */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Touch Buttons
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TouchButton variant="contained" color="primary">
            Primary Action
          </TouchButton>
          <TouchButton variant="outlined" color="secondary">
            Secondary
          </TouchButton>
          <TouchIconButton color="primary">
            <TouchApp />
          </TouchIconButton>
        </Box>
      </Box>

      {/* Swipeable Card */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Swipeable Card
        </Typography>
        <TouchGesture onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}>
          <SwipeableCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SwipeLeft color="primary" />
                <Typography variant="body1">
                  Swipe left or right to interact
                </Typography>
                <SwipeRight color="primary" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                This card responds to touch gestures. Try swiping in different directions.
              </Typography>
            </CardContent>
          </SwipeableCard>
        </TouchGesture>
      </Box>

      {/* Touch Controls */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Touch Controls
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Enable Notifications"
              secondary="Receive push notifications for workflow updates"
            />
            <ListItemSecondaryAction>
              <TouchSwitch
                checked={switchValue}
                onChange={(e) => setSwitchValue(e.target.checked)}
              />
            </ListItemSecondaryAction>
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Refresh Interval"
              secondary={`Update every ${sliderValue} seconds`}
            />
          </ListItem>
          <ListItem>
            <TouchSlider
              value={sliderValue}
              onChange={(e, newValue) => setSliderValue(newValue as number)}
              min={10}
              max={120}
              step={5}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}s`}
            />
          </ListItem>
        </List>
      </Box>

      {/* Touch Feedback Examples */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Touch Feedback
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Fab
            color="primary"
            size="large"
            sx={{
              '&:active': {
                transform: 'scale(0.95)',
              }
            }}
          >
            <PanTool />
          </Fab>
          <TouchButton
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              '&:active': {
                background: 'linear-gradient(45deg, #FE6B8B 60%, #FF8E53 100%)',
              }
            }}
          >
            Gradient Button
          </TouchButton>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        All components are optimized for touch interaction with minimum 48px touch targets,
        visual feedback, and gesture support.
      </Typography>
    </Box>
  );
};

export { TouchButton, TouchIconButton, SwipeableCard, TouchGesture, TouchSlider, TouchSwitch };
export default TouchOptimized;