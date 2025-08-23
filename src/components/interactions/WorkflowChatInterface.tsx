/**
 * WorkflowChatInterface Component
 * AI chat interface for conversational workflows
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Button,
  List,
  ListItem,
  Fade,
  useTheme,
  alpha
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon
} from '@mui/icons-material';

import { 
  ChatInterfaceConfig, 
  WorkflowInteractionMetadata, 
  InteractionResult 
} from './EmbeddedWorkflowInterface';
import { UnifiedWorkflowData } from '../../services/unifiedWorkflowService';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  conversationId?: string;
  metadata?: {
    executionId?: string;
    processingTime?: number;
    confidence?: number;
  };
}

export interface WorkflowChatInterfaceProps {
  workflow: UnifiedWorkflowData;
  metadata: WorkflowInteractionMetadata;
  chatConfig?: ChatInterfaceConfig;
  interactionHistory?: any[];
  onComplete: (result: InteractionResult) => void;
  onClose?: () => void;
}

export const WorkflowChatInterface: React.FC<WorkflowChatInterfaceProps> = ({
  workflow,
  metadata,
  chatConfig,
  interactionHistory,
  onComplete,
  onClose
}) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize conversation
    initializeConversation();
    
    // Focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  /**
   * Initialize conversation with welcome message
   */
  const initializeConversation = () => {
    const welcomeMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'assistant',
      content: getWelcomeMessage(),
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
    setConversationId(generateConversationId());
  };

  /**
   * Generate welcome message based on workflow
   */
  const getWelcomeMessage = (): string => {
    const workflowName = workflow.businessName;
    
    if (workflowName.toLowerCase().includes('assistant')) {
      return `Hello! I'm your ${workflowName}. How can I help you today?`;
    }
    
    if (workflowName.toLowerCase().includes('chat')) {
      return `Welcome to ${workflowName}! Feel free to ask me anything.`;
    }
    
    return `Hi there! I'm here to help with ${workflowName}. What would you like to know?`;
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
      conversationId
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = currentMessage.trim();
    setCurrentMessage('');
    setIsTyping(true);
    setError(null);

    try {
      // Send message to workflow
      const response = await sendMessageToWorkflow(messageText, conversationId);
      
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: response.content,
        timestamp: new Date(),
        conversationId,
        metadata: {
          executionId: response.executionId,
          processingTime: response.processingTime,
          confidence: response.confidence
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Notify completion
      onComplete({
        success: true,
        data: {
          userMessage: messageText,
          assistantResponse: response.content,
          conversationId,
          executionId: response.executionId
        },
        executionId: response.executionId
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
      
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
        conversationId
      };

      setMessages(prev => [...prev, errorMessage]);

      onComplete({
        success: false,
        error: error instanceof Error ? error.message : 'Chat error'
      });
    } finally {
      setIsTyping(false);
    }
  };

  /**
   * Send message to workflow
   */
  const sendMessageToWorkflow = async (message: string, conversationId: string) => {
    let response;

    if (metadata.capabilities.hasWebhook && metadata.webhookUrl) {
      // Send via webhook for real-time chat
      const webhookResponse = await fetch(metadata.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          user_id: 'webapp-user',
          conversation_id: conversationId
        })
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook request failed: ${webhookResponse.statusText}`);
      }

      const data = await webhookResponse.json();
      response = {
        content: data.ai_response || data.response || 'I received your message.',
        executionId: data.conversation_id || data.execution_id,
        processingTime: data.processing_time,
        confidence: data.confidence_score
      };

    } else {
      // Send via API for manual execution
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const apiResponse = await fetch(`${API_BASE_URL}/workflows/${workflow.id}/execute-with-interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interactionData: {
            message,
            conversation_id: conversationId
          },
          interactionType: 'chat'
        })
      });

      if (!apiResponse.ok) {
        throw new Error(`API request failed: ${apiResponse.statusText}`);
      }

      const data = await apiResponse.json();
      response = {
        content: data.data?.ai_response || 'I received your message and processed it.',
        executionId: data.executionId,
        processingTime: data.data?.processing_time,
        confidence: data.data?.confidence_score
      };
    }

    return response;
  };

  /**
   * Handle key press in input
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Handle suggested action click
   */
  const handleSuggestedAction = (action: string) => {
    setCurrentMessage(action);
    // Auto-send if it's a simple action
    if (action.length < 50) {
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  /**
   * Copy message content
   */
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  /**
   * Clear conversation
   */
  const handleClearChat = () => {
    setMessages([]);
    setError(null);
    initializeConversation();
  };

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Generate unique IDs
   */
  const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const generateConversationId = () => `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Format timestamp
   */
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Render message
   */
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <Fade in key={message.id}>
        <ListItem
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            px: 1,
            py: 0.5
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              maxWidth: '80%',
              flexDirection: isUser ? 'row-reverse' : 'row'
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: isUser ? theme.palette.primary.main : theme.palette.secondary.main,
                fontSize: '1rem'
              }}
            >
              {isUser ? <PersonIcon /> : <BotIcon />}
            </Avatar>
            
            <Paper
              elevation={1}
              sx={{
                px: 2,
                py: 1,
                maxWidth: '100%',
                bgcolor: isUser 
                  ? theme.palette.primary.main 
                  : theme.palette.background.paper,
                color: isUser 
                  ? theme.palette.primary.contrastText 
                  : theme.palette.text.primary,
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                position: 'relative',
                '&:hover .message-actions': {
                  opacity: 1
                }
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.content}
              </Typography>
              
              {message.metadata?.confidence && (
                <Chip
                  size="small"
                  label={`${Math.round(message.metadata.confidence)}% confidence`}
                  sx={{ mt: 1, height: 20, fontSize: '0.75rem' }}
                  variant="outlined"
                />
              )}
              
              <Box
                className="message-actions"
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: isUser ? 'auto' : -8,
                  left: isUser ? -8 : 'auto',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1,
                  display: 'flex'
                }}
              >
                <IconButton size="small" onClick={() => copyMessage(message.content)}>
                  <CopyIcon fontSize="small" />
                </IconButton>
                {!isUser && (
                  <>
                    <IconButton size="small">
                      <ThumbUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                      <ThumbDownIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            </Paper>
          </Box>
          
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, ml: isUser ? 0 : 5, mr: isUser ? 5 : 0 }}
          >
            {formatTime(message.timestamp)}
            {message.metadata?.processingTime && (
              <> • {message.metadata.processingTime}s</>
            )}
          </Typography>
        </ListItem>
      </Fade>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">
              {workflow.businessName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {workflow.description}
            </Typography>
          </Box>
          <Box>
            <IconButton onClick={handleClearChat} size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Suggested actions */}
        {chatConfig?.suggestedActions && chatConfig.suggestedActions.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {chatConfig.suggestedActions.map((action, index) => (
              <Chip
                key={index}
                label={action}
                size="small"
                variant="outlined"
                clickable
                onClick={() => handleSuggestedAction(action)}
                disabled={isTyping}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        <List sx={{ py: 0 }}>
          {messages.map(renderMessage)}
          
          {/* Typing indicator */}
          {isTyping && (
            <ListItem sx={{ display: 'flex', alignItems: 'flex-start', px: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.palette.secondary.main,
                  mr: 1
                }}
              >
                <BotIcon />
              </Avatar>
              <Paper
                elevation={1}
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: theme.palette.background.paper,
                  borderRadius: '16px 16px 16px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Thinking...
                </Typography>
              </Paper>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Error display */}
      {error && (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        </Box>
      )}

      {/* Input */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type your message..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isTyping}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3
              }
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isTyping}
            color="primary"
            sx={{
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                bgcolor: theme.palette.primary.dark
              },
              '&.Mui-disabled': {
                bgcolor: alpha(theme.palette.primary.main, 0.3)
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Press Enter to send, Shift+Enter for new line
        </Typography>
      </Box>
    </Box>
  );
};

export default WorkflowChatInterface;