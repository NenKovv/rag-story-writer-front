import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { config } from '../config/env';

// TypeScript interfaces for type safety
interface AuthResponse {
  success?: boolean;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  email?: string;
  user_info?: any;
  message?: string;
  valid?: boolean;
  error?: string;
  detail?: any;
}

interface MagicLinkAuthProps {
  onAuthSuccess?: (tokenData: AuthResponse) => void;
  onGenerateBook?: () => void;
}

interface AuthState {
  token: string;
  isValidating: boolean;
  isAuthenticated: boolean;
  authData: AuthResponse | null;
  error: string | null;
  errorInfo: ErrorInfo | null; // Enhanced error information
  validationState: 'idle' | 'checking' | 'valid' | 'invalid';
  validationMessage: string;
  accessToken?: string;
  refreshToken?: string;
  userInfo?: any;
  retryCount: number; // Track retry attempts
  lastErrorTime?: number; // For rate limiting error displays
}

// Step 7: Enhanced Error Handling Interfaces
interface ErrorInfo {
  type: 'network' | 'validation' | 'authentication' | 'server' | 'client' | 'token' | 'unknown';
  code?: string | number;
  message: string;
  details?: string;
  timestamp: number;
  recoverable: boolean;
  retryCount?: number;
  suggestedAction?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Utility functions for token extraction and validation
/**
 * Extract token from URL query parameters
 * Supports multiple parameter names: token, magic_link, auth_token
 */
function extractTokenFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check multiple possible parameter names
  const possibleParams = ['token', 'magic_link', 'auth_token', 't'];
  
  for (const param of possibleParams) {
    const value = urlParams.get(param);
    if (value) {
      console.log(`Token found in URL parameter: ${param}`);
      return value;
    }
  }
  
  return '';
}

/**
 * Extract token from a full magic link URL
 * Handles cases where user pastes entire link instead of just token
 */
function extractTokenFromMagicLink(input: string): string {
  const trimmedInput = input.trim();
  
  // If it looks like a URL, try to extract token from it
  if (trimmedInput.includes('http') || trimmedInput.includes('token=') || trimmedInput.includes('magic_link=')) {
    try {
      // Try to parse as URL
      const url = new URL(trimmedInput);
      const urlParams = new URLSearchParams(url.search);
      
      // Check for token in various parameter names
      const possibleParams = ['token', 'magic_link', 'auth_token', 't'];
      for (const param of possibleParams) {
        const value = urlParams.get(param);
        if (value) {
          return value;
        }
      }
    } catch (error) {
      // If URL parsing fails, try regex extraction
      const tokenMatch = trimmedInput.match(/(?:token|magic_link|auth_token)=([^&\s]+)/i);
      if (tokenMatch) {
        return tokenMatch[1];
      }
    }
  }
  
  // If it's not a URL, return as-is (assuming it's just the token)
  return trimmedInput;
}

/**
 * Advanced token format validation with detailed feedback
 * Returns validation result with specific feedback message
 */
function validateTokenFormat(token: string): { isValid: boolean; message: string; level: 'success' | 'warning' | 'error' } {
  if (!token || token.trim().length === 0) {
    return { 
      isValid: false, 
      message: "Please enter a magic link or token", 
      level: 'error' 
    };
  }
  
  const cleanToken = token.trim();
  
  // Too short
  if (cleanToken.length < 10) {
    return { 
      isValid: false, 
      message: "Token is too short - magic tokens are usually longer", 
      level: 'error' 
    };
  }
  
  // Too long (suspicious)
  if (cleanToken.length > 1000) {
    return { 
      isValid: false, 
      message: "Token is unusually long - please check you pasted correctly", 
      level: 'error' 
    };
  }
  
  // Contains invalid characters (whitespace, newlines)
  if (cleanToken.includes(' ') || cleanToken.includes('\n') || cleanToken.includes('\t')) {
    return { 
      isValid: false, 
      message: "Token contains invalid characters - please check for extra spaces", 
      level: 'error' 
    };
  }
  
  // Check for common token patterns and provide specific feedback
  if (cleanToken.match(/^[a-zA-Z0-9_-]+$/)) {
    // Standard base64url or alphanumeric token
    if (cleanToken.length >= 20) {
      return { 
        isValid: true, 
        message: "Token format looks good - ready to validate!", 
        level: 'success' 
      };
    } else {
      return { 
        isValid: false, 
        message: "Token seems short for a magic link - double-check the full token", 
        level: 'warning' 
      };
    }
  } else if (cleanToken.match(/^[a-zA-Z0-9+/=]+$/)) {
    // Base64 encoded token
    return { 
      isValid: true, 
      message: "Base64 token detected - ready to validate!", 
      level: 'success' 
    };
  } else if (cleanToken.includes('.') && cleanToken.split('.').length === 3) {
    // JWT-like token (three parts separated by dots)
    return { 
      isValid: true, 
      message: "JWT-style token detected - ready to validate!", 
      level: 'success' 
    };
  } else if (cleanToken.match(/^[0-9a-f-]+$/)) {
    // UUID or hex-based token
    return { 
      isValid: true, 
      message: "UUID or hex token detected - ready to validate!", 
      level: 'success' 
    };
  } else {
    // Contains special characters - might be valid but unusual
    return { 
      isValid: true, 
      message: "Token format is unusual but may be valid - proceeding with validation", 
      level: 'warning' 
    };
  }
}

/**
 * Legacy function maintained for backward compatibility
 * Now uses the enhanced validation
 */

export default function MagicLinkAuth({ onAuthSuccess, onGenerateBook }: MagicLinkAuthProps) {
  // Component state management
  // Step 5: Token State Management - Initialize from localStorage
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Check localStorage for existing tokens on component initialization
    const storedAccessToken = localStorage.getItem('magic_link_access_token');
    const storedRefreshToken = localStorage.getItem('magic_link_refresh_token');
    const storedUserInfo = localStorage.getItem('magic_link_user_info');
    
    // If we have stored tokens, initialize as authenticated
    const hasStoredTokens = !!(storedAccessToken && storedRefreshToken);
    
    return {
      token: '',
      isValidating: false,
      isAuthenticated: hasStoredTokens,
      authData: hasStoredTokens ? {
        access_token: storedAccessToken,
        refresh_token: storedRefreshToken,
        user_info: storedUserInfo ? JSON.parse(storedUserInfo) : null
      } as AuthResponse : null,
      error: null,
      errorInfo: null, // Enhanced error information
      validationState: 'idle',
      validationMessage: '',
      accessToken: storedAccessToken || undefined,
      refreshToken: storedRefreshToken || undefined,
      userInfo: storedUserInfo ? JSON.parse(storedUserInfo) : undefined,
      retryCount: 0, // Initialize retry counter
      lastErrorTime: undefined // Track last error time
    };
  });

  // Step 5: Token Management Functions
  const storeTokens = (authResponse: AuthResponse) => {
    // Store tokens in localStorage for persistence
    if (authResponse.access_token) {
      localStorage.setItem('magic_link_access_token', authResponse.access_token);
    }
    if (authResponse.refresh_token) {
      localStorage.setItem('magic_link_refresh_token', authResponse.refresh_token);
    }
    if (authResponse.user_info) {
      localStorage.setItem('magic_link_user_info', JSON.stringify(authResponse.user_info));
    }
    if (authResponse.email) {
      localStorage.setItem('magic_link_email', authResponse.email);
    }
  };

  const clearTokens = () => {
    // Clear all stored authentication data
    localStorage.removeItem('magic_link_access_token');
    localStorage.removeItem('magic_link_refresh_token');
    localStorage.removeItem('magic_link_user_info');
    localStorage.removeItem('magic_link_email');
  };

  const handleLogout = () => {
    // Clear tokens and reset authentication state
    clearTokens();
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
      authData: null,
      accessToken: undefined,
      refreshToken: undefined,
      userInfo: undefined,
      error: null
    }));
    console.log('User logged out successfully');
  };

  const refreshToken = async () => {
    if (!authState.refreshToken) {
      console.error('No refresh token available');
      handleLogout();
      return false;
    }

    try {
      const response = await axios.post(`${config.API_BASE_URL}/auth/refresh-token`, {
        refresh_token: authState.refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      const refreshResponse: AuthResponse = response.data;
      
      if (refreshResponse.access_token) {
        // Update state with new tokens
        setAuthState(prev => ({
          ...prev,
          accessToken: refreshResponse.access_token,
          refreshToken: refreshResponse.refresh_token || prev.refreshToken,
          authData: { ...prev.authData, ...refreshResponse }
        }));

        // Store new tokens
        storeTokens(refreshResponse);
        
        console.log('Token refreshed successfully');
        return true;
      } else {
        console.error('Token refresh failed - no access token in response');
        handleLogout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Use enhanced error handling for refresh failures
      const errorInfo = categorizeError(error);
      
      // For token refresh failures, usually best to logout
      // unless it's a temporary network issue
      if (errorInfo.type === 'network' && errorInfo.recoverable) {
        setErrorState(error);
      } else {
        // Authentication or server errors during refresh should logout
        handleLogout();
      }
      
      return false;
    }
  };

  // Check if token is likely expired (basic heuristic)
  const isTokenLikelyExpired = (token: string): boolean => {
    if (!token) return true;
    
    try {
      // For JWT tokens, decode and check expiration
      if (token.includes('.')) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp) {
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            const timeUntilExpiry = expirationTime - currentTime;
            
            // Consider expired if less than 5 minutes remaining
            return timeUntilExpiry < 5 * 60 * 1000;
          }
        }
      }
    } catch (error) {
      console.warn('Could not decode token for expiration check:', error);
    }
    
    // If we can't determine expiration, assume it's still valid
    return false;
  };

  // Step 7: Enhanced Error Handling System
  const defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2
  };

  const createErrorInfo = (
    type: ErrorInfo['type'],
    message: string,
    options: Partial<ErrorInfo> = {}
  ): ErrorInfo => ({
    type,
    message,
    timestamp: Date.now(),
    recoverable: options.recoverable ?? true,
    retryCount: options.retryCount ?? 0,
    code: options.code,
    details: options.details,
    suggestedAction: options.suggestedAction,
    ...options
  });

  const categorizeError = (error: any): ErrorInfo => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const code = error.code;
      
      if (!navigator.onLine) {
        return createErrorInfo('network', 'You appear to be offline. Please check your internet connection.', {
          code: 'OFFLINE',
          suggestedAction: 'Check your internet connection and try again.',
          recoverable: true
        });
      }
      
      if (code === 'ECONNABORTED' || code === 'TIMEOUT') {
        return createErrorInfo('network', 'Request timed out. The server might be busy.', {
          code,
          suggestedAction: 'Wait a moment and try again.',
          recoverable: true
        });
      }
      
      if (!status) {
        return createErrorInfo('network', 'Network error. Unable to reach the server.', {
          code: error.code || 'NETWORK_ERROR',
          details: error.message,
          suggestedAction: 'Check your internet connection or try again later.',
          recoverable: true
        });
      }

      switch (status) {
        case 400:
          return createErrorInfo('validation', 'Invalid request. Please check your input.', {
            code: status,
            details: error.response?.data?.message || 'Bad request',
            suggestedAction: 'Verify your magic link format and try again.',
            recoverable: true
          });

        case 401:
          return createErrorInfo('authentication', 'Invalid or expired magic link.', {
            code: status,
            details: error.response?.data?.message || 'Authentication failed',
            suggestedAction: 'Request a new magic link from your email.',
            recoverable: false
          });

        case 403:
          return createErrorInfo('authentication', 'Access denied. This magic link may not be valid for your account.', {
            code: status,
            details: error.response?.data?.message || 'Forbidden',
            suggestedAction: 'Contact support if you believe this is an error.',
            recoverable: false
          });

        case 404:
          return createErrorInfo('server', 'Authentication service not found.', {
            code: status,
            details: 'The magic link validation endpoint is not available',
            suggestedAction: 'The service may be temporarily unavailable. Try again later.',
            recoverable: true
          });

        case 422:
          const validationErrors = error.response?.data?.detail;
          let message = 'Invalid data format.';
          let details = 'Validation failed';
          
          if (Array.isArray(validationErrors)) {
            message = 'Invalid magic link format.';
            details = validationErrors.map(e => e.msg || e.message).join(', ');
          } else if (error.response?.data?.message) {
            details = error.response.data.message;
          }
          
          return createErrorInfo('validation', message, {
            code: status,
            details,
            suggestedAction: 'Check your magic link format and try again.',
            recoverable: true
          });

        case 429:
          return createErrorInfo('server', 'Too many requests. Please wait before trying again.', {
            code: status,
            details: 'Rate limit exceeded',
            suggestedAction: 'Wait a few minutes before attempting validation again.',
            recoverable: true
          });

        case 500:
        case 502:
        case 503:
        case 504:
          return createErrorInfo('server', 'Server error. Our systems are experiencing difficulties.', {
            code: status,
            details: error.response?.data?.message || 'Internal server error',
            suggestedAction: 'Wait a few minutes and try again. If the problem persists, contact support.',
            recoverable: true
          });

        default:
          return createErrorInfo('server', `Unexpected server response (${status}).`, {
            code: status,
            details: error.response?.data?.message || 'Unknown server error',
            suggestedAction: 'Try again later or contact support if the problem persists.',
            recoverable: true
          });
      }
    }

    // Non-axios errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return createErrorInfo('network', 'Connection failed. Unable to reach the server.', {
        code: 'FETCH_ERROR',
        details: error.message,
        suggestedAction: 'Check your internet connection and try again.',
        recoverable: true
      });
    }

    return createErrorInfo('unknown', 'An unexpected error occurred.', {
      code: 'UNKNOWN',
      details: error?.message || 'Unknown error',
      suggestedAction: 'Try refreshing the page or contact support.',
      recoverable: true
    });
  };

  const shouldRetry = (errorInfo: ErrorInfo, currentRetryCount: number): boolean => {
    if (!errorInfo.recoverable) return false;
    if (currentRetryCount >= defaultRetryConfig.maxRetries) return false;
    
    // Don't retry certain error types immediately
    const nonRetriableTypes: ErrorInfo['type'][] = ['authentication', 'validation'];
    if (nonRetriableTypes.includes(errorInfo.type)) return false;
    
    return true;
  };

  const calculateRetryDelay = (retryCount: number): number => {
    const delay = defaultRetryConfig.baseDelay * Math.pow(defaultRetryConfig.backoffMultiplier, retryCount);
    return Math.min(delay, defaultRetryConfig.maxDelay);
  };

  const setErrorState = (error: any, retryCount: number = 0) => {
    const errorInfo = categorizeError(error);
    errorInfo.retryCount = retryCount;
    
    setAuthState(prev => ({
      ...prev,
      error: errorInfo.message,
      errorInfo,
      retryCount,
      lastErrorTime: Date.now(),
      isValidating: false
    }));
    
    console.error('Authentication error:', {
      errorInfo,
      originalError: error,
      retryCount
    });
  };

  const clearError = () => {
    setAuthState(prev => ({
      ...prev,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: undefined
    }));
  };

  // Step 6: Button Control Logic Functions
  const getValidationButtonState = () => {
    // Return button state with detailed reasoning
    if (authState.isAuthenticated) {
      return {
        disabled: true,
        reason: 'already-authenticated',
        message: 'Already authenticated'
      };
    }
    
    if (!authState.token.trim()) {
      return {
        disabled: true,
        reason: 'no-token',
        message: 'Enter a magic link or token to validate'
      };
    }
    
    if (authState.isValidating) {
      return {
        disabled: true,
        reason: 'validating',
        message: 'Validation in progress...'
      };
    }
    
    if (authState.validationState === 'checking') {
      return {
        disabled: true,
        reason: 'format-checking',
        message: 'Checking token format...'
      };
    }
    
    if (authState.validationState === 'invalid') {
      return {
        disabled: true,
        reason: 'invalid-format',
        message: 'Fix token format issues before validating'
      };
    }
    
    if (authState.validationState === 'valid' || authState.validationState === 'idle') {
      return {
        disabled: false,
        reason: 'ready',
        message: 'Ready to validate'
      };
    }
    
    // Fallback
    return {
      disabled: true,
      reason: 'unknown',
      message: 'Unable to validate at this time'
    };
  };

  const getGenerateBookButtonState = () => {
    if (!authState.isAuthenticated) {
      return {
        disabled: true,
        reason: 'not-authenticated',
        message: 'Authentication required to generate books'
      };
    }
    
    if (!authState.accessToken) {
      return {
        disabled: true,
        reason: 'no-access-token',
        message: 'Access token missing'
      };
    }
    
    if (authState.accessToken && isTokenLikelyExpired(authState.accessToken)) {
      return {
        disabled: true,
        reason: 'token-expired',
        message: 'Token expired - refresh in progress'
      };
    }
    
    return {
      disabled: false,
      reason: 'ready',
      message: 'Ready to generate magical stories'
    };
  };

  // Get button styling with beautiful gradient pastel colors
  const getButtonStyling = (buttonState: {disabled: boolean, reason: string}) => {
    const baseStyles = "w-full py-3 px-6 rounded-lg text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]";
    
    if (buttonState.disabled) {
      switch (buttonState.reason) {
        case 'validating':
        case 'format-checking':
          // 🟡 Loading - Soft yellow/amber pastel gradient with gentle glow
          return `${baseStyles} bg-gradient-to-r from-yellow-200 via-amber-200 to-orange-200 text-amber-800 cursor-wait shadow-yellow-200/50 animate-pulse`;
        case 'already-authenticated':
          // ✅ Success - Soft green pastel gradient 
          return `${baseStyles} bg-gradient-to-r from-emerald-200 via-green-200 to-teal-200 text-emerald-800 cursor-default shadow-emerald-200/50`;
        case 'invalid-format':
          // 🔴 Invalid - Soft red/pink pastel gradient
          return `${baseStyles} bg-gradient-to-r from-red-200 via-pink-200 to-rose-200 text-red-800 cursor-not-allowed shadow-red-200/50 opacity-75`;
        default:
          // ⚫ Disabled - Soft gray pastel gradient
          return `${baseStyles} bg-gradient-to-r from-gray-200 via-slate-200 to-gray-300 text-gray-600 cursor-not-allowed shadow-gray-200/50 opacity-60`;
      }
    }
    
    // 🟢 Ready - Beautiful orange to pink pastel gradient (enabled state)
    return `${baseStyles} bg-gradient-to-r from-orange-300 via-pink-300 to-rose-300 text-orange-800 hover:from-orange-400 hover:via-pink-400 hover:to-rose-400 hover:text-orange-900 cursor-pointer shadow-pink-300/50 hover:shadow-pink-400/60`;
  };

  const getBookButtonStyling = (buttonState: {disabled: boolean, reason: string}) => {
    const baseStyles = "w-full py-3 px-6 rounded-lg text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]";
    
    if (buttonState.disabled) {
      switch (buttonState.reason) {
        case 'token-expired':
          // 🔄 Token refresh - Soft yellow pastel gradient with gentle pulse
          return `${baseStyles} bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-200 text-amber-800 cursor-wait shadow-amber-200/50 animate-pulse`;
        default:
          // ⚫ Disabled - Soft gray pastel gradient
          return `${baseStyles} bg-gradient-to-r from-gray-200 via-slate-200 to-gray-300 text-gray-600 cursor-not-allowed shadow-gray-200/50 opacity-60`;
      }
    }
    
    // 📚 Ready - Beautiful purple to indigo pastel gradient (enabled state)
    return `${baseStyles} bg-gradient-to-r from-purple-300 via-indigo-300 to-blue-300 text-purple-800 hover:from-purple-400 hover:via-indigo-400 hover:to-blue-400 hover:text-purple-900 cursor-pointer shadow-purple-300/50 hover:shadow-purple-400/60`;
  };

  // Real-time token validation effect
  useEffect(() => {
    if (!authState.token) {
      setAuthState(prev => ({
        ...prev,
        validationState: 'idle',
        validationMessage: ''
      }));
      return;
    }

    // Debounce validation to avoid excessive checking while user types
    const validationTimeout = setTimeout(() => {
      const validation = validateTokenFormat(authState.token);
      setAuthState(prev => ({
        ...prev,
        validationState: validation.isValid ? 'valid' : 'invalid',
        validationMessage: validation.message
      }));
    }, 300); // 300ms debounce

    return () => clearTimeout(validationTimeout);
  }, [authState.token]);

  // Auto-extract token from URL on component mount
  useEffect(() => {
    const urlToken = extractTokenFromURL();
    if (urlToken) {
      console.log('Auto-extracted token from URL:', urlToken);
      const validation = validateTokenFormat(urlToken);
      setAuthState(prev => ({
        ...prev,
        token: urlToken,
        error: '', // Clear any existing errors
        validationState: validation.isValid ? 'valid' : 'invalid',
        validationMessage: validation.message
      }));
      
      // Optional: Clean URL after extracting token (removes token from browser history)
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        
        // Remove token parameters
        ['token', 'magic_link', 'auth_token', 't'].forEach(param => {
          params.delete(param);
        });
        
        // Update URL without the token (for security)
        const newUrl = params.toString() ? 
          `${url.pathname}?${params.toString()}` : 
          url.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []); // Only run once on mount

  // Step 5: Token Expiration Monitoring
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.accessToken) {
      return;
    }

    // Check token expiration every 30 seconds
    const interval = setInterval(() => {
      if (authState.accessToken && isTokenLikelyExpired(authState.accessToken)) {
        console.log('Access token appears to be expiring soon, attempting refresh...');
        refreshToken();
      }
    }, 30000); // 30 seconds

    // Initial check
    if (isTokenLikelyExpired(authState.accessToken)) {
      console.log('Access token appears to be expired, attempting refresh...');
      refreshToken();
    }

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.accessToken]); // Re-run when auth state changes

  // Step 4: API Integration with Axios
  const handleValidateToken = async () => {
    if (!authState.token.trim()) return;
    
    // Set loading state and clear previous errors
    setAuthState(prev => ({
      ...prev,
      isValidating: true,
      error: null,
      errorInfo: null
    }));

    try {
      // Try different payload formats to handle potential API expectation variations
      const requestPayloads = [
        // Format 1: Simple token field
        { token: authState.token.trim() },
        // Format 2: Magic link field (alternative naming)
        { magic_link: authState.token.trim() },
        // Format 3: More detailed format
        { 
          token: authState.token.trim(),
          token_type: "magic_link"
        }
      ];

      let lastError = null;
      
      for (let i = 0; i < requestPayloads.length; i++) {
        const requestPayload = requestPayloads[i];
        
        try {
          // Debug: Log the request details
          console.log(`Attempt ${i + 1} - Sending API request:`, {
            url: `${config.API_BASE_URL}/auth/validate-magic-link`,
            payload: requestPayload,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          // Make POST request to validate magic link
          const response = await axios.post(`${config.API_BASE_URL}/auth/validate-magic-link`, requestPayload, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 10000 // 10 second timeout
          });

          console.log('API Response received:', response.data);
          console.log('Response status:', response.status);
          console.log('Response headers:', response.headers);
          
          const authResponse: AuthResponse = response.data;

          // Check for success in multiple possible formats
          const isSuccess = authResponse.success === true || 
                           authResponse.valid === true ||
                           (authResponse.access_token && !authResponse.error) ||
                           response.status === 200;

          if (isSuccess && !authResponse.error) {
            // Success: Update state with authentication data
            setAuthState(prev => ({
              ...prev,
              isValidating: false,
              isAuthenticated: true,
              authData: authResponse,
              accessToken: authResponse.access_token || '',
              refreshToken: authResponse.refresh_token || '',
              userInfo: authResponse.user_info || null,
              error: null
            }));

            console.log('Magic Link validation successful:', authResponse);
            
            // Call success callback if provided
            onAuthSuccess?.(authResponse);
            
            // Store tokens using our new function
            storeTokens(authResponse);
            
            return; // Success, exit the function
          } else {
            // API returned an error or invalid response
            const errorMessage = authResponse.message || authResponse.error || 'Invalid magic link token';
            setAuthState(prev => ({
              ...prev,
              isValidating: false,
              error: errorMessage
            }));
            return; // Got a response, exit the function
          }
        } catch (attemptError) {
          lastError = attemptError;
          
          // If this is not a 422 error, don't try other formats
          if (axios.isAxiosError(attemptError) && attemptError.response?.status !== 422) {
            break;
          }
          
          console.log(`Attempt ${i + 1} failed:`, attemptError);
          
          // Continue to next format if this is a 422 error
          if (i < requestPayloads.length - 1) {
            console.log(`Trying next payload format...`);
            continue;
          }
        }
      }
      
      // If we get here, all attempts failed
      throw lastError;
      
    } catch (error) {
      // Step 7: Enhanced Error Handling
      console.error('Magic Link validation failed:', error);
      
      // Use our enhanced error categorization system
      setErrorState(error, authState.retryCount);
      
      // Check if we should attempt retry for recoverable errors
      const errorInfo = categorizeError(error);
      if (shouldRetry(errorInfo, authState.retryCount)) {
        const delay = calculateRetryDelay(authState.retryCount);
        console.log(`Retrying in ${delay}ms... (attempt ${authState.retryCount + 1}/${defaultRetryConfig.maxRetries})`);
        
        setTimeout(() => {
          // Update retry count and try again
          setAuthState(prev => ({
            ...prev,
            retryCount: prev.retryCount + 1
          }));
          handleValidateToken();
        }, delay);
      }
    }
  };

  // Step 8: Enhanced Input Validation and Edge Case Handling (Optimized)
  const sanitizeInput = useCallback((input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    // Remove common problematic characters and normalize whitespace
    return input
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .slice(0, 2048); // Limit length to prevent DoS
  }, []);

  const validateInputLength = useCallback((input: string): { isValid: boolean; message: string } => {
    if (input.length === 0) {
      return { isValid: false, message: 'Token cannot be empty' };
    }
    if (input.length < 8) {
      return { isValid: false, message: 'Token too short (minimum 8 characters)' };
    }
    if (input.length > 2048) {
      return { isValid: false, message: 'Token too long (maximum 2048 characters)' };
    }
    return { isValid: true, message: 'Token length is acceptable' };
  }, []);

  const detectSuspiciousPatterns = useCallback((input: string): { isValid: boolean; message: string } => {
    // Check for suspicious patterns that might indicate malicious input
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /on\w+=/i,
      /eval\(/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        return { isValid: false, message: 'Token contains suspicious content' };
      }
    }
    return { isValid: true, message: 'Token appears safe' };
  }, []);

  const handleTokenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const sanitizedInput = sanitizeInput(rawInput);
    
    // Edge case: Handle paste of full URLs
    let processedInput = sanitizedInput;
    if (sanitizedInput.includes('http') && sanitizedInput.length > 100) {
      const extracted = extractTokenFromMagicLink(sanitizedInput);
      if (extracted) {
        processedInput = extracted;
      }
    }

    // Additional validation
    const lengthCheck = validateInputLength(processedInput);
    const securityCheck = detectSuspiciousPatterns(processedInput);
    
    if (!lengthCheck.isValid || !securityCheck.isValid) {
      setAuthState(prev => ({
        ...prev,
        token: processedInput,
        validationState: 'invalid',
        validationMessage: lengthCheck.message || securityCheck.message,
        error: null,
        errorInfo: null
      }));
      return;
    }

    setAuthState(prev => ({
      ...prev,
      token: processedInput,
      error: null,
      errorInfo: null
    }));
  }, [sanitizeInput, validateInputLength, detectSuspiciousPatterns]);

  // Placeholder for generate book function
  const handleGenerateBook = useCallback(() => {
    try {
      onGenerateBook?.();
    } catch (error) {
      console.error('Error in generate book callback:', error);
      setErrorState(error);
    }
  }, [onGenerateBook]);

  // Step 8: Performance Optimizations with Memoization
  const buttonStates = useMemo(() => ({
    validation: getValidationButtonState(),
    generateBook: getGenerateBookButtonState()
  }), [
    authState.isAuthenticated,
    authState.token,
    authState.isValidating,
    authState.validationState,
    authState.accessToken,
    authState.retryCount
  ]);

  const inputStatus = useMemo(() => ({
    hasError: authState.validationState === 'invalid',
    isValid: authState.validationState === 'valid',
    isChecking: authState.validationState === 'checking',
    isEmpty: !authState.token.trim()
  }), [authState.validationState, authState.token]);

  // Step 8: Component Lifecycle and Error Recovery
  useEffect(() => {
    // Component error recovery on mount
    const handlePageLoad = () => {
      try {
        // Clear any stale errors on component mount
        if (authState.error && authState.lastErrorTime) {
          const timeSinceError = Date.now() - authState.lastErrorTime;
          if (timeSinceError > 60000) { // Clear errors older than 1 minute
            clearError();
          }
        }
      } catch (error) {
        console.error('Error in page load handler:', error);
      }
    };

    handlePageLoad();
    window.addEventListener('focus', handlePageLoad);
    
    return () => {
      window.removeEventListener('focus', handlePageLoad);
    };
  }, []);

  // Step 8: Enhanced Error Boundary
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('Unhandled error in MagicLinkAuth:', event.error);
      setErrorState(new Error('An unexpected error occurred. Please refresh the page.'));
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in MagicLinkAuth:', event.reason);
      setErrorState(new Error('An unexpected error occurred. Please try again.'));
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            ✨ Enter Your Magic Link ✨
          </h2>
          <p className="text-pink-600">
            Use your special magic link to unlock story creation powers!
          </p>
        </div>

        {/* Real-time Validation Feedback */}
        {authState.token && authState.validationState !== 'idle' && (
          <div className={`border-l-4 rounded-r-lg p-4 mb-6 ${
            authState.validationState === 'valid' 
              ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-400'
              : authState.validationState === 'invalid'
                ? 'bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-orange-400'
                : 'bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-blue-400'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <span className="text-xl">
                  {authState.validationState === 'valid' 
                    ? '✅' 
                    : authState.validationState === 'invalid' 
                      ? '❌' 
                      : '🔍'
                  }
                </span>
              </div>
              <div>
                <h4 className={`font-semibold text-sm mb-1 ${
                  authState.validationState === 'valid' 
                    ? 'text-green-800' 
                    : authState.validationState === 'invalid' 
                      ? 'text-orange-800' 
                      : 'text-blue-800'
                }`}>
                  {authState.validationState === 'valid' 
                    ? 'Token Format Valid' 
                    : authState.validationState === 'invalid' 
                      ? 'Token Format Issue' 
                      : 'Validating Token Format'
                  }
                </h4>
                <p className={`text-sm ${
                  authState.validationState === 'valid' 
                    ? 'text-green-700' 
                    : authState.validationState === 'invalid' 
                      ? 'text-orange-700' 
                      : 'text-blue-700'
                }`}>
                  {authState.validationMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Display Area - Step 7 */}
        {authState.error && (
          <div className={`bg-gradient-to-r rounded-r-lg p-4 mb-6 border-l-4 ${
            authState.errorInfo?.type === 'network' 
              ? 'from-yellow-50 via-orange-50 to-red-50 border-orange-400'
              : authState.errorInfo?.type === 'authentication' 
              ? 'from-red-50 via-red-100 to-red-50 border-red-500'
              : authState.errorInfo?.type === 'validation'
              ? 'from-blue-50 via-purple-50 to-blue-50 border-blue-400'
              : 'from-red-50 via-orange-50 to-yellow-50 border-orange-400'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <div className="flex-shrink-0 mr-3">
                  <span className="text-2xl">
                    {authState.errorInfo?.type === 'network' ? '🌐' :
                     authState.errorInfo?.type === 'authentication' ? '🔐' :
                     authState.errorInfo?.type === 'validation' ? '📝' :
                     authState.errorInfo?.type === 'server' ? '🖥️' :
                     authState.errorInfo?.type === 'token' ? '🔑' : '⚠️'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold text-sm mb-1 ${
                    authState.errorInfo?.type === 'network' ? 'text-orange-800' :
                    authState.errorInfo?.type === 'authentication' ? 'text-red-800' :
                    authState.errorInfo?.type === 'validation' ? 'text-blue-800' :
                    'text-orange-800'
                  }`}>
                    {authState.errorInfo?.type === 'network' ? 'Connection Issue' :
                     authState.errorInfo?.type === 'authentication' ? 'Authentication Failed' :
                     authState.errorInfo?.type === 'validation' ? 'Invalid Input' :
                     authState.errorInfo?.type === 'server' ? 'Server Problem' :
                     authState.errorInfo?.type === 'token' ? 'Token Issue' : 'Unexpected Error'}
                  </h4>
                  <p className={`text-sm mb-2 ${
                    authState.errorInfo?.type === 'network' ? 'text-orange-700' :
                    authState.errorInfo?.type === 'authentication' ? 'text-red-700' :
                    authState.errorInfo?.type === 'validation' ? 'text-blue-700' :
                    'text-orange-700'
                  }`}>
                    {authState.error}
                  </p>
                  
                  {/* Suggested Action */}
                  {authState.errorInfo?.suggestedAction && (
                    <div className={`text-xs p-2 rounded mt-2 ${
                      authState.errorInfo?.type === 'network' ? 'bg-orange-100 text-orange-800' :
                      authState.errorInfo?.type === 'authentication' ? 'bg-red-100 text-red-800' :
                      authState.errorInfo?.type === 'validation' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      💡 <strong>What to do:</strong> {authState.errorInfo.suggestedAction}
                    </div>
                  )}
                  
                  {/* Error Details in Development */}
                  {import.meta.env?.DEV && authState.errorInfo?.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        🔍 Technical Details (Dev)
                      </summary>
                      <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-auto">
                        {JSON.stringify({
                          type: authState.errorInfo.type,
                          code: authState.errorInfo.code,
                          details: authState.errorInfo.details,
                          timestamp: new Date(authState.errorInfo.timestamp).toISOString(),
                          retryCount: authState.errorInfo.retryCount,
                          recoverable: authState.errorInfo.recoverable
                        }, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="ml-4 flex flex-col space-y-2">
                {/* Retry Button for Recoverable Errors */}
                {authState.errorInfo?.recoverable && authState.retryCount < defaultRetryConfig.maxRetries && (
                  <button
                    onClick={() => {
                      clearError();
                      handleValidateToken();
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors duration-200"
                    title="Try the request again"
                  >
                    🔄 Retry
                  </button>
                )}
                
                {/* Clear Error Button */}
                <button
                  onClick={clearError}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors duration-200"
                  title="Dismiss this error"
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>
            
            {/* Retry Progress Indicator */}
            {authState.retryCount > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <div className="flex items-center justify-between text-xs text-orange-600">
                  <span>Retry attempt: {authState.retryCount}/{defaultRetryConfig.maxRetries}</span>
                  {authState.retryCount >= defaultRetryConfig.maxRetries && (
                    <span className="text-red-600">❌ Max retries reached</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success Display Area - Enhanced for Step 5 */}
        {authState.isAuthenticated && (
          <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-l-4 border-emerald-400 rounded-r-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <div className="flex-shrink-0 mr-3">
                  <span className="text-2xl">🎉</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-emerald-800 font-semibold text-sm mb-1">
                    Magic Link Activated!
                  </h4>
                  <div className="text-emerald-700 text-sm space-y-1">
                    <p>Welcome! You're ready to create magical stories.</p>
                    {authState.authData?.email && (
                      <p><strong>Email:</strong> {authState.authData.email}</p>
                    )}
                    {authState.userInfo && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium">User Details</summary>
                          <pre className="mt-1 p-2 bg-emerald-100 rounded text-xs overflow-auto">
                            {JSON.stringify(authState.userInfo, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="ml-4 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors duration-200"
                title="Sign out and clear stored tokens"
              >
                Logout
              </button>
            </div>
            
            {/* Token Status Indicator */}
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <div className="flex items-center justify-between text-xs text-emerald-600">
                <span>
                  🔑 Access Token: {authState.accessToken ? 
                    (isTokenLikelyExpired(authState.accessToken) ? 
                      '⚠️ Expiring soon' : 
                      '✅ Valid'
                    ) : 
                    '❌ Missing'
                  }
                </span>
                <span>
                  🔄 Refresh Token: {authState.refreshToken ? '✅ Available' : '❌ Missing'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Form - Enhanced for Step 8 */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6" role="form" aria-label="Magic Link Authentication">
          {/* Magic Link Input */}
          <div>
            <label htmlFor="magic-link" className="block text-sm font-semibold text-gray-700 mb-2">
              <span aria-hidden="true">🔗</span> Magic Link or Token
            </label>
            <input
              type="text"
              id="magic-link"
              name="magic-link"
              value={authState.token}
              onChange={handleTokenChange}
              placeholder="Paste your complete magic link or just the token..."
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-all duration-200 ${
                inputStatus.isValid
                  ? 'border-green-400 focus:border-green-500 focus:ring-green-200 bg-green-50 text-green-900'
                  : inputStatus.hasError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50 text-red-900'
                    : inputStatus.isChecking
                      ? 'border-blue-400 focus:border-blue-500 focus:ring-blue-200 bg-blue-50'
                      : 'border-gray-200 focus:border-orange-500 focus:ring-orange-200'
              }`}
              disabled={authState.isValidating}
              aria-describedby="magic-link-help magic-link-validation"
              aria-invalid={inputStatus.hasError ? 'true' : 'false'}
              aria-required="true"
              autoComplete="off"
              spellCheck="false"
              role="textbox"
              aria-label="Enter your magic link or authentication token"
            />
            <div className="flex justify-between items-start mt-1">
              <p id="magic-link-help" className="text-xs text-gray-500 flex-1">
                📋 Paste the full magic link from your email, or just the token part.
                {authState.token && authState.token.includes('http') && (
                  <span className="text-blue-600 block mt-1">🔍 Auto-extracting token from URL...</span>
                )}
              </p>
              {authState.validationState !== 'idle' && authState.validationMessage && (
                <div className="ml-2 flex-shrink-0">
                  <span 
                    id="magic-link-validation"
                    className={`text-xs font-medium ${
                      inputStatus.isValid 
                        ? 'text-green-600' 
                        : inputStatus.hasError 
                          ? 'text-red-600' 
                          : 'text-blue-600'
                    }`}
                  >
                    {inputStatus.isChecking ? '⏳' : 
                     inputStatus.isValid ? '✓' : '✗'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Enhanced for Step 8 Accessibility */}
          <div className="space-y-3" role="group" aria-label="Authentication Actions">
            {/* Validate Token Button with Advanced Control Logic */}
            {(() => {
              const buttonState = buttonStates.validation;
              return (
                <button
                  type="submit"
                  onClick={handleValidateToken}
                  disabled={buttonState.disabled}
                  className={getButtonStyling(buttonState)}
                  aria-describedby="validate-help"
                  aria-label={`Validate magic link token. Current state: ${buttonState.message}`}
                  title={buttonState.message}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!buttonState.disabled) {
                        handleValidateToken();
                      }
                    }
                  }}
                >
                  {authState.isValidating ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" role="status" aria-label="Loading"></div>
                      <span>Validating Magic Link...</span>
                    </div>
                  ) : authState.validationState === 'checking' ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" role="status" aria-label="Checking format"></div>
                      <span>Checking Format...</span>
                    </div>
                  ) : authState.isAuthenticated ? (
                    <div className="flex items-center justify-center">
                      <span aria-hidden="true" className="mr-2">✅</span>
                      Magic Link Validated!
                    </div>
                  ) : buttonState.reason === 'invalid-format' ? (
                    <div className="flex items-center justify-center">
                      <span aria-hidden="true" className="mr-2">❌</span>
                      Fix Token Format
                    </div>
                  ) : buttonState.disabled ? (
                    <div className="flex items-center justify-center">
                      <span aria-hidden="true" className="mr-2">⏸️</span>
                      {buttonState.reason === 'no-token' ? 'Enter Token' : 'Not Ready'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span aria-hidden="true" className="mr-2">🔍</span>
                      Validate Magic Link
                    </div>
                  )}
                </button>
              );
            })()}
            
            {/* Enhanced Help Text with Button State Information */}
            <p id="validate-help" className="text-xs text-gray-500 text-center">
              {(() => {
                const buttonState = buttonStates.validation;
                switch (buttonState.reason) {
                  case 'already-authenticated':
                    return "✅ Authentication complete! Ready to create stories.";
                  case 'no-token':
                    return "Enter a magic link or token above to enable validation";
                  case 'validating':
                    return "🔄 Validating your magic link with the server...";
                  case 'format-checking':
                    return "🔍 Analyzing token format - please wait...";
                  case 'invalid-format':
                    return "❌ Please fix the token format issues shown above";
                  case 'ready':
                    return "✅ Token looks good - click to verify with server";
                  default:
                    return "Click to verify your magic link with the server";
                }
              })()}
            </p>

            {/* Generate Book Button with Enhanced Control Logic */}
            {(() => {
              const buttonState = buttonStates.generateBook;
              return (
                <button
                  type="button"
                  onClick={handleGenerateBook}
                  disabled={buttonState.disabled}
                  className={getBookButtonStyling(buttonState)}
                  aria-describedby="generate-help"
                  title={buttonState.message}
                >
                  {authState.isAuthenticated && !buttonState.disabled ? (
                    <div className="flex items-center justify-center">
                      <span aria-hidden="true" className="mr-2">📚</span>
                      Generate My Magical Book!
                      <span aria-hidden="true" className="ml-2">✨</span>
                    </div>
                  ) : buttonState.reason === 'token-expired' ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" role="status" aria-label="Refreshing token"></div>
                      <span>Refreshing Token...</span>
                    </div>
                  ) : buttonState.reason === 'not-authenticated' ? (
                    <div className="flex items-center justify-center">
                      <span aria-hidden="true" className="mr-2">🔒</span>
                      Validate Link First
                      <span aria-hidden="true" className="ml-2">🔒</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span aria-hidden="true" className="mr-2">⏸️</span>
                      Cannot Generate Yet
                    </div>
                  )}
                </button>
              );
            })()}
            
            {/* Enhanced Generate Help Text */}
            <p id="generate-help" className="text-xs text-gray-500 text-center">
              {(() => {
                const buttonState = buttonStates.generateBook;
                switch (buttonState.reason) {
                  case 'not-authenticated':
                    return "🔐 Complete validation above to unlock book generation";
                  case 'no-access-token':
                    return "⚠️ Missing access token - please re-authenticate";
                  case 'token-expired':
                    return "🔄 Token expired - automatically refreshing...";
                  case 'ready':
                    return "🎉 You're all set! Click to start creating your story";
                  default:
                    return "Complete authentication to unlock story generation";
                }
              })()}
            </p>
          </div>
        </form>

        {/* Debug Section - Development Only */}
        {import.meta.env?.DEV && (
          <details className="mt-6">
            <summary className="text-xs text-gray-400 cursor-pointer">Debug Info & Test Tokens (Dev Only)</summary>
            
            {/* Test Token Buttons */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-600">Quick Test Tokens:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAuthState(prev => ({ ...prev, token: 'JbJ05ZNLGMyaOv5pcgxpIdNgOoYu10L-qu6u4YqpFGM' }))}
                  className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded"
                >
                  Your Token
                </button>
                <button
                  onClick={() => setAuthState(prev => ({ ...prev, token: 'test-jwt-token.eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.test' }))}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                >
                  JWT Token
                </button>
                <button
                  onClick={() => setAuthState(prev => ({ ...prev, token: 'dGVzdC1iYXNlNjQtdG9rZW4=' }))}
                  className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                >
                  Base64 Token
                </button>
                <button
                  onClick={() => setAuthState(prev => ({ ...prev, token: '550e8400-e29b-41d4-a716-446655440000' }))}
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                >
                  UUID Token
                </button>
                <button
                  onClick={() => setAuthState(prev => ({ ...prev, token: 'simple-test-token' }))}
                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded"
                >
                  Simple Token
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded"
                >
                  Clear All Tokens
                </button>
                <button
                  onClick={refreshToken}
                  disabled={!authState.refreshToken}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded disabled:opacity-50"
                >
                  Refresh Token
                </button>
              </div>
            </div>

            {/* Debug State */}
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Current State:</p>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(authState, null, 2)}
              </pre>
            </div>

            {/* API Configuration */}
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-600 mb-2">API Config:</p>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify({ API_BASE_URL: config.API_BASE_URL }, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}