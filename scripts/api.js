// API Service for MIS SHARE
class APIService {
    constructor() {
        // Use environment-aware API URL
        this.baseURL = this.getApiBaseUrl();
        
        // Initialize token storage system
        this.initializeTokenStorage();
        
        // Load token from available storage
        this.token = this.loadToken();
        this.isInitialized = false;
        
        // Initialize synchronously for immediate use
        this.initializeSync();
    }
    
  initializeTokenStorage() {
        // Use session storage for all token storage
        this.storageMethods = [];
        
        // 1. Use sessionStorage (persists across page reloads but not browser close)
        if (this.isStorageAvailable('sessionStorage')) {
            this.storageMethods.push('sessionStorage');
        }
        
        // 2. Use in-memory storage as fallback only
        this.storageMethods.push('memory');
        
        // Initialize in-memory storage
        if (!window.misShareTokenStorage) {
            window.misShareTokenStorage = {};
        }
    }
    
    isStorageAvailable(type) {
        try {
            const storage = window[type];
            const testKey = '__storage_test__';
            storage.setItem(testKey, 'test');
            storage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    loadToken() {
        console.log('loadToken() called, storage methods:', this.storageMethods);
        
        // Try each storage method in order
        for (const method of this.storageMethods) {
            try {
                let token = null;
                
                switch (method) {
                    case 'sessionStorage':
                        token = sessionStorage.getItem('misShareToken');
                        console.log('sessionStorage token:', !!token);
                        break;
                    case 'memory':
                        token = window.misShareTokenStorage.token;
                        console.log('memory token:', !!token);
                        break;
                }
                
                if (token) {
                    console.log(`Token found in ${method}`);
                    return token;
                }
            } catch (error) {
                console.warn(`Failed to load token from ${method}:`, error);
                // Continue to next storage method
                continue;
            }
        }
        
        console.log('No token found in any storage method');
        return null;
    }
    
    saveToken(token) {
        // Save to all available storage methods
        for (const method of this.storageMethods) {
            try {
                switch (method) {
                    case 'sessionStorage':
                        if (token) {
                            sessionStorage.setItem('misShareToken', token);
                        } else {
                            sessionStorage.removeItem('misShareToken');
                        }
                        break;
                    case 'memory':
                        if (token) {
                            window.misShareTokenStorage.token = token;
                        } else {
                            delete window.misShareTokenStorage.token;
                        }
                        break;
                }
            } catch (error) {
                // Continue to next storage method
                continue;
            }
        }
    }
    
    checkSessionStorageAvailability() {
        try {
            const testKey = 'misShareTest';
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);
        } catch (error) {
            console.error('sessionStorage is not available:', error);
        }
    }

    getApiBaseUrl() {
        // Use Cloudflare Workers URL - replace with your actual worker URL after deployment
        return 'https://misshare-api.hlhoang.workers.dev/api';
    }

    initializeSync() {
        try {
            console.log('APIService initializeSync() called');
            console.log('APIService current token:', !!this.token);
            
            // For synchronous initialization, just mark as initialized
            // Token validation will happen on first API call
            console.log('APIService synchronous initialization complete, setting isInitialized = true');
            this.isInitialized = true;
        } catch (error) {
            console.warn('APIService synchronous initialization failed:', error);
            this.isInitialized = true;
        }
    }

    async initialize() {
        try {
            console.log('APIService initialize() called');
            console.log('APIService current token:', !!this.token);
            
            // If no token found, try to load it again (in case of timing issues)
            if (!this.token) {
                console.log('No token found, trying to load from storage');
                this.token = this.loadToken();
                console.log('Token loaded from storage:', !!this.token);
            }
            
            // Validate token if present
            if (this.token) {
                console.log('Validating token...');
                const isValid = await this.validateToken();
                console.log('Token validation result:', isValid);
                if (!isValid) {
                    console.log('Token invalid, clearing it');
                    this.clearToken();
                }
            }
            
            console.log('APIService initialization complete, setting isInitialized = true');
            this.isInitialized = true;
        } catch (error) {
            console.warn('APIService initialization failed:', error);
            // Don't clear token on initialization errors - let it be validated on first API call
            this.isInitialized = true;
        }
    }

    async validateToken() {
        try {
            // Simple token validation - just check if it's a valid JWT format
            if (!this.token || this.token.split('.').length !== 3) {
                return false;
            }
            
            // Check if token is expired by decoding the payload
            try {
                const payload = JSON.parse(atob(this.token.split('.')[1]));
                const currentTime = Math.floor(Date.now() / 1000);
                
                if (payload.exp && payload.exp < currentTime) {
                    return false;
                }
                
                return true;
            } catch (decodeError) {
                // Don't fail validation just because we can't decode - let the server validate
                return true;
            }
        } catch (error) {
            // Don't fail validation on errors - let the server validate the token
            return true;
        }
    }


    // Wait for initialization to complete
    async waitForInitialization() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max wait
        
        while (!this.isInitialized && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.isInitialized) {
            throw new Error('API Service failed to initialize');
        }
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        this.saveToken(token);
    }

    // Clear authentication token
    clearToken() {
        this.token = null;
        this.saveToken(null);
    }
    
    // Refresh token from storage
    refreshTokenFromStorage() {
        const storedToken = this.loadToken();
        if (storedToken && storedToken !== this.token) {
            this.token = storedToken;
            return true;
        }
        return false;
    }

    // Get authorization headers
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        // Wait for initialization
        await this.waitForInitialization();
        
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        console.log('Making API request to:', url);
        console.log('Request config:', config);

        try {
            const response = await fetch(url, config);
            console.log('Response status:', response.status);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication required. Please log in again.');
            }
            
            if (!response.ok) {
                console.error('API response not OK:', response.status, response.statusText);
                
                // Try to get error message from response
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    console.error('API error response:', errorData);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (jsonError) {
                    console.error('Failed to parse error response as JSON:', jsonError);
                    // Try to get text response
                    try {
                        const errorText = await response.text();
                        console.error('API error response (text):', errorText);
                        errorMessage = errorText || errorMessage;
                    } catch (textError) {
                        console.error('Failed to get error response as text:', textError);
                    }
                }
                
                throw new Error(errorMessage);
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                console.log('API response data:', data);
                return data;
            }
            
            return null;
        } catch (error) {
            console.error('API request failed:', error);
            
            // Handle network errors more specifically
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to the Cloudflare Workers API. Please check your internet connection and ensure the worker is deployed.');
            }
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Cannot reach the Cloudflare Workers API. Please check your connection and ensure the worker is deployed.');
            }
            
            throw error;
        }
    }

    // Authentication endpoints
    async login(email, password) {
        console.log('Logging in with email:', email);
        
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        console.log('Login API response:', response);
        console.log('Response has token:', response && response.token ? 'Yes' : 'No');
        console.log('Token value:', response && response.token ? response.token : 'None');

        if (response && response.token) {
            console.log('Setting token from login response');
            this.setToken(response.token);
            console.log('Token set, current token value:', this.token);
            console.log('sessionStorage token after set:', sessionStorage.getItem('misShareToken'));
        } else {
            console.log('No token in login response');
        }

        return response;
    }

    async register(userData) {
        console.log('Registering user with data:', userData);
        
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        console.log('Registration response:', response);
        console.log('Response has token:', response && response.token ? 'Yes' : 'No');
        console.log('Token value:', response && response.token ? response.token : 'None');

        if (response && response.token) {
            console.log('Setting token from registration response');
            this.setToken(response.token);
            console.log('Token set, current token value:', this.token);
            console.log('sessionStorage token after set:', sessionStorage.getItem('misShareToken'));
        } else {
            console.log('No token in registration response');
        }

        return response;
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async logout() {
        this.clearToken();
    }

    // Notes endpoints
    async getNotes(searchParams = {}) {
        const queryString = new URLSearchParams(searchParams).toString();
        const endpoint = queryString ? `/notes?${queryString}` : '/notes';
        return await this.request(endpoint);
    }

    async getNote(id) {
        return await this.request(`/notes/${id}`);
    }

    async createNote(noteData) {
        console.log('Creating note with data:', noteData);
        console.log('JSON stringified data:', JSON.stringify(noteData));
        console.log('Current token:', this.token);
        
        const result = await this.request('/notes', {
            method: 'POST',
            body: JSON.stringify(noteData)
        });
        
        console.log('Create note result:', result);
        return result;
    }

    async updateNote(id, noteData) {
        return await this.request(`/notes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(noteData)
        });
    }

    async deleteNote(id) {
        return await this.request(`/notes/${id}`, {
            method: 'DELETE'
        });
    }


    // Comment functionality removed

    // Users endpoints
    async getUser(cwid) {
        return await this.request(`/users/${cwid}`);
    }

    async updateProfile(userData) {
        return await this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async getUserNotes(cwid, page = 1, pageSize = 10) {
        return await this.request(`/users/${cwid}/notes?page=${page}&pageSize=${pageSize}`);
    }

    async changePassword(passwordData) {
        return await this.request('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
    }

}

// Create global API service instance - only create once
async function initializeAPIService() {
    console.log('API Service creation check - window.apiService exists:', !!window.apiService);
    console.log('API Service creation - Current location:', window.location.href);
    console.log('API Service creation - Current origin:', window.location.origin);
    console.log('API Service creation - Current pathname:', window.location.pathname);
    console.log('API Service creation - All session storage keys:', Object.keys(sessionStorage));
    console.log('API Service creation - All session storage values:', Object.fromEntries(Object.entries(sessionStorage)));

    if (!window.apiService) {
        console.log('Creating new API service instance');
        window.apiService = new APIService();
    } else {
        console.log('API service already exists, refreshing token from storage');
        // If API service already exists, just ensure it has the latest token from storage
        const storedToken = window.apiService.loadToken();
        console.log('Stored token found:', !!storedToken);
        if (storedToken && storedToken !== window.apiService.token) {
            console.log('Updating API service token from storage');
            window.apiService.token = storedToken;
        }
        // Ensure the API service is properly initialized
        if (!window.apiService.isInitialized) {
            console.log('Re-initializing existing API service');
            await window.apiService.initialize();
        }
    }
    console.log('Final API service state - token:', !!window.apiService?.token, 'initialized:', window.apiService?.isInitialized);
}

// Initialize API service
initializeAPIService();

