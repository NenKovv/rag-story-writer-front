import { useState, useEffect } from 'react';
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
  validationState: 'idle' | 'checking' | 'valid' | 'invalid';
  validationMessage: string;
  accessToken?: string;
  refreshToken?: string;
  userInfo?: any;
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
function isValidTokenFormat(token: string): boolean {
  return validateTokenFormat(token).isValid;
}

export default function MagicLinkAuth({ onAuthSuccess, onGenerateBook }: MagicLinkAuthProps) {
  // Component state management
  const [authState, setAuthState] = useState<AuthState>({
    token: '',
    isValidating: false,
    isAuthenticated: false,
    authData: null,
    error: null,
    validationState: 'idle',
    validationMessage: '',
    accessToken: undefined,
    refreshToken: undefined,
    userInfo: undefined
  });

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

  // Handler for input changes with smart token extraction and validation
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Extract token from input (handles both direct tokens and full URLs)
    const extractedToken = extractTokenFromMagicLink(inputValue);
    
    setAuthState(prev => ({
      ...prev,
      token: extractedToken,
      error: '', // Clear errors when user starts typing
      validationState: 'checking', // Show checking state immediately
      validationMessage: 'Checking token format...'
    }));
  };

  // Step 4: API Integration with Axios
  const handleValidateToken = async () => {
    if (!authState.token.trim()) return;
    
    // Set loading state
    setAuthState(prev => ({
      ...prev,
      isValidating: true,
      error: null
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
            
            // Optional: Store tokens in localStorage for persistence
            if (authResponse.access_token) {
              localStorage.setItem('magic_link_access_token', authResponse.access_token);
            }
            if (authResponse.refresh_token) {
              localStorage.setItem('magic_link_refresh_token', authResponse.refresh_token);
            }
            
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
      // Handle API errors
      console.error('Magic Link validation failed:', error);
      
      let errorMessage = 'Failed to validate magic link';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 422) {
          // Unprocessable Entity - validation error
          const validationErrors = error.response?.data?.detail;
          if (Array.isArray(validationErrors)) {
            errorMessage = `Validation error: ${validationErrors.map(e => e.msg).join(', ')}`;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else {
            errorMessage = 'Invalid request format. Please check your token.';
          }
        } else if (error.response?.status === 401) {
          errorMessage = 'Invalid or expired magic link token';
        } else if (error.response?.status === 400) {
          errorMessage = 'Invalid token format';
        } else if (error.response && error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = `Network error: ${error.message}`;
        }
        
        // Log the full error for debugging
        console.error('Full API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      
      setAuthState(prev => ({
        ...prev,
        isValidating: false,
        error: errorMessage
      }));
    }
  };

  // Placeholder for generate book function
  const handleGenerateBook = () => {
    onGenerateBook?.();
  };

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

        {/* Error Display Area */}
        {authState.error && (
          <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-l-4 border-orange-400 rounded-r-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <span className="text-2xl">🤔</span>
              </div>
              <div>
                <h4 className="text-orange-800 font-semibold text-sm mb-1">
                  Oops! Something's Not Quite Right
                </h4>
                <p className="text-orange-700 text-sm">
                  {authState.error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Display Area */}
        {authState.isAuthenticated && authState.authData && (
          <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-l-4 border-emerald-400 rounded-r-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <h4 className="text-emerald-800 font-semibold text-sm mb-1">
                  Magic Link Activated!
                </h4>
                <p className="text-emerald-700 text-sm">
                  Welcome, {authState.authData.email}! You're ready to create magical stories.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                authState.validationState === 'valid'
                  ? 'border-green-400 focus:border-green-500 focus:ring-green-200 bg-green-50 text-green-900'
                  : authState.validationState === 'invalid'
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50 text-red-900'
                    : authState.validationState === 'checking'
                      ? 'border-blue-400 focus:border-blue-500 focus:ring-blue-200 bg-blue-50'
                      : 'border-gray-200 focus:border-orange-500 focus:ring-orange-200'
              }`}
              disabled={authState.isValidating}
              aria-describedby="magic-link-help magic-link-validation"
              aria-invalid={authState.validationState === 'invalid' ? 'true' : 'false'}
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
                      authState.validationState === 'valid' 
                        ? 'text-green-600' 
                        : authState.validationState === 'invalid' 
                          ? 'text-red-600' 
                          : 'text-blue-600'
                    }`}
                  >
                    {authState.validationState === 'checking' ? '⏳' : 
                     authState.validationState === 'valid' ? '✓' : '✗'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Validate Token Button */}
            <button
              type="button"
              onClick={handleValidateToken}
              disabled={!authState.token.trim() || !isValidTokenFormat(authState.token) || authState.isValidating || authState.isAuthenticated}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 px-6 rounded-lg text-lg font-semibold hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              aria-describedby="validate-help"
            >
              {authState.isValidating ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" role="status" aria-label="Loading"></div>
                  <span>Validating Magic Link...</span>
                </div>
              ) : authState.isAuthenticated ? (
                <div className="flex items-center justify-center">
                  <span aria-hidden="true" className="mr-2">✅</span>
                  Magic Link Validated!
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span aria-hidden="true" className="mr-2">🔍</span>
                  Validate Magic Link
                </div>
              )}
            </button>
            <p id="validate-help" className="text-xs text-gray-500 text-center">
              {!authState.token.trim() 
                ? "Enter a magic link or token above to enable validation"
                : authState.validationState === 'invalid'
                  ? "Please fix the token format issues above before validating"
                : authState.validationState === 'checking'
                  ? "Checking token format - please wait..."
                : authState.validationState === 'valid' && authState.isAuthenticated
                  ? "Magic link successfully validated!"
                : authState.validationState === 'valid'
                  ? "Token format looks good - click to verify with server"
                  : "Click to verify your magic link with the server"
              }
            </p>

            {/* Generate Book Button */}
            <button
              type="button"
              onClick={handleGenerateBook}
              disabled={!authState.isAuthenticated}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              aria-describedby="generate-help"
            >
              {authState.isAuthenticated ? (
                <div className="flex items-center justify-center">
                  <span aria-hidden="true" className="mr-2">📚</span>
                  Generate My Magical Book!
                  <span aria-hidden="true" className="ml-2">✨</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span aria-hidden="true" className="mr-2">🔒</span>
                  Validate Link First
                  <span aria-hidden="true" className="ml-2">🔒</span>
                </div>
              )}
            </button>
            <p id="generate-help" className="text-xs text-gray-500 text-center">
              {authState.isAuthenticated 
                ? "You're all set! Click to start creating your story"
                : "Complete validation above to unlock book generation"
              }
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