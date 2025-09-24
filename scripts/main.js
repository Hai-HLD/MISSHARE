// Main JavaScript for MIS SHARE Website

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure all scripts are loaded
    setTimeout(async () => {
        await initializeWebsite();
        // Mark page as ready to show content
        document.body.classList.add('page-ready');
        
        // Wait for the background color transition to complete (0.3s) before making it transparent
        setTimeout(() => {
            document.body.style.backgroundColor = 'transparent';
        }, 300);
    }, 50);
});

// Initialize all website functionality
async function initializeWebsite() {
    // Prevent multiple initializations
    if (window.websiteInitialized) {
        return;
    }
    
    try {
        window.websiteInitialized = true;
        
        // First, verify authentication status before any page rendering
        await verifyAuthenticationStatus();
        
        // Initialize core functionality
        setupFormValidation();
        setupPasswordToggles();
        setupAuthentication();
        
        // Initialize authentication state (async)
        await initializeAuthState();
        
        // Initialize page-specific functionality based on current page
        const currentPage = getCurrentPage();
        switch(currentPage) {
            case 'note':
                initializeNotePage();
                break;
            case 'profile':
                initializeProfilePage();
                break;
            case 'search':
                initializeSearchPage();
                break;
            case 'upload':
                initializeUploadPage();
                break;
            case 'main':
                initializeMainPage();
                break;
            default:
                // Other pages - no additional initialization needed
                break;
        }
        
        // Final navigation update to ensure all pages have correct state
        await updateNavigation();
        
    } catch (error) {
        console.error('Error during website initialization:', error);
        // Still mark page as ready even if there's an error
        document.body.classList.add('page-ready');
    }
}

// Determine current page based on URL
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('note.html') || path.includes('/note')) return 'note';
    if (path.includes('profile.html') || path.includes('/profile')) return 'profile';
    if (path.includes('search.html') || path.includes('/search')) return 'search';
    if (path.includes('upload.html') || path.includes('/upload')) return 'upload';
    if (path.includes('login.html') || path.includes('/login')) return 'login';
    if (path.includes('home.html') || path.includes('/home')) return 'main';
    
    // For root path or any other path, return 'main' (home page)
    return 'main';
}

// ===== NOTIFICATION SYSTEM =====

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'bottom: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ===== FORM VALIDATION =====

// Setup form validation
function setupFormValidation() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
        setupFormErrorHandling('signupFirstName', 'signupLastName', 'signupEmail', 'signupCWID', 'signupPassword', 'signupConfirmPassword');
    }

    // Upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadSubmit);
        setupFormErrorHandling('noteTitle', 'noteClass', 'noteTopic', 'noteYear', 'noteContent');
    }

    // CWID validation
    const cwidField = document.getElementById('signupCWID');
    if (cwidField) {
        cwidField.addEventListener('input', validateCWID);
    }

    // Password confirmation validation
    const confirmPasswordField = document.getElementById('signupConfirmPassword');
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', validatePasswordMatch);
    }
}

// CWID validation
function validateCWID(e) {
    const cwid = e.target.value;
    const cwidField = e.target;
    
    // Remove any non-numeric characters
    e.target.value = cwid.replace(/[^0-9]/g, '');
    
    // Limit to 8 digits
    if (e.target.value.length > 8) {
        e.target.value = e.target.value.substring(0, 8);
    }
    
    // Validate format
    if (e.target.value.length === 8) {
        cwidField.classList.remove('is-invalid');
        cwidField.classList.add('is-valid');
    } else if (e.target.value.length > 0) {
        cwidField.classList.remove('is-valid');
        cwidField.classList.add('is-invalid');
    } else {
        cwidField.classList.remove('is-valid', 'is-invalid');
    }
}

// Password match validation
function validatePasswordMatch() {
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const confirmField = document.getElementById('signupConfirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmField.classList.add('is-invalid');
        confirmField.classList.remove('is-valid');
    } else if (confirmPassword && password === confirmPassword) {
        confirmField.classList.add('is-valid');
        confirmField.classList.remove('is-invalid');
    } else {
        confirmField.classList.remove('is-valid', 'is-invalid');
    }
}

// Setup form error handling
function setupFormErrorHandling(...fieldIds) {
    fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                if (this.hasAttribute('required') && !this.value.trim()) {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                }
            });
        }
    });
}

// Show form error
function showFormError(formId, message) {
    const form = document.getElementById(formId + 'Form');
    if (form) {
        let errorDiv = form.querySelector('.alert-danger');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            form.insertBefore(errorDiv, form.firstChild);
        }
        errorDiv.textContent = message;
    }
}

// Hide form error
function hideFormError(formId) {
    const form = document.getElementById(formId + 'Form');
    if (form) {
        const errorDiv = form.querySelector('.alert-danger');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
}

// ===== FORM SUBMISSION HANDLERS =====

// Handle login form submission
async function handleLoginSubmit(e) {
    e.preventDefault();
    hideFormError('login');
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showFormError('login', 'Please fill in all required fields.');
        return;
    }
    
    try {
        showNotification('Logging in...', 'info');
        const response = await apiService.login(email, password);
        
        if (response && response.user) {
            await setUserLoggedIn(response.user);
            showNotification('Login successful! Welcome back.', 'success');
            clearFormFields('loginEmail', 'loginPassword');
            clearValidationClasses('loginEmail', 'loginPassword');
            
            // Determine correct path based on current location
            const isInPagesFolder = window.location.pathname.includes('Pages/');
            window.location.href = isInPagesFolder ? `profile.html?cwid=${response.user.cwid}` : `Pages/profile.html?cwid=${response.user.cwid}`;
        }
    } catch (error) {
        console.error('Login failed:', error);
        showFormError('login', error.message || 'Login failed. Please try again.');
    }
}

// Handle signup form submission
async function handleSignupSubmit(e) {
    e.preventDefault();
    hideFormError('signup');
    
    console.log('Signup form submitted');
    console.log('apiService available:', typeof apiService);
    
    const firstName = document.getElementById('signupFirstName').value;
    const lastName = document.getElementById('signupLastName').value;
    const email = document.getElementById('signupEmail').value;
    const cwid = document.getElementById('signupCWID').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    // Validation
    if (!firstName || !lastName || !email || !cwid || !password || !confirmPassword) {
        showFormError('signup', 'Please fill in all required fields.');
        return;
    }
    
    if (cwid.length !== 8) {
        showFormError('signup', 'CWID must be exactly 8 digits.');
        return;
    }
    
    if (password.length < 8) {
        showFormError('signup', 'Password must be at least 8 characters long.');
        return;
    }
    
    if (password !== confirmPassword) {
        showFormError('signup', 'Passwords do not match.');
        return;
    }
    
    try {
        showNotification('Creating account...', 'info');
        const userData = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            cwid: cwid,
            password: password
        };
        
        const response = await apiService.register(userData);
        console.log('Registration response:', response);
        
        if (response && response.user) {
            await setUserLoggedIn(response.user);
            showNotification('Account created successfully! Welcome to MIS SHARE.', 'success');
            clearFormFields('signupFirstName', 'signupLastName', 'signupEmail', 'signupCWID', 'signupPassword', 'signupConfirmPassword');
            clearValidationClasses('signupFirstName', 'signupLastName', 'signupEmail', 'signupCWID', 'signupPassword', 'signupConfirmPassword');
            
            // Determine correct path based on current location
            const isInPagesFolder = window.location.pathname.includes('Pages/');
            window.location.href = isInPagesFolder ? `profile.html?cwid=${response.user.cwid}` : `Pages/profile.html?cwid=${response.user.cwid}`;
        }
    } catch (error) {
        console.error('Registration failed:', error);
        showFormError('signup', error.message || 'Registration failed. Please try again.');
    }
}

// Handle upload form submission
async function handleUploadSubmit(e) {
    e.preventDefault();
    hideFormError('upload');
    
    // Check if user is logged in
    if (!isLoggedIn()) {
        showFormError('upload', 'You must be logged in to upload notes.');
        showNotification('Please log in to upload notes.', 'warning');
        return;
    }
    
    const title = document.getElementById('noteTitle').value;
    const noteClass = document.getElementById('noteClass').value;
    const topic = document.getElementById('noteTopic').value;
    const year = document.getElementById('noteYear').value;
    const content = document.getElementById('noteContent').value;
    
    if (!title || !noteClass || !topic || !year || !content) {
        showFormError('upload', 'Please fill in all required fields.');
        return;
    }
    
    try {
        showNotification('Uploading note...', 'info');
        
        const noteData = {
            title: title,
            class: noteClass,
            topic: topic,
            year: parseInt(year),
            content: content
        };
        
        // Create the note via API
        const response = await apiService.createNote(noteData);
        
        if (response && response.id) {
            showNotification('Note uploaded successfully!', 'success');
            
            // Clear form
            clearFormFields('noteTitle', 'noteClass', 'noteTopic', 'noteYear', 'noteContent');
            clearValidationClasses('noteTitle', 'noteClass', 'noteTopic', 'noteYear', 'noteContent');
            
            // Redirect to the note page
            // Determine correct path based on current location
            const isInPagesFolder = window.location.pathname.includes('Pages/');
            window.location.href = isInPagesFolder ? `note.html?id=${response.id}` : `Pages/note.html?id=${response.id}`;
        }
    } catch (error) {
        console.error('Upload failed:', error);
        showFormError('upload', error.message || 'Upload failed. Please try again.');
    }
}

// Clear form fields
function clearFormFields(...fieldIds) {
    fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
        }
    });
}

// Clear search form fields
function clearSearchForm() {
    clearFormFields('searchTitle', 'searchTopic', 'searchClass', 'searchYear', 'searchAuthor');
}

// Clear validation classes
function clearValidationClasses(...fieldIds) {
    fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('is-valid', 'is-invalid');
        }
    });
}

// ===== PASSWORD TOGGLE FUNCTIONALITY =====

// Setup password toggles
function setupPasswordToggles() {
    // This is handled by the onclick attributes in HTML
}

// Toggle password visibility
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = document.getElementById(fieldId + 'Toggle');
    
    if (field.type === 'password') {
        field.type = 'text';
        toggle.className = 'bi bi-eye-slash';
    } else {
        field.type = 'password';
        toggle.className = 'bi bi-eye';
    }
}


// ===== YEAR DROPDOWN FUNCTIONALITY =====

// Setup year dropdowns
function setupYearDropdowns() {
    console.log('setupYearDropdowns called');
    const yearSelects = document.querySelectorAll('#noteYear, #searchYear');
    console.log('Found year selects:', yearSelects.length);
    yearSelects.forEach(yearSelect => {
        if (yearSelect) {
            console.log('Populating year dropdown:', yearSelect.id);
            generateYearOptions(yearSelect);
        }
    });
}

// Generate year options
function generateYearOptions(yearSelect) {
    if (!yearSelect) {
        console.log('generateYearOptions: yearSelect is null');
        return;
    }
    
    const currentYear = new Date().getFullYear();
    console.log('generateYearOptions: generating years from', currentYear, 'to 2018');
    
    // Clear existing options except the first one (placeholder)
    while (yearSelect.children.length > 1) {
        yearSelect.removeChild(yearSelect.lastChild);
    }
    
    for (let year = currentYear; year >= 2018; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    console.log('generateYearOptions: added', (currentYear - 2018 + 1), 'year options');
}


// ===== DRAFT FUNCTIONALITY =====

// Save draft (removed - no longer using localStorage)
function saveDraft() {
    showNotification('Draft functionality has been removed. Please save your work manually.', 'info');
}

// Load draft (removed - no longer using localStorage)
function loadDraft() {
    showNotification('Draft functionality has been removed.', 'info');
}

// ===== AUTHENTICATION FUNCTIONALITY =====

// Setup authentication
function setupAuthentication() {
    checkAuthenticationStatus();
    setupAuthRedirects();
    setupLogout();
    setupAuthTabs();
}

// Check if user is logged in
function isLoggedIn() {
    const apiService = window.apiService;
    
    if (!apiService) {
        return false;
    }
    
    // Check if API service is initialized and has a valid token
    const hasToken = apiService.token !== null && apiService.token !== undefined;
    const isInitialized = apiService.isInitialized;
    
    return hasToken && isInitialized;
}

// User data storage system
function initializeUserStorage() {
    if (!window.misShareUserStorage) {
        window.misShareUserStorage = {};
    }
}

function saveUserData(userData) {
    initializeUserStorage();
    
    // Try sessionStorage first
    try {
        if (userData) {
            sessionStorage.setItem('misShareUser', JSON.stringify(userData));
        } else {
            sessionStorage.removeItem('misShareUser');
        }
    } catch (error) {
        // Continue to next method
    }
    
    // Try sessionStorage as fallback
    try {
        if (userData) {
            sessionStorage.setItem('misShareUser', JSON.stringify(userData));
        } else {
            sessionStorage.removeItem('misShareUser');
        }
    } catch (error) {
        // Continue to next method
    }
    
    // Use in-memory storage as last resort
    if (userData) {
        window.misShareUserStorage.user = userData;
    } else {
        delete window.misShareUserStorage.user;
    }
}

function loadUserData() {
    initializeUserStorage();
    
    // Try sessionStorage
    try {
        const storedUser = sessionStorage.getItem('misShareUser');
        if (storedUser) {
            return JSON.parse(storedUser);
        }
    } catch (error) {
        // Continue to next method
    }
    
    // Use in-memory storage as last resort
    return window.misShareUserStorage.user || null;
}

// Get current user info
async function getCurrentUser() {
    const loggedIn = isLoggedIn();
    
    if (!loggedIn) {
        return null;
    }
    
    // First try to get from storage
    const storedUser = loadUserData();
    if (storedUser) {
        return storedUser;
    }
    
    // Fallback to API call
    try {
        const user = await apiService.getCurrentUser();
        if (user) {
            saveUserData(user);
        }
        return user;
    } catch (error) {
        console.error('Failed to get current user:', error);
        return null;
    }
}

// Set user as logged in
async function setUserLoggedIn(userData) {
    // Store user data using the new storage system
    saveUserData(userData);
    await updateNavigation();
}

// Log user out
async function logoutUser() {
    try {
        // Clear authentication data
        await apiService.logout();
        saveUserData(null); // Clear user data from all storage methods
        
        // Update navigation to reflect logged out state
        await updateNavigation();
        
        // Show notification
        showNotification('You have been logged out successfully.', 'info');
        
        // Redirect to login page after a short delay (only if not already on login page)
        setTimeout(() => {
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html')) {
                const isInPagesFolder = currentPath.includes('Pages/');
                window.location.href = isInPagesFolder ? 'login.html' : 'Pages/login.html';
            }
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, clear local data and redirect (only if not already on login page)
        saveUserData(null);
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login.html')) {
            const isInPagesFolder = currentPath.includes('Pages/');
            window.location.href = isInPagesFolder ? 'login.html' : 'Pages/login.html';
        }
    }
}

// Initialize authentication state
async function initializeAuthState() {
    try {
        // Check session storage directly first
        const sessionToken = sessionStorage.getItem('misShareToken');
        const sessionUser = sessionStorage.getItem('misShareUser');
        
        // Wait for API service to be available and initialized
        if (window.apiService) {
            // Since API service now initializes synchronously, just check if it's ready
            if (!window.apiService.isInitialized) {
                console.warn('API service not initialized, skipping auth state initialization');
                return;
            }
            
            // Try to refresh token from storage
            window.apiService.refreshTokenFromStorage();
            
            // Check if we have a stored token and user data
            const storedToken = window.apiService.token;
            const storedUser = loadUserData();
            
            if (storedToken && storedUser) {
                // Token is already loaded and validated by API service
                await updateUserInfo();
            } else {
                // Clear any invalid data
                window.apiService.clearToken();
                saveUserData(null);
            }
            
            // Update navigation after authentication state is determined
            await updateNavigation();
        }
    } catch (error) {
        console.error('Failed to initialize auth state:', error);
    }
}

// Check authentication status and update UI
async function checkAuthenticationStatus() {
    await updateNavigation();
    await updateUserInfo();
}


// Update navigation based on login status
async function updateNavigation() {
    const userLoggedIn = isLoggedIn();
    
    const profileNavItem = document.getElementById('profileNavItem');
    const loginNavItem = document.getElementById('loginNavItem');
    const logoutNavItem = document.getElementById('logoutNavItem');
    const getStartedBtn = document.getElementById('getStartedBtn');

    if (profileNavItem) {
        profileNavItem.style.display = userLoggedIn ? 'block' : 'none';
        
        // Update profile link with CWID if user is logged in
        if (userLoggedIn) {
            const user = await getCurrentUser();
            if (user) {
                const profileLink = profileNavItem.querySelector('a');
                if (profileLink) {
                    const isInPagesFolder = window.location.pathname.includes('Pages/');
                    profileLink.href = isInPagesFolder ? `profile.html?cwid=${user.cwid}` : `Pages/profile.html?cwid=${user.cwid}`;
                }
            }
        }
    }
    if (loginNavItem) {
        loginNavItem.style.display = userLoggedIn ? 'none' : 'block';
    }
    if (logoutNavItem) {
        logoutNavItem.style.display = userLoggedIn ? 'block' : 'none';
    }
    if (getStartedBtn) {
        if (userLoggedIn) {
            getStartedBtn.innerHTML = '<i class="bi bi-upload me-2"></i>Upload Notes';
            getStartedBtn.href = 'upload.html';
        } else {
            getStartedBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Get Started';
            getStartedBtn.href = 'login.html';
        }
    }
    
    // Update main page content if we're on the main page
    const currentPage = getCurrentPage();
    if (currentPage === 'main') {
        await updateMainPageContent();
    }
}

// Update user info in forms
async function updateUserInfo() {
    // No longer needed since we removed the author field
}

// Setup authentication redirects
function setupAuthRedirects() {
    const uploadNavLink = document.getElementById('uploadNavLink');
    if (uploadNavLink) {
        uploadNavLink.addEventListener('click', function(e) {
            const loggedIn = isLoggedIn();
            if (!loggedIn) {
                e.preventDefault();
                showNotification('Please log in to upload notes.', 'warning');
                // Navigate to login page (only if not already on login page)
                const currentPath = window.location.pathname;
                if (!currentPath.includes('login.html')) {
                    const isInPagesFolder = currentPath.includes('Pages/');
                    window.location.href = isInPagesFolder ? 'login.html' : 'Pages/login.html';
                }
            }
        });
    }
}

// Setup logout functionality
function setupLogout() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
        });
    }
}

// Setup authentication tabs
function setupAuthTabs() {
    // Clear signup form when signup tab is activated
    const signupTab = document.querySelector('[data-bs-target="#signup"]');
    if (signupTab) {
        signupTab.addEventListener('shown.bs.tab', function() {
            clearSignupForm();
        });
    }
    
    // Clear login form when login tab is activated (optional)
    const loginTab = document.querySelector('[data-bs-target="#login"]');
    if (loginTab) {
        loginTab.addEventListener('shown.bs.tab', function() {
            clearLoginForm();
        });
    }
}

// Clear signup form
function clearSignupForm() {
    const signupFields = [
        'signupFirstName',
        'signupLastName', 
        'signupEmail',
        'signupCWID',
        'signupPassword',
        'signupConfirmPassword'
    ];
    
    signupFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
            field.classList.remove('is-valid', 'is-invalid');
        }
    });
    
    // Hide any error messages
    hideFormError('signup');
}

// Clear login form
function clearLoginForm() {
    const loginFields = ['loginEmail', 'loginPassword'];
    
    loginFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
            field.classList.remove('is-valid', 'is-invalid');
        }
    });
    
    // Hide any error messages
    hideFormError('login');
}

// ===== DATA CLEARING FUNCTIONALITY =====

// Clear all stored data (removed - no longer using localStorage)
function clearAllData() {
    showNotification('Data clearing functionality has been removed. All data is now stored in the database.', 'info');
    return true;
}


// ===== SCROLL FUNCTIONALITY =====

// Scroll to section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}



// Note page functionality for MIS SHARE

// Initialize note page functionality
function initializeNotePage() {
    setupNoteFunctionality();
}

// ===== NOTE FUNCTIONALITY =====

// Setup note functionality
function setupNoteFunctionality() {
    loadNote();
    setupNoteInteractions();
}

// Load note data
async function loadNote() {
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id');
    
    if (!noteId) {
        showNotification('No note ID provided.', 'danger');
        return;
    }
    
    try {
        const note = await apiService.getNote(noteId);
        if (note) {
            await displayNote(note);
            await loadRelatedNotes(note);
        } else {
            showNotification('Note not found.', 'danger');
        }
    } catch (error) {
        console.error('Failed to load note:', error);
        showNotification('Failed to load note.', 'danger');
    }
}

// Display note information
async function displayNote(note) {
    // Store author CWID for profile navigation
    window.currentNoteAuthorCwid = note.authorId;
    window.currentNote = note; // Store current note for editing
    
    // Update note header
    const noteTitle = document.getElementById('noteTitle');
    const noteTopic = document.getElementById('noteTopic');
    const noteClass = document.getElementById('noteClass');
    const noteYear = document.getElementById('noteYear');
    const noteAuthor = document.getElementById('noteAuthor');
    const noteDate = document.getElementById('noteDate');
    const noteContent = document.getElementById('noteContent');
    
    if (noteTitle) noteTitle.textContent = note.title || 'Untitled';
    if (noteTopic) noteTopic.textContent = note.topic || 'General';
    if (noteClass) noteClass.textContent = note.class || 'MIS';
    if (noteYear) {
        // Hide year badge initially, show after API call completes
        noteYear.style.display = 'none';
        // Handle multiple years by taking only the first one
        const year = note.year || 'N/A';
        const firstYear = year.toString().split(/[,\s]+/)[0];
        noteYear.textContent = firstYear;
        // Show the year badge after setting the content
        noteYear.style.display = 'inline-block';
    }
    if (noteAuthor) noteAuthor.textContent = note.authorName || 'Unknown';
    if (noteDate) noteDate.textContent = `Posted on ${formatDate(note.createdAt)}`;
    if (noteContent) {
        // Display note content with proper formatting
        const content = note.content || 'No content available';
        noteContent.innerHTML = content.replace(/\n/g, '<br>');
    }
    
    // Update author info in sidebar
    const authorName = document.getElementById('authorName');
    const viewProfileBtn = document.getElementById('viewProfileBtn');
    
    if (authorName) authorName.textContent = note.authorName || 'Unknown';
    if (viewProfileBtn) viewProfileBtn.textContent = 'View Profile';
    
    // Show edit button if user owns this note
    const editButtonContainer = document.getElementById('editButtonContainer');
    const currentUser = await getCurrentUser();
    
    if (editButtonContainer && currentUser && currentUser.cwid === note.authorId) {
        editButtonContainer.style.display = 'block';
    } else if (editButtonContainer) {
        editButtonContainer.style.display = 'none';
    }
}



// Setup note interactions
function setupNoteInteractions() {
    // Setup view profile button
    const viewProfileBtn = document.getElementById('viewProfileBtn');
    if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', handleViewProfile);
    }
    
    // Setup edit note button
    const editNoteBtn = document.getElementById('editNoteBtn');
    if (editNoteBtn) {
        editNoteBtn.addEventListener('click', handleEditNote);
    }
    
    // Setup save note button
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', handleSaveNote);
    }
}



// Handle view profile button click
function handleViewProfile() {
    const authorCwid = window.currentNoteAuthorCwid;
    if (authorCwid) {
        const isInPagesFolder = window.location.pathname.includes('Pages/');
        window.location.href = isInPagesFolder ? `profile.html?cwid=${authorCwid}` : `Pages/profile.html?cwid=${authorCwid}`;
    } else {
        showNotification('Author information not available.', 'warning');
    }
}

// Handle edit note button click
function handleEditNote() {
    if (!window.currentNote) {
        showNotification('No note data available.', 'danger');
        return;
    }
    
    // Populate the edit form with current note data
    const editTitle = document.getElementById('editNoteTitle');
    const editContent = document.getElementById('editNoteContent');
    
    if (editTitle) editTitle.value = window.currentNote.title || '';
    if (editContent) editContent.value = window.currentNote.content || '';
    
    // Show the modal
    const editModal = new bootstrap.Modal(document.getElementById('editNoteModal'));
    editModal.show();
}

// Handle save note button click
async function handleSaveNote() {
    if (!window.currentNote) {
        showNotification('No note data available.', 'danger');
        return;
    }
    
    const editTitle = document.getElementById('editNoteTitle');
    const editContent = document.getElementById('editNoteContent');
    
    if (!editTitle || !editContent) {
        showNotification('Form fields not found.', 'danger');
        return;
    }
    
    const title = editTitle.value.trim();
    const content = editContent.value.trim();
    
    if (!title || !content) {
        showNotification('Title and content are required.', 'danger');
        return;
    }
    
    try {
        // Show loading state
        const saveBtn = document.getElementById('saveNoteBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Saving...';
        saveBtn.disabled = true;
        
        // Update the note
        const updatedNote = await apiService.updateNote(window.currentNote.id, {
            title: title,
            content: content
        });
        
        if (updatedNote) {
            // Update the displayed note
            window.currentNote = updatedNote;
            displayNote(updatedNote);
            
            // Hide the modal
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editNoteModal'));
            if (editModal) {
                editModal.hide();
            }
            
            showNotification('Note updated successfully!', 'success');
        }
    } catch (error) {
        console.error('Failed to update note:', error);
        showNotification('Failed to update note. Please try again.', 'danger');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('saveNoteBtn');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Load related notes from the same topic
async function loadRelatedNotes(note) {
    try {
        // Get notes with same topic, excluding the current note
        const searchParams = {
            topic: note.topic,
            pageSize: 6 // Get 6 to account for potentially excluding the current note
        };
        
        const relatedNotes = await apiService.getNotes(searchParams);
        // Filter out the current note and limit to 5
        const filteredNotes = relatedNotes?.filter(n => n.id !== note.id).slice(0, 5) || [];
        displayRelatedNotes(filteredNotes);
    } catch (error) {
        console.error('Failed to load related notes:', error);
        displayRelatedNotes([]);
    }
}

// Display related notes
function displayRelatedNotes(notes) {
    const relatedNotesContent = document.getElementById('relatedNotesContent');
    if (!relatedNotesContent) return;
    
    if (notes.length === 0) {
        relatedNotesContent.innerHTML = `
            <i class="bi bi-journal display-6"></i>
            <p class="mt-2">No related notes found</p>
        `;
        return;
    }
    
    relatedNotesContent.innerHTML = '';
    
    notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'border-bottom pb-2 mb-2';
        noteElement.innerHTML = `
            <h6 class="mb-1">
                <a href="note.html?id=${note.id}" class="text-decoration-none">${escapeHtml(note.title)}</a>
            </h6>
            <small class="text-muted">By ${escapeHtml(note.authorName)} • ${formatDate(note.createdAt)}</small>
        `;
        relatedNotesContent.appendChild(noteElement);
    });
}



// ===== PAGE LOADING STATE =====

// Verify authentication status before page rendering
async function verifyAuthenticationStatus() {
    try {
        // Check if API service is available
        if (!window.apiService) {
            console.log('API service not available yet, waiting...');
            return;
        }
        
        // Since API service now initializes synchronously, just check if it's ready
        if (!window.apiService.isInitialized) {
            console.log('API service not initialized yet, skipping verification');
            return;
        }
        
        // Check if there's a stored token
        const storedToken = window.apiService.token;
        const storedUser = loadUserData();
        
        if (storedToken && storedUser) {
            try {
                // Validate token with server
                const isValid = await window.apiService.validateToken();
                if (isValid) {
                } else {
                    window.apiService.clearToken();
                    saveUserData(null);
                }
            } catch (error) {
                console.error('Token validation error:', error);
                // On validation error, clear authentication to be safe
                window.apiService.clearToken();
                saveUserData(null);
            }
        } else {
            console.log('No stored authentication found');
        }
    } catch (error) {
        console.error('Error verifying authentication status:', error);
        // Clear any potentially invalid data
        if (window.apiService) {
            window.apiService.clearToken();
        }
        saveUserData(null);
    }
}

// ===== UTILITY FUNCTIONS =====


// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}




// Profile page functionality for MIS SHARE

// Initialize profile page functionality
function initializeProfilePage() {
    // Hide all profile content initially
    hideAllProfileContent();
    setupProfileFunctionality();
}

// ===== PROFILE FUNCTIONALITY =====

// Hide all profile content initially (including header)
function hideAllProfileContent() {
    const profileContent = document.querySelector('.profile-content');
    if (profileContent) {
        profileContent.classList.remove('ready');
    }
}



// Hide profile content initially (tabs only)
function hideProfileContent() {
    const profileTabs = document.getElementById('profileTabs');
    const profileTabContent = document.getElementById('profileTabContent');
    
    if (profileTabs) profileTabs.style.display = 'none';
    if (profileTabContent) profileTabContent.style.display = 'none';
}

// Show profile content after authentication
function showProfileContent() {
    // Show tabs and notes section
    const profileTabs = document.getElementById('profileTabs');
    const profileTabContent = document.getElementById('profileTabContent');
    
    if (profileTabs) {
        profileTabs.style.display = 'flex';
    }
    
    if (profileTabContent) {
        profileTabContent.style.display = 'block';
    }
    
    // Show profile content
    const profileContent = document.querySelector('.profile-content');
    if (profileContent) {
        profileContent.classList.add('ready');
    }
}

// Setup profile functionality
function setupProfileFunctionality() {
    loadUserProfile();
    setupProfileTabs();
    setupEditProfileModal();
    setupChangePasswordModal();
}

// Load user profile data
async function loadUserProfile() {
    try {
        // Check if API service is available and initialized
        if (!window.apiService) {
            throw new Error('API service not available');
        }
        
        if (!window.apiService.isInitialized) {
            window.apiService.initializeSync();
        }
        
        const user = await getCurrentUser();
        
        // Get the profile owner from URL parameter or default to current user
        const urlParams = new URLSearchParams(window.location.search);
        const profileOwnerCwid = urlParams.get('cwid');
        
        if (profileOwnerCwid) {
            // Check if viewing own profile or someone else's profile
            const isOwnProfile = user && user.cwid.toString() === profileOwnerCwid;
            await loadProfileData(profileOwnerCwid, isOwnProfile);
        } else if (user) {
            // Viewing own profile - redirect to URL with CWID
            const currentUrl = new URL(window.location);
            if (!currentUrl.searchParams.has('cwid')) {
                currentUrl.searchParams.set('cwid', user.cwid);
                window.history.replaceState({}, '', currentUrl);
            }
            await loadProfileData(user.cwid, true); // true = own profile
        } else {
            // No user logged in and no profile specified
            showNotification('Please specify a profile to view or log in to view your own profile.', 'info');
            showProfileContent(); // Show content even if no user to display error state
        }
        
        // Update navigation to show correct login/logout state
        if (typeof updateNavigation === 'function') {
            await updateNavigation();
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showNotification('Failed to load profile data.', 'danger');
        showProfileContent(); // Show content even on error to display error state
    }
}

// Load profile data for a specific user
async function loadProfileData(cwid, isOwnProfile) {
    try {
        
        // Get the profile owner's data
        const profileOwner = await apiService.getUser(cwid);
        if (!profileOwner) {
            showNotification('Profile not found.', 'danger');
            showProfileContent(); // Show content to display error state
            return;
        }
        
        // Display the profile owner's information
        displayUserProfile(profileOwner);
        
        // Control change password button visibility based on profile ownership
        toggleChangePasswordButton(isOwnProfile);
        
        // Load the profile owner's notes
        await loadUserNotes(cwid);
        
        // Hide the bookmarks tab since we removed bookmark functionality
        hideBookmarksTab();
        
        // Show all content only after all API calls are complete
        showProfileContent();
        
    } catch (error) {
        console.error('Failed to load profile data:', error);
        showNotification('Failed to load profile data.', 'danger');
        showProfileContent(); // Show content even on error to display error state
    }
}

// Hide bookmarks tab when viewing someone else's profile
function hideBookmarksTab() {
    const bookmarksTab = document.querySelector('[data-bs-target="#bookmarks"]');
    if (bookmarksTab) {
        bookmarksTab.style.display = 'none';
    }
    
    const bookmarksPane = document.getElementById('bookmarks');
    if (bookmarksPane) {
        bookmarksPane.style.display = 'none';
    }
}

// Show/hide Edit Profile button (removed)
function toggleEditProfileButton(isOwnProfile) {
    // Edit profile functionality has been removed
}

// Show/hide Change Password button based on profile ownership
function toggleChangePasswordButton(isOwnProfile) {
    const changePasswordContainer = document.getElementById('changePasswordContainer');
    if (changePasswordContainer) {
        if (isOwnProfile) {
            changePasswordContainer.style.display = 'block';
        } else {
            changePasswordContainer.style.display = 'none';
        }
    }
}

// Display user profile information
function displayUserProfile(user) {
    const userName = document.getElementById('userName');
    const userBio = document.getElementById('userBio');
    const userInitials = document.getElementById('userInitials');
    const profileSpinner = document.getElementById('profileSpinner');
    
    // Remove loading spinner
    if (profileSpinner) {
        profileSpinner.remove();
    }
    
    // Show the user name container
    const userNameContainer = document.getElementById('userNameContainer');
    if (userNameContainer) {
        userNameContainer.style.display = 'block';
    }
    
    if (userName) {
        userName.innerHTML = `${user.firstName} ${user.lastName}`;
    }
    
    if (userInitials) {
        const firstInitial = user.firstName ? user.firstName.charAt(0).toUpperCase() : '';
        const lastInitial = user.lastName ? user.lastName.charAt(0).toUpperCase() : '';
        userInitials.textContent = `${firstInitial}${lastInitial}`;
    }
    
    if (userBio) {
        userBio.textContent = 'Welcome to my profile!'; // Default bio since bio property was removed
    }
    
    // Don't show content here - wait for all API calls to complete
}

// Load user's notes
async function loadUserNotes(userId) {
    try {
        console.log('Loading user notes for userId:', userId);
        console.log('API service available:', !!window.apiService);
        console.log('API service token:', !!window.apiService?.token);
        
        const notes = await apiService.getUserNotes(userId);
        console.log('User notes loaded:', notes);
        
        displayUserNotes(notes || []);
        updateNotesCount(notes?.length || 0);
    } catch (error) {
        console.error('Failed to load user notes:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            userId: userId
        });
        displayUserNotes([]);
    }
}

// Display user's notes
function displayUserNotes(notes) {
    const myNotesGrid = document.getElementById('myNotesGrid');
    if (!myNotesGrid) return;
    
    myNotesGrid.innerHTML = '';
    
    if (notes.length === 0) {
        myNotesGrid.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-journal-plus display-1 text-muted mb-3"></i>
                    <h4 class="text-muted">No notes uploaded yet</h4>
                    <p class="text-muted">Start sharing your knowledge by uploading your first note!</p>
                    <a href="upload.html" class="btn btn-primary">
                        <i class="bi bi-upload me-2"></i>Upload First Note
                    </a>
                </div>
            </div>
        `;
        return;
    }
    
    notes.forEach(note => {
        const noteCard = createNoteCard(note, true); // Show delete button for profile page
        myNotesGrid.appendChild(noteCard);
    });
}



// Setup profile tabs
function setupProfileTabs() {
    // No special tab handling needed since we removed bookmarks
}

// Setup edit profile modal (removed)
function setupEditProfileModal() {
    // Edit profile functionality has been removed
}

// Handle profile update (removed)
async function handleProfileUpdate() {
    // Edit profile functionality has been removed
    showNotification('Profile editing has been disabled.', 'info');
}

// Setup change password modal
function setupChangePasswordModal() {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handleChangePasswordClick);
    }
    
    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', handleSavePassword);
    }
}

// Handle change password button click
function handleChangePasswordClick() {
    // Clear the form
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (currentPassword) currentPassword.value = '';
    if (newPassword) newPassword.value = '';
    if (confirmPassword) confirmPassword.value = '';
    
    // Show the modal
    const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    changePasswordModal.show();
}

// Handle save password button click
async function handleSavePassword() {
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Form fields not found.', 'danger');
        return;
    }
    
    const currentPwd = currentPassword.value.trim();
    const newPwd = newPassword.value.trim();
    const confirmPwd = confirmPassword.value.trim();
    
    // Validation
    if (!currentPwd || !newPwd || !confirmPwd) {
        showNotification('All fields are required.', 'danger');
        return;
    }
    
    if (newPwd.length < 6) {
        showNotification('New password must be at least 6 characters long.', 'danger');
        return;
    }
    
    if (newPwd !== confirmPwd) {
        showNotification('New passwords do not match.', 'danger');
        return;
    }
    
    try {
        // Show loading state
        const saveBtn = document.getElementById('savePasswordBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Changing...';
        saveBtn.disabled = true;
        
        // Change password
        await apiService.changePassword({
            currentPassword: currentPwd,
            newPassword: newPwd
        });
        
        // Hide the modal
        const changePasswordModal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
        if (changePasswordModal) {
            changePasswordModal.hide();
        }
        
        showNotification('Password changed successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to change password:', error);
        const errorMessage = error.message || 'Failed to change password. Please try again.';
        showNotification(errorMessage, 'danger');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('savePasswordBtn');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Delete note
async function deleteNote(noteId) {
    const loggedIn = isLoggedIn();
    if (!loggedIn) {
        showNotification('Please log in to delete notes.', 'warning');
        // Navigate to login page (only if not already on login page)
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login.html')) {
            const isInPagesFolder = currentPath.includes('Pages/');
            window.location.href = isInPagesFolder ? 'login.html' : 'Pages/login.html';
        }
        return;
    }
    
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
    }
    
    try {
        await apiService.deleteNote(noteId);
        showNotification('Note deleted successfully!', 'success');
        loadUserProfile(); // Reload to refresh the list
    } catch (error) {
        console.error('Failed to delete note:', error);
        showNotification('Failed to delete note.', 'danger');
    }
}


// Update notes count
function updateNotesCount(count) {
    const totalNotes = document.getElementById('totalNotes');
    if (totalNotes) {
        totalNotes.textContent = count;
    }
}




// Search page functionality for MIS SHARE

// Initialize search page functionality
function initializeSearchPage() {
    setupSearchFunctionality();
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        setupYearDropdowns(); // This populates the year dropdown
    }, 100);
}

// Initialize upload page functionality
function initializeUploadPage() {
    console.log('initializeUploadPage called');
    setupUploadPageContent();
    // Only setup year dropdowns if user is logged in (form is present)
    if (isLoggedIn()) {
        console.log('User is logged in, setting up year dropdowns');
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            setupYearDropdowns(); // This populates the year dropdown
        }, 100);
    } else {
        console.log('User is not logged in, skipping year dropdown setup');
    }
}

// Setup upload page content based on login status
function setupUploadPageContent() {
    console.log('setupUploadPageContent called');
    const uploadForm = document.getElementById('uploadForm');
    const uploadContainer = document.querySelector('.container');
    const loggedIn = isLoggedIn();
    
    console.log('User logged in:', loggedIn);
    console.log('Upload form found:', !!uploadForm);
    console.log('Upload container found:', !!uploadContainer);
    
    if (!loggedIn) {
        console.log('User not logged in, showing login prompt');
        // Show login prompt instead of form
        if (uploadContainer) {
            uploadContainer.innerHTML = `
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6">
                        <div class="card shadow">
                            <div class="card-body p-5 text-center">
                                <i class="bi bi-lock display-1 text-muted mb-4"></i>
                                <h2 class="h3 mb-3">Login Required</h2>
                                <p class="text-muted mb-4">You need to be logged in to upload notes.</p>
                                <a href="login.html" class="btn btn-primary btn-lg">
                                    <i class="bi bi-box-arrow-in-right me-2"></i>Go to Login
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        console.log('User is logged in, keeping upload form');
    }
}

// Initialize login page functionality
function initializeLoginPage() {
    // Login page doesn't need special initialization beyond what's already done
    // The form validation is already handled in the main initialization
}

// Initialize main page functionality
function initializeMainPage() {
    setupMainPageContent();
}

// Setup main page content based on login status
function setupMainPageContent() {
    // Don't immediately update content - let the global auth state handle it
    // The content will be updated by updateNavigation() which calls updateMainPageContent()
}

// Update main page content based on login status
async function updateMainPageContent() {
    const userLoggedIn = isLoggedIn();
    const heroDescription = document.getElementById('heroDescription');
    const heroIcon = document.getElementById('heroIcon');
    const dynamicContent = document.getElementById('dynamicContent');
    
    
    if (userLoggedIn) {
        // User is logged in - show personalized content
        if (heroDescription) {
            heroDescription.textContent = 'Welcome back! Continue sharing and discovering study notes with fellow MIS students.';
        }
        
        if (heroIcon) {
            heroIcon.className = 'bi bi-person-check display-1 text-white opacity-75';
        }
        
        if (dynamicContent) {
            const user = await getCurrentUser();
            const userName = user ? user.firstName : 'User';
            
            dynamicContent.innerHTML = `
                <div class="container">
                    <div class="row text-center mb-5">
                        <div class="col-12">
                            <h2 class="h3 mb-3">Welcome back, ${userName}!</h2>
                            <p class="text-muted">Here's what you can do today</p>
                        </div>
                    </div>
                    <div class="row g-4">
                        <div class="col-md-4">
                            <div class="card h-100 shadow-sm">
                                <div class="card-body text-center">
                                    <div class="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
                                        <i class="bi bi-upload text-white fs-2"></i>
                                    </div>
                                    <h5 class="card-title">Upload Notes</h5>
                                    <p class="card-text text-muted">Share your study materials with the community.</p>
                                    <a href="upload.html" class="btn btn-primary">Upload Now</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 shadow-sm">
                                <div class="card-body text-center">
                                    <div class="bg-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
                                        <i class="bi bi-search text-white fs-2"></i>
                                    </div>
                                    <h5 class="card-title">Search Notes</h5>
                                    <p class="card-text text-muted">Find notes by topic, class, or author.</p>
                                    <a href="search.html" class="btn btn-success">Search Now</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 shadow-sm">
                                <div class="card-body text-center">
                                    <div class="bg-info rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
                                        <i class="bi bi-person text-white fs-2"></i>
                                    </div>
                                    <h5 class="card-title">My Profile</h5>
                                    <p class="card-text text-muted">View your notes, bookmarks, and activity.</p>
                                    <a href="profile.html" class="btn btn-info">View Profile</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        // User is not logged in - show general content
        if (heroDescription) {
            heroDescription.textContent = 'Share and discover study notes with fellow MIS students at the University of Alabama.';
        }
        
        if (heroIcon) {
            heroIcon.className = 'bi bi-journal-text display-1 text-white opacity-75';
        }
        
        if (dynamicContent) {
            dynamicContent.innerHTML = `
                <div class="container">
                    <div class="row text-center mb-5">
                        <div class="col-12">
                            <h2 class="h3 mb-3">How It Works</h2>
                        </div>
                    </div>
                    <div class="row g-4">
                        <div class="col-md-4">
                            <div class="text-center">
                                <div class="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
                                    <i class="bi bi-upload text-white fs-2"></i>
                                </div>
                                <h5>Upload Notes</h5>
                                <p class="text-muted">Share your study materials with the community.</p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center">
                                <div class="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
                                    <i class="bi bi-search text-white fs-2"></i>
                                </div>
                                <h5>Search & Discover</h5>
                                <p class="text-muted">Find notes by topic, class, or author.</p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center">
                                <div class="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
                                    <i class="bi bi-people text-white fs-2"></i>
                                </div>
                                <h5>Connect & Learn</h5>
                                <p class="text-muted">Learn from your peers and help others succeed.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// ===== SEARCH FUNCTIONALITY =====

// Setup search functionality
function setupSearchFunctionality() {
    const searchForm = document.getElementById('searchForm');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchSubmit);
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearchSubmit);
    }
    
    // Add Enter key support to all search input fields
    const searchInputs = [
        'searchTitle',
        'searchTopic', 
        'searchClass',
        'searchYear',
        'searchAuthor'
    ];
    
    searchInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit(e);
                }
            });
        }
    });
}

// Handle search form submission
async function handleSearchSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('searchTitle')?.value || '';
    const topic = document.getElementById('searchTopic')?.value || '';
    const noteClass = document.getElementById('searchClass')?.value || '';
    const year = document.getElementById('searchYear')?.value || '';
    const author = document.getElementById('searchAuthor')?.value || '';
    
    const searchParams = {};
    if (title) searchParams.title = title;
    if (topic) searchParams.topic = topic;
    if (noteClass) searchParams.class = noteClass;
    if (year) searchParams.year = year;
    if (author) searchParams.author = author;
    
    try {
        // Show loading state
        showSearchLoading();
        
        const notes = await apiService.getNotes(searchParams);
        
        displaySearchResults(notes || []);
    } catch (error) {
        console.error('Search failed:', error);
        showNotification('Search failed. Please try again.', 'danger');
        displaySearchResults([]);
    }
}

// Show loading state for search
function showSearchLoading() {
    const searchResults = document.querySelector('.search-results');
    const notesGrid = document.getElementById('notesGrid');
    const resultCount = document.getElementById('resultCount');
    
    // Show search results section
    if (searchResults) {
        searchResults.classList.add('ready');
    }
    
    if (notesGrid) {
        notesGrid.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <h4 class="text-muted">Searching...</h4>
                    <p class="text-muted">Please wait while we find your notes.</p>
                </div>
            </div>
        `;
    }
    
    if (resultCount) {
        resultCount.textContent = 'Searching...';
    }
}

// Display search results
function displaySearchResults(notes) {
    const notesGrid = document.getElementById('notesGrid');
    const resultCount = document.getElementById('resultCount');
    
    if (!notesGrid) return;
    
    // Update result count
    if (resultCount) {
        resultCount.textContent = notes.length;
    }
    
    // Clear existing results
    notesGrid.innerHTML = '';
    
    if (notes.length === 0) {
        // Show empty state without clearing search form
        notesGrid.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-search display-1 text-muted mb-3"></i>
                    <h4 class="text-muted">No notes found</h4>
                    <p class="text-muted">Try adjusting your search criteria.</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Display notes
    notes.forEach(note => {
        const noteCard = createNoteCard(note);
        notesGrid.appendChild(noteCard);
    });
}

// Create note card element
function createNoteCard(note, showDeleteButton = false) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    const card = document.createElement('div');
    card.className = 'card h-100 shadow-sm';
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body d-flex flex-column';
    
    cardBody.innerHTML = `
        <h5 class="card-title">${escapeHtml(note.title || 'Untitled')}</h5>
        <p class="card-text text-muted small flex-grow-1">${escapeHtml(note.content?.substring(0, 100) || 'No content available')}${note.content?.length > 100 ? '...' : ''}</p>
        <div class="mb-2">
            <span class="badge bg-primary me-1">${escapeHtml(note.topic || 'General')}</span>
            <span class="badge bg-secondary me-1">${escapeHtml(note.class || 'MIS')}</span>
            <span class="badge bg-info">${(note.year || 'N/A').toString().split(/[,\s]+/)[0]}</span>
        </div>
        <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">By ${escapeHtml(note.authorName || 'Unknown')}</small>
            <small class="text-muted">${formatDate(note.createdAt)}</small>
        </div>
    `;
    
    const cardFooter = document.createElement('div');
    cardFooter.className = 'card-footer bg-transparent';
    
    if (showDeleteButton) {
        cardFooter.innerHTML = `
            <div class="d-flex justify-content-between">
                <a href="note.html?id=${note.id}" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-eye me-1"></i>View
                </a>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteNote(${note.id})">
                    <i class="bi bi-trash me-1"></i>Delete
                </button>
            </div>
        `;
    } else {
        cardFooter.innerHTML = `
            <div class="d-flex justify-content-between">
                <a href="note.html?id=${note.id}" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-eye me-1"></i>View
                </a>
            </div>
        `;
    }
    
    card.appendChild(cardBody);
    card.appendChild(cardFooter);
    col.appendChild(card);
    
    return col;
}

