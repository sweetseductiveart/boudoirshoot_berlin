// ============================================
// BOOKING SYSTEM - MAIN SCRIPT
// Google Identity Services (GIS) - NEW AUTH
// ============================================

let currentUser = null;
let allBookings = [];
let impersonatedUserEmail = null;  // For admin debugging

// Session persistence key
const USER_STORAGE_KEY = 'booking_system_user';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeUI();
    initializeGoogleAuth();
    await restoreSessionFromStorage();
});

function initializeUI() {
    // Login button
    document.getElementById('loginButton').addEventListener('click', loginWithGoogle);
    
    // Logout button
    document.getElementById('logoutButton').addEventListener('click', logout);
    
    // New Booking button
    document.getElementById('newBookingButton').addEventListener('click', () => openNewBookingModal());
    
    // Navigation
    const navToggle = document.getElementById('navToggle');
    const mainNav = document.getElementById('mainNav');
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', String(isOpen));
        });
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
            updateURLHash();
            if (mainNav && navToggle && window.innerWidth <= 820) {
                mainNav.classList.remove('is-open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });
    
    // Booking details modal
    document.getElementById('deleteBooking').addEventListener('click', deleteBooking);
    document.getElementById('cancelPartner').addEventListener('click', cancelPartnerBookingFromModal);
    document.getElementById('confirmNewPartner').addEventListener('click', confirmNewPartner);
    
    // New booking modal
    document.getElementById('submitNewBooking').addEventListener('click', submitNewBooking);
    
    // Studio selector
    document.getElementById('studioSelect').addEventListener('change', () => {
        updateStudioView();
        updateURLHash();
    });
    
    // User selector
    document.getElementById('userSelect').addEventListener('change', () => {
        updatePersonalView();
        updateURLHash();
    });
    
    // Admin impersonate selector
    const impersonateSelect = document.getElementById('impersonateSelect');
    if (impersonateSelect) {
        impersonateSelect.addEventListener('change', (e) => {
            setImpersonatedUser(e.target.value || null);
            updatePersonalView();
        });
    }
    
    // Populate selectors
    populateStudioSelector();
    populateUserSelector();
}

function initializeGoogleAuth() {
    // Initialize Google Identity Services (nur für Identity, kein Kalender-Zugriff)
    google.accounts.id.initialize({
        client_id: BOOKING_CONFIG.GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn
    });
    
    console.log('✅ Google Identity Services initialized');
}

// ============================================
// SESSION PERSISTENCE
// ============================================

async function restoreSessionFromStorage() {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    
    if (savedUser) {
        try {
            // Load authorization config from API first
            const configLoaded = await loadAuthorizationConfig();
            if (!configLoaded) {
                clearSessionStorage();
                return false;
            }
            
            const user = JSON.parse(savedUser);
            const authorizedUser = BOOKING_CONFIG.AUTHORIZED_USERS.find(u => normalizeEmail(u.email) === normalizeEmail(user.email));
            
            // Restore user session
            currentUser = {
                ...user,
                name: authorizedUser?.name || user.name
            };
            
            console.log('✅ Session restored from storage:', user.email);
            
            document.getElementById('userName').textContent = currentUser.name;
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('mainInterface').classList.remove('hidden');
            
            // Load bookings
            await loadAllBookings();
            
            // Repopulate user selector now that authorized users are loaded
            populateUserSelector();
            
            // Restore view from URL or use default
            restoreViewFromURL();
            
            return true;
        } catch (error) {
            console.error('❌ Error restoring session:', error);
            clearSessionStorage();
        }
    }
    
    return false;
}

function saveSessionToStorage(user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    console.log('💾 Session saved to storage');
}

function clearSessionStorage() {
    localStorage.removeItem(USER_STORAGE_KEY);
    console.log('🗑️ Session cleared from storage');
}

// ============================================
// AUTHENTICATION WITH GIS
// ============================================

function loginWithGoogle() {
    console.log('📱 Initiating Google Sign-In...');
    google.accounts.id.prompt();
}

async function loadAuthorizationConfig() {
    try {
        console.log('🔐 Loading encrypted authorization config from API...');
        const response = await fetch(`${BOOKING_CONFIG.VERCEL_API_URL}/get-config`);
        
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }
        
        // Store in config
        BOOKING_CONFIG.AUTHORIZED_USERS = data.AUTHORIZED_USERS;
        console.log('✅ Authorization config loaded successfully');
        console.log(`📋 ${BOOKING_CONFIG.AUTHORIZED_USERS.length} authorized users loaded`);
        
        return true;
    } catch (error) {
        console.error('❌ Error loading authorization config:', error);
        showError('loginError', 'Fehler beim Laden der Benutzerkonfiguration. Bitte später erneut versuchen.');
        return false;
    }
}

async function handleGoogleSignIn(response) {
    if (response.error) {
        console.error('❌ Sign-In error:', response.error);
        return;
    }
    
    console.log('✅ Google Sign-In successful');
    
    // Load authorization config from API first
    const configLoaded = await loadAuthorizationConfig();
    if (!configLoaded) return;
    
    // Decode JWT token to get user info
    const payload = parseJwt(response.credential);
    const email = payload.email;
    
    console.log('👤 User logged in:', email);
    
    // Check authorization
    const authorizedUser = BOOKING_CONFIG.AUTHORIZED_USERS.find(u => normalizeEmail(u.email) === normalizeEmail(email));
    
    if (!authorizedUser) {
        showError('loginError', `Ihr Google-Account (${email}) ist nicht autorisiert. Kontaktieren Sie den Administrator.`);
        return;
    }
    
    // Store user
    currentUser = {
        email: email,
        name: authorizedUser?.name || payload.name,
        picture: payload.picture
    };
    
    // Save session
    saveSessionToStorage(currentUser);
    
    // Update UI
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainInterface').classList.remove('hidden');
    
    // Load bookings
    await loadAllBookings();
    
    // Repopulate user selector now that authorized users are loaded
    populateUserSelector();
    
    // Show admin impersonation selector if user is admin
    populateImpersonateSelector();
    
    // Restore view from URL or use default
    restoreViewFromURL();
}

// Helper function to decode JWT
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function logout() {
    currentUser = null;
    allBookings = [];
    impersonatedUserEmail = null;
    
    // Clear from storage
    clearSessionStorage();
    
    document.getElementById('mainInterface').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('userName').textContent = '';
    
    console.log('👋 Logged out');
}

// ============================================
// ADMIN IMPERSONATION (FOR DEBUGGING)
// ============================================

function setImpersonatedUser(userEmail) {
    impersonatedUserEmail = userEmail;
    
    // Update UI to show impersonation status
    const impersonateSelect = document.getElementById('impersonateSelect');
    if (impersonateSelect && userEmail) {
        const user = getAuthorizedUserByEmail(userEmail);
        console.log(`🔍 Admin impersonating: ${user?.name || userEmail}`);
    } else {
        console.log('🔍 Impersonation disabled');
    }
}

function getEffectiveUser() {
    // If admin is impersonating, return the impersonated user
    if (impersonatedUserEmail && isCurrentUserAdmin()) {
        return getAuthorizedUserByEmail(impersonatedUserEmail) || { email: impersonatedUserEmail };
    }
    // Otherwise return the currently logged-in user
    return currentUser;
}

function populateImpersonateSelector() {
    const impersonateSelect = document.getElementById('impersonateSelect');
    if (!impersonateSelect || !isCurrentUserAdmin()) return;
    
    // Only show for admins
    document.getElementById('adminImpersonate').classList.remove('hidden');
    
    // Populate with all authorized users
    const options = BOOKING_CONFIG.AUTHORIZED_USERS
        .map(u => `<option value="${u.email}">${u.name}</option>`)
        .join('');
    
    impersonateSelect.innerHTML = '<option value="">-- Keine Personifikation --</option>' + options;
}

// ============================================
// CALENDAR API FUNCTIONS
// ============================================

async function loadAllBookings() {
    try {
        showLoading(true);
        
        // Format date for API
        const startDateTime = new Date(`${BOOKING_CONFIG.EVENT_DATE}T${BOOKING_CONFIG.EVENT_START_TIME}:00`);
        const endDateTime = new Date(`${BOOKING_CONFIG.EVENT_DATE}T${BOOKING_CONFIG.EVENT_END_TIME}:00`);
        
        const url = `${BOOKING_CONFIG.VERCEL_API_URL}/bookings?` +
            `timeMin=${startDateTime.toISOString()}&` +
            `timeMax=${endDateTime.toISOString()}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        allBookings = data.events || [];
        
        console.log('📅 Bookings loaded:', allBookings.length);
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Error loading bookings:', error);
        showError('mainError', 'Fehler beim Laden der Buchungen. Bitte versuchen Sie es später erneut.');
        showLoading(false);
    }
}

async function deleteBookingByEventId(eventId) {
    if (!currentUser) {
        showError('mainError', 'Sie müssen angemeldet sein.');
        return false;
    }
    
    try {
        showLoading(true);
        
        const url = `${BOOKING_CONFIG.VERCEL_API_URL}/delete-booking`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ eventId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete booking');
        }
        
        console.log('✅ Booking deleted');
        await loadAllBookings();
        updateAllViews();
        showLoading(false);
        closeBookingModal();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error deleting booking:', error);
        showError('mainError', 'Fehler beim Löschen der Buchung.');
        showLoading(false);
        return false;
    }
}

async function updateBookingByEventId(eventId, patch, sendUpdates = 'none') {
    if (!currentUser) {
        showError('mainError', 'Sie müssen angemeldet sein.');
        return false;
    }
    
    try {
        showLoading(true);
        console.log('📡 Sending update request to API');
        console.log('  eventId:', eventId);
        console.log('  sendUpdates:', sendUpdates);
        
        const url = `${BOOKING_CONFIG.VERCEL_API_URL}/update-booking`;
        console.log('  URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ eventId, patch, sendUpdates })
        });
        
        console.log('  Response status:', response.status);
        console.log('  Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('  Error response:', errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ API Response:', data);
        
        console.log('🔄 Reloading bookings...');
        await loadAllBookings();
        console.log('✅ Bookings reloaded');
        
        updateAllViews();
        showLoading(false);
        closeBookingModal();
        
        return true;
    } catch (error) {
        console.error('❌ Error updating booking:', error);
        showError('mainError', `Fehler beim Aktualisieren: ${error.message}`);
        showLoading(false);
        return false;
    }
}

function isBookingPartnerCanceled(props) {
    return props.partnerCanceled === true || props.partnerCanceled === 'true';
}

function getPartnerStatusLabel(props) {
    if (!isBookingPartnerCanceled(props)) return null;
    return props.partnerCanceledByRole === 'creator' ? 'Partner entfernt' : 'Partner storniert';
}

function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
}

function getAuthorizedUserByEmail(email) {
    return BOOKING_CONFIG.AUTHORIZED_USERS.find(u => normalizeEmail(u.email) === normalizeEmail(email));
}

function getCurrentUserRecord() {
    return getAuthorizedUserByEmail(currentUser?.email);
}

function isCurrentUserAdmin() {
    const record = getCurrentUserRecord();
    return record?.isAdmin === true;
}

function getDisplayNameByEmail(email) {
    return getAuthorizedUserByEmail(email)?.name || email || '';
}

function getCreatorEmail(booking, props) {
    return props.userEmail || booking?.creator?.email || booking?.organizer?.email || '';
}

function isCurrentUserPartner(props) {
    if (!currentUser) return false;
    const currentEmail = normalizeEmail(currentUser.email);
    const currentName = getDisplayNameByEmail(currentUser.email) || currentUser.name;
    return normalizeEmail(props.partnerEmail) === currentEmail || props.partner === currentName || props.partner === currentUser.name;
}

function buildPartnerCancelDescription(existingDescription, partnerName, canceledAt, label = 'Partner storniert') {
    const statusLine = `Status: ${label} (${partnerName || 'Partner'}) am ${canceledAt}`;
    const notes = sanitizeNotesDescription(existingDescription);
    if (!notes) {
        return statusLine;
    }
    return `${notes}\n${statusLine}`;
}

function sanitizeNotesDescription(description) {
    if (!description) return '';
    const lines = description.split('\n').map(line => line.trim());
    const cleaned = [];
    lines.forEach(line => {
        if (!line) return;
        if (line.startsWith('Fotograf/in:')) return;
        if (line.startsWith('Partner:')) return;
        if (line.startsWith('Status:')) return;
        if (line.startsWith('Noten:')) {
            const note = line.replace('Noten:', '').trim();
            if (note) cleaned.push(note);
            return;
        }
        cleaned.push(line);
    });
    return cleaned.join('\n');
}

function splitSummary(summary) {
    const parts = (summary || '').split(' - ');
    if (parts.length < 2) {
        return { prefix: '', people: summary || '' };
    }
    const people = parts.pop();
    return { prefix: parts.join(' - '), people };
}

function stripTrailingPartner(peopleLine) {
    if (!peopleLine) return peopleLine;
    return peopleLine.replace(/\s*[&+]\s*[^&+]+$/, '').trim();
}

function setPartnerInSummary(summary, newPartner) {
    if (!summary) return summary;
    const { prefix, people } = splitSummary(summary);
    const creator = stripTrailingPartner(people);
    const finalPeople = newPartner ? `${creator} & ${newPartner}` : creator;
    if (!prefix) return finalPeople;
    return finalPeople ? `${prefix} - ${finalPeople}` : prefix;
}

function getBookingDisplayLabel(booking) {
    const props = booking.extendedProperties?.private || {};
    const creatorEmail = getCreatorEmail(booking, props);
    const creatorName = getDisplayNameByEmail(creatorEmail);
    const partnerName = isBookingPartnerCanceled(props)
        ? ''
        : (getDisplayNameByEmail(props.partnerEmail) || props.partner || '');

    if (creatorName || partnerName) {
        return [creatorName, partnerName].filter(Boolean).join(' & ');
    }

    const displaySummary = isBookingPartnerCanceled(props)
        ? setPartnerInSummary(booking.summary, '')
        : booking.summary;
    return displaySummary.split(' - ').slice(1).join(' - ');
}

async function cancelPartnerBooking(eventId) {
    const booking = allBookings.find(b => b.id === eventId);
    if (!booking) return false;
    
    const props = booking.extendedProperties?.private || {};
    const isPartner = isCurrentUserPartner(props);
    if (!isPartner) {
        showError('mainError', 'Nur der eingetragene Partner kann diese Stornierung ausfuehren.');
        return false;
    }
    
    if (isBookingPartnerCanceled(props)) {
        showError('mainError', 'Diese Buchung wurde bereits vom Partner storniert.');
        return false;
    }
    
    const confirmed = await showConfirmation('Partner stornieren', 'Du stornierst nur deinen Partner-Status. Die Buchung bleibt bestehen. Fortfahren?');
    if (!confirmed) return false;
    
    const canceledAt = new Date().toLocaleString('de-DE');
    const updatedSummary = setPartnerInSummary(booking.summary, '');
    const patch = {
        summary: updatedSummary,
        description: buildPartnerCancelDescription(booking.description, props.partner, canceledAt, 'Partner storniert'),
        extendedProperties: {
            private: {
                ...props,
                partner: '',
                partnerEmail: '',
                partnerCanceled: 'true',
                partnerCanceledByEmail: currentUser.email,
                partnerCanceledByName: currentUser.name,
                partnerCanceledByRole: 'partner',
                partnerCanceledAt: new Date().toISOString()
            }
        }
    };
    
    // Note: sendUpdates 'none' to avoid Domain-Wide Delegation requirement
    // Service account cannot send notifications without additional setup
    const result = await updateBookingByEventId(eventId, patch, 'none');
    
    if (result) {
        await loadAllBookings();  // Refresh bookings list
        updateAllViews();  // Update all views to reflect changes
    }
    return result;
}

async function removePartnerByCreator(eventId) {
    console.log('🔄 removePartnerByCreator called with eventId:', eventId);
    const booking = allBookings.find(b => b.id === eventId);
    if (!booking) {
        console.error('❌ Booking not found:', eventId);
        return false;
    }
    
    const props = booking.extendedProperties?.private || {};
    const isCreator = props.userEmail === currentUser?.email;
    if (!isCreator) {
        showError('mainError', 'Nur der Ersteller kann den Partner entfernen.');
        return false;
    }
    
    if (!props.partner && !props.partnerEmail) {
        showError('mainError', 'Es ist kein Partner hinterlegt.');
        return false;
    }
    
    if (isBookingPartnerCanceled(props)) {
        showError('mainError', 'Der Partner wurde bereits entfernt oder storniert.');
        return false;
    }
    
    const confirmed = await showConfirmation('Partner entfernen', 'Die Buchung bleibt bestehen und der Partner kann neu gesetzt werden.');
    console.log('✅ Confirmation result:', confirmed);
    if (!confirmed) {
        console.log('🛑 User cancelled');
        return false;
    }
    
    const canceledAt = new Date().toLocaleString('de-DE');
    const updatedSummary = setPartnerInSummary(booking.summary, '');
    const patch = {
        summary: updatedSummary,
        description: buildPartnerCancelDescription(booking.description, props.partner, canceledAt, 'Partner entfernt'),
        extendedProperties: {
            private: {
                ...props,
                partner: '',
                partnerEmail: '',
                partnerCanceled: 'true',
                partnerCanceledByEmail: currentUser.email,
                partnerCanceledByName: currentUser.name,
                partnerCanceledByRole: 'creator',
                partnerCanceledAt: new Date().toISOString()
            }
        }
    };
    
    console.log('📤 Sending patch:', patch);
    // Note: sendUpdates 'none' to avoid Domain-Wide Delegation requirement
    // Service account cannot send notifications without additional setup
    const result = await updateBookingByEventId(eventId, patch, 'none');
    console.log('📥 Update result:', result);
    
    if (result) {
        await loadAllBookings();  // Refresh bookings list
        updateAllViews();  // Update all views to reflect changes
    }
    return result;
}

async function cancelPartnerBookingFromModal() {
    const eventId = document.getElementById('cancelPartner').dataset.eventId;
    const booking = allBookings.find(b => b.id === eventId);
    if (!booking) return;
    
    const props = booking.extendedProperties?.private || {};
    const isCreator = props.userEmail === currentUser?.email;
    if (isCreator) {
        await removePartnerByCreator(eventId);
    } else {
        await cancelPartnerBooking(eventId);
    }
}

async function handleBookingAction(action, booking) {
    if (!booking) return;
    
    if (action === 'delete') {
        const confirmed = await showConfirmation('Buchung löschen', 'Soll diese Buchung wirklich gelöscht werden?');
        if (confirmed) {
            await deleteBookingByEventId(booking.id);
        }
        return;
    }
    
    if (action === 'remove-partner') {
        await removePartnerByCreator(booking.id);
        return;
    }
    
    if (action === 'cancel-partner') {
        await cancelPartnerBooking(booking.id);
    }
}

// ============================================
// UI FUNCTIONS
// ============================================

function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
        view.classList.remove('active');
    });
    
    // Remove active state from nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view
    const viewElement = document.getElementById(viewName + 'View');
    if (viewElement) {
        viewElement.classList.add('active');
    }
    
    // Mark nav button as active
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    // Update view content
    if (viewName === 'overview') {
        updateOverviewView();
    } else if (viewName === 'personal') {
        updatePersonalView();
    } else if (viewName === 'studio') {
        updateStudioView();
    } else if (viewName === 'print') {
        updatePrintView();
    }
}

function updateURLHash() {
    // Get current view from active nav button
    const activeBtn = document.querySelector('.nav-btn.active');
    const activeView = activeBtn?.dataset?.view || 'overview';
    
    console.log('🔗 updateURLHash - activeView:', activeView, 'activeBtn:', activeBtn?.textContent);
    
    const params = new URLSearchParams();
    params.set('view', activeView);
    
    // Add studio selection if in studio view
    if (activeView === 'studio') {
        const selectedStudio = document.getElementById('studioSelect')?.value;
        if (selectedStudio) {
            params.set('studio', selectedStudio);
        }
    }
    
    // Add user selection if in personal view
    if (activeView === 'personal') {
        const userSelectElement = document.getElementById('userSelect');
        const selectedUser = userSelectElement?.value;
        console.log('👤 Personal view - userSelect element:', userSelectElement, 'selectedUser:', selectedUser);
        if (selectedUser) {
            params.set('user', selectedUser);
        }
    }
    
    // Update URL hash without triggering page reload
    const newHash = '#' + params.toString();
    console.log('📝 Setting URL hash to:', newHash);
    window.history.replaceState(null, '', newHash);
}

function restoreViewFromURL() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const view = params.get('view') || 'overview';
    const studioId = params.get('studio');
    const userEmail = params.get('user');
    
    // Switch to the view
    switchView(view);
    
    // Restore studio selection if applicable
    if (view === 'studio' && studioId) {
        const studioSelect = document.getElementById('studioSelect');
        if (studioSelect) {
            studioSelect.value = studioId;
            updateStudioView();
        }
    }
    
    // Restore user selection if applicable
    if (view === 'personal' && userEmail) {
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.value = userEmail;
            updatePersonalView();
        }
    }
}

function populateStudioSelector() {
    const select = document.getElementById('studioSelect');
    select.innerHTML = '';
    
    // Group by studio
    const studios = {};
    BOOKING_CONFIG.STUDIOS.forEach(studio => {
        if (!studios[studio.studio]) {
            studios[studio.studio] = [];
        }
        studios[studio.studio].push(studio);
    });
    
    Object.keys(studios).forEach(studioName => {
        const group = document.createElement('optgroup');
        group.label = studioName;
        
        studios[studioName].forEach(zone => {
            const option = document.createElement('option');
            option.value = zone.id;
            option.textContent = zone.name;
            group.appendChild(option);
        });
        
        select.appendChild(group);
    });
    
    if (select.options.length > 0) {
        select.value = select.options[0].value;
    }
}

function populateUserSelector() {
    const select = document.getElementById('userSelect');
    select.innerHTML = '';
    
    BOOKING_CONFIG.AUTHORIZED_USERS.forEach(user => {
        const option = document.createElement('option');
        option.value = user.email;
        option.textContent = `${user.name} (${user.role})`;
        select.appendChild(option);
    });
    
    if (currentUser) {
        select.value = currentUser.email;
    }
}

function updateAllViews() {
    updateOverviewView();
    updatePersonalView();
    updateStudioView();
    updatePrintView();
}

function updateOverviewView() {
    const grid = document.getElementById('studiosGrid');
    grid.innerHTML = '';
    
    // Get all time slots
    const slots = generateTimeSlots(BOOKING_CONFIG.EVENT_START_TIME, BOOKING_CONFIG.EVENT_END_TIME, 30);
    const allStudios = BOOKING_CONFIG.STUDIOS;
    
    // Check if mobile
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        // Mobile: Single studio carousel
        const container = document.createElement('div');
        container.className = 'calendar-mobile-container';
        
        let currentStudioIndex = 0;
        
        const renderMobileCalendar = () => {
            const studios = {};
            allStudios.forEach(studio => {
                if (!studios[studio.studio]) {
                    studios[studio.studio] = [];
                }
                studios[studio.studio].push(studio);
            });
            
            const studioArray = Object.entries(studios).flatMap(([_, zones]) => zones);
            const currentStudio = studioArray[currentStudioIndex];
            
            const calendarDiv = document.createElement('div');
            calendarDiv.className = 'calendar-mobile-view';
            
            // Navigation header
            const navHeader = document.createElement('div');
            navHeader.className = 'calendar-mobile-nav';
            navHeader.innerHTML = `
                <button class="nav-arrow-btn" id="prevStudio">${currentStudioIndex > 0 ? '←' : ''}</button>
                <div class="mobile-studio-title">
                    <strong>${currentStudio.studio}</strong>
                    <span>${currentStudio.name}</span>
                </div>
                <div class="mobile-progress">${currentStudioIndex + 1} / ${studioArray.length}</div>
                <button class="nav-arrow-btn" id="nextStudio">${currentStudioIndex < studioArray.length - 1 ? '→' : ''}</button>
            `;
            
            if (currentStudioIndex === 0) {
                navHeader.querySelector('#prevStudio').style.visibility = 'hidden';
            }
            if (currentStudioIndex === studioArray.length - 1) {
                navHeader.querySelector('#nextStudio').style.visibility = 'hidden';
            }
            
            calendarDiv.appendChild(navHeader);
            
            // Calendar grid for single studio
            const calendarGrid = document.createElement('div');
            calendarGrid.className = 'calendar-mobile-grid';
            
            // Time column
            const timeColumn = document.createElement('div');
            timeColumn.className = 'calendar-mobile-times';
            
            const timeHeader = document.createElement('div');
            timeHeader.className = 'mobile-time-header';
            timeHeader.textContent = 'Zeit';
            timeColumn.appendChild(timeHeader);
            
            slots.forEach(slot => {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'mobile-time-slot';
                timeSlot.textContent = slot;
                timeColumn.appendChild(timeSlot);
            });
            
            calendarGrid.appendChild(timeColumn);
            
            // Studio column
            const studioColumn = document.createElement('div');
            studioColumn.className = 'calendar-mobile-studio-col';
            
            const studioHeader = document.createElement('div');
            studioHeader.className = 'mobile-studio-header';
            studioHeader.style.borderTopColor = currentStudio.color;
            studioHeader.style.backgroundColor = currentStudio.color + '08';
            studioHeader.textContent = currentStudio.name;
            studioColumn.appendChild(studioHeader);
            
            slots.forEach(slot => {
                const cell = document.createElement('div');
                cell.className = 'calendar-mobile-cell';
                cell.style.borderLeftColor = currentStudio.color;
                
                // Find booking that occupies this time slot
                const booking = findBookingAtSlot(currentStudio.id, slot);
                
                if (booking) {
                    const props = booking.extendedProperties?.private || {};
                    const isMyBooking = props.userEmail === currentUser?.email;
                    const isPartnerCanceled = isBookingPartnerCanceled(props);
                    const bookingStart = new Date(booking.start.dateTime);
                    const bookingStartTime = bookingStart.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
                    const duration = parseInt(props.duration || 30);
                    
                    cell.classList.add(isMyBooking ? 'my-booking' : 'booked');
                    if (isPartnerCanceled) {
                        cell.classList.add('partner-canceled');
                    }
                    
                    // Show full content on first slot, arrow on continuation
                    if (slot === bookingStartTime) {
                        const statusLabel = getPartnerStatusLabel(props);
                        const statusLine = statusLabel ? `<div class="booking-status">${statusLabel}</div>` : '';
                        cell.innerHTML = `<div class="booking-label">${getBookingDisplayLabel(booking)} (${duration}min)</div>${statusLine}`;
                    } else {
                        // Continuation of booking - show arrow
                        cell.innerHTML = `<div class="booking-label" style="font-size: 18px; opacity: 0.7;">↑</div>`;
                    }
                    
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', () => showBookingModal(booking.id));
                } else {
                    cell.classList.add('available');
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', () => openNewBookingModal(currentStudio.id, slot));
                }
                
                studioColumn.appendChild(cell);
            });
            
            calendarGrid.appendChild(studioColumn);
            calendarDiv.appendChild(calendarGrid);
            
            return { element: calendarDiv, studioArray };
        };
        
        const { element, studioArray } = renderMobileCalendar();
        container.appendChild(element);
        
        // Navigation event listeners
        container.addEventListener('click', (e) => {
            if (e.target.id === 'prevStudio' && currentStudioIndex > 0) {
                currentStudioIndex--;
                const { element } = renderMobileCalendar();
                container.innerHTML = '';
                container.appendChild(element);
                container.parentElement.scrollTop = 0;
            } else if (e.target.id === 'nextStudio' && currentStudioIndex < studioArray.length - 1) {
                currentStudioIndex++;
                const { element } = renderMobileCalendar();
                container.innerHTML = '';
                container.appendChild(element);
                container.parentElement.scrollTop = 0;
            }
        });
        
        grid.appendChild(container);
        
    } else {
        // Desktop: Full calendar grid with all studios (column-based layout)
        const calendarContainer = document.createElement('div');
        calendarContainer.className = 'calendar-grid-container';
        
        // Create wrapper for columns
        const columnsWrapper = document.createElement('div');
        columnsWrapper.className = 'calendar-columns-wrapper';
        
        // Time column (first column)
        const timeColumn = document.createElement('div');
        timeColumn.className = 'calendar-time-column';
        
        const timeHeader = document.createElement('div');
        timeHeader.className = 'calendar-time-header';
        timeHeader.textContent = 'Zeit';
        timeColumn.appendChild(timeHeader);
        
        slots.forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'calendar-time-slot';
            const minutes = slot.split(':')[1];
            if (minutes === '00') {
                timeSlot.classList.add('full-hour');
            } else {
                timeSlot.classList.add('half-hour');
            }
            timeSlot.textContent = slot;
            timeColumn.appendChild(timeSlot);
        });
        
        columnsWrapper.appendChild(timeColumn);
        
        // Studio columns (one column per studio)
        allStudios.forEach(studio => {
            const studioColumn = document.createElement('div');
            studioColumn.className = 'calendar-studio-column';
            
            // Header
            const studioHeader = document.createElement('div');
            studioHeader.className = 'calendar-studio-header';
            studioHeader.style.borderTopColor = studio.color;
            studioHeader.style.backgroundColor = studio.color + '08';
            const zoneName = studio.name.replace(/^Studio \d+ - /, '');
            studioHeader.innerHTML = `<strong>${studio.studio}</strong><br><small>${zoneName}</small>`;
            studioColumn.appendChild(studioHeader);
            
            // Track which slots are already rendered (for multi-slot bookings)
            const renderedSlots = new Set();
            
            // Slots
            slots.forEach((slot, slotIndex) => {
                // Skip if this slot is part of a previous multi-slot booking
                if (renderedSlots.has(slot)) {
                    return;
                }
                
                const booking = findBookingAtSlot(studio.id, slot);
                
                const cell = document.createElement('div');
                cell.className = 'calendar-studio-cell';
                cell.style.borderLeftColor = studio.color;
                
                // Add half-hour or full-hour class
                const minutes = slot.split(':')[1];
                if (minutes === '00') {
                    cell.classList.add('full-hour');
                } else {
                    cell.classList.add('half-hour');
                }
                
                if (booking) {
                    const props = booking.extendedProperties?.private || {};
                    const isMyBooking = props.userEmail === currentUser?.email;
                    const isPartnerCanceled = isBookingPartnerCanceled(props);
                    const bookingStart = new Date(booking.start.dateTime);
                    const bookingStartTime = bookingStart.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
                    const duration = parseInt(props.duration || 30);
                    
                    // Only show if this is the start of the booking
                    if (slot === bookingStartTime) {
                        cell.classList.add(isMyBooking ? 'my-booking' : 'booked');
                        if (isPartnerCanceled) {
                            cell.classList.add('partner-canceled');
                        }
                        
                        // Add duration class
                        if (duration === 60) {
                            cell.classList.add('duration-60');
                            // Mark next slot as rendered
                            if (slotIndex + 1 < slots.length) {
                                renderedSlots.add(slots[slotIndex + 1]);
                            }
                        }
                        
                        const statusLabel = getPartnerStatusLabel(props);
                        const statusLine = statusLabel ? `<div class="booking-status">${statusLabel}</div>` : '';
                        cell.innerHTML = `
                            <div class="booking-block">
                                <div class="booking-title">${getBookingDisplayLabel(booking)}</div>
                                <div class="booking-time">${slot} (${duration}min)</div>
                                ${statusLine}
                            </div>
                        `;
                        
                        cell.style.cursor = 'pointer';
                        cell.addEventListener('click', () => showBookingModal(booking.id));
                        
                        studioColumn.appendChild(cell);
                    }
                } else {
                    cell.classList.add('available');
                    cell.style.backgroundColor = studio.color + '08';
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', () => openNewBookingModal(studio.id, slot));
                    studioColumn.appendChild(cell);
                }
            });
            
            columnsWrapper.appendChild(studioColumn);
        });
        
        calendarContainer.appendChild(columnsWrapper);
        grid.appendChild(calendarContainer);
    }
}

function updatePersonalView() {
    const selectedEmail = document.getElementById('userSelect').value;
    const container = document.getElementById('personalBookings');
    container.innerHTML = '';
    
    // Find the selected user's name
    const selectedUser = getAuthorizedUserByEmail(selectedEmail);
    const selectedUserName = selectedUser?.name || '';
    
    // Filter bookings where user is either the creator OR the partner
    const userBookings = allBookings.filter(b => {
        const props = b.extendedProperties?.private || {};
        const creatorEmail = getCreatorEmail(b, props);
        const isCreator = normalizeEmail(creatorEmail) === normalizeEmail(selectedEmail);
        const isPartnerEmail = normalizeEmail(props.partnerEmail || '') === normalizeEmail(selectedEmail);
        const isPartnerName = props.partner === selectedUserName;
        return isCreator || isPartnerEmail || isPartnerName;
    });
    
    if (userBookings.length === 0) {
        container.innerHTML = '<p class="no-data">Keine Buchungen vorhanden</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'bookings-table';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Studio</th>
            <th>Zeit</th>
            <th>Dauer</th>
            <th>Partner</th>
            <th>Status</th>
            <th>Aktion</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    const tableLabels = ['Studio', 'Zeit', 'Dauer', 'Partner', 'Status', 'Aktion'];

    userBookings.forEach(booking => {
        const props = booking.extendedProperties?.private || {};
        const studio = BOOKING_CONFIG.STUDIOS.find(s => s.id === props.studioId);
        const startTime = new Date(booking.start.dateTime).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
        const creatorEmail = getCreatorEmail(booking, props);
        const isCreator = normalizeEmail(creatorEmail) === normalizeEmail(selectedEmail);
        const isAdmin = isCurrentUserAdmin();
        const isPartner = normalizeEmail(props.partnerEmail || '') === normalizeEmail(selectedEmail) || props.partner === selectedUserName;
        const isPartnerCanceled = isBookingPartnerCanceled(props);
        const statusLabel = getPartnerStatusLabel(props) || 'Aktiv';
        const canShowActions = normalizeEmail(selectedEmail) === normalizeEmail(currentUser?.email) || isAdmin;
        const canRemovePartner = (isCreator || isAdmin) && !!(props.partner || props.partnerEmail) && !isPartnerCanceled;
        const canCancelPartner = !isCreator && !isAdmin && isPartner && !isPartnerCanceled;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${studio?.name || 'Unbekannt'}</strong></td>
            <td>${startTime} Uhr</td>
            <td>${props.duration} min</td>
            <td>${props.partner || '-'}</td>
            <td>${statusLabel}</td>
            <td>${canShowActions ? `
                <button class="btn btn-small btn-primary" data-action="details" data-event="${booking.id}">Details</button>
                ${(isCreator || isAdmin) ? `<button class="btn btn-small btn-danger" data-action="delete" data-event="${booking.id}">Löschen</button>` : ''}
                ${canRemovePartner ? `<button class="btn btn-small btn-warning" data-action="remove-partner" data-event="${booking.id}">Partner entfernen</button>` : ''}
                ${canCancelPartner ? `<button class="btn btn-small btn-warning" data-action="cancel-partner" data-event="${booking.id}">Partner stornieren</button>` : ''}
            ` : '-'}
            </td>
        `;

        Array.from(row.children).forEach((cell, index) => {
            if (tableLabels[index]) {
                cell.setAttribute('data-label', tableLabels[index]);
            }
        });
        
        const detailsBtn = row.querySelector('[data-action="details"]');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', () => showBookingModal(booking.id));
        }
        const deleteBtn = row.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => await handleBookingAction('delete', booking));
        }
        const removeBtn = row.querySelector('[data-action="remove-partner"]');
        if (removeBtn) {
            removeBtn.addEventListener('click', async () => await handleBookingAction('remove-partner', booking));
        }
        const cancelBtn = row.querySelector('[data-action="cancel-partner"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => await handleBookingAction('cancel-partner', booking));
        }
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

function updateStudioView() {
    const selectedStudioId = document.getElementById('studioSelect').value;
    const studio = BOOKING_CONFIG.STUDIOS.find(s => s.id === selectedStudioId);
    
    if (!studio) return;
    
    const view = document.getElementById('studioView');
    let html = `
        <div class="view-header">
            <h2>${studio.name}</h2>
            <div class="studio-selector">
                <label for="studioSelect">Studio auswählen:</label>
                <select id="studioSelect" class="form-select">
                </select>
            </div>
        </div>
        <div class="studio-content">
            <div class="schedule-grid">
    `;
    
    const studioBookings = allBookings.filter(b => {
        return b.extendedProperties?.private?.studioId === studio.id;
    });
    
    const slots = generateTimeSlots(BOOKING_CONFIG.EVENT_START_TIME, BOOKING_CONFIG.EVENT_END_TIME, 30);
    const renderedSlots = new Set();
    
    slots.forEach((slot, slotIndex) => {
        // Skip if this slot was already rendered as part of a 60-min booking
        if (renderedSlots.has(slot)) {
            return;
        }
        
        // Find booking that occupies this time slot
        const booking = findBookingAtSlot(studio.id, slot);
        
        let slotClass = 'time-slot available';
        let content = slot;
        let clickHandler = '';
        
        if (booking) {
            const props = booking.extendedProperties?.private || {};
            const bookingStart = new Date(booking.start.dateTime);
            const bookingStartTime = bookingStart.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
            const duration = parseInt(props.duration || 30);
            const isMyBooking = props.userEmail === currentUser?.email;
            const isPartnerCanceled = isBookingPartnerCanceled(props);
            
            slotClass = isMyBooking ? 'time-slot my-booking' : 'time-slot booked';
            if (isPartnerCanceled) {
                slotClass += ' partner-canceled';
            }
            
            // Only show full content on first slot
            if (slot === bookingStartTime) {
                const statusLabel = getPartnerStatusLabel(props);
                const statusLine = statusLabel ? `<br><small>${statusLabel}</small>` : '';
                content = `<strong>${slot}</strong> (${duration}min)<br><small>${getBookingDisplayLabel(booking)}</small>${statusLine}`;
                
                // Add duration class for 60min bookings
                if (duration === 60) {
                    slotClass += ' duration-60';
                    // Mark next slot as rendered
                    if (slotIndex + 1 < slots.length) {
                        renderedSlots.add(slots[slotIndex + 1]);
                    }
                }
            } else {
                // This shouldn't happen anymore, but keep as fallback
                content = `<small>↑ ${bookingStartTime} (${duration}min)</small>`;
            }
            clickHandler = ` data-booking-id="${booking.id}"`;
        } else {
            clickHandler = ` data-studio-id="${studio.id}" data-time="${slot}"`;
        }
        
        html += `<div class="${slotClass}"${clickHandler}>${content}</div>`;
    });
    
    html += `</div></div>`;
    
    view.innerHTML = html;
    
    // Re-populate studio selector
    populateStudioSelector();
    document.getElementById('studioSelect').value = selectedStudioId;
    document.getElementById('studioSelect').addEventListener('change', () => {
        updateStudioView();
        updateURLHash();
    });
    
    // Add click handlers to time slots
    view.querySelectorAll('.time-slot').forEach(slot => {
        const bookingId = slot.dataset.bookingId;
        const studioId = slot.dataset.studioId;
        const time = slot.dataset.time;
        
        if (bookingId) {
            // Existing booking - show details
            slot.style.cursor = 'pointer';
            slot.addEventListener('click', () => showBookingModal(bookingId));
        } else if (studioId && time) {
            // Available slot - open booking modal
            slot.style.cursor = 'pointer';
            slot.addEventListener('click', () => openNewBookingModal(studioId, time));
        }
    });
}

function updatePrintView() {
    // Placeholder for print view
    const view = document.getElementById('printView');
    if (view) {
        view.innerHTML = '<p>Druckansicht wird implementiert...</p>';
    }
}

function showBookingModal(eventId) {
    const booking = allBookings.find(b => b.id === eventId);
    if (!booking) return;
    
    const props = booking.extendedProperties?.private || {};
    const studio = BOOKING_CONFIG.STUDIOS.find(s => s.id === props.studioId);
    const startTime = new Date(booking.start.dateTime).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
    const creatorEmail = getCreatorEmail(booking, props);
    const isCreator = normalizeEmail(creatorEmail) === normalizeEmail(currentUser?.email);
    const isAdmin = isCurrentUserAdmin();
    const isPartner = isCurrentUserPartner(props);
    const isPartnerCanceled = isBookingPartnerCanceled(props);
    const statusLabel = getPartnerStatusLabel(props) || 'Aktiv';
    const currentPartnerName = props.partner && !isPartnerCanceled ? props.partner : '';
    
    const modal = document.getElementById('bookingModal');
    const body = document.getElementById('modalBody');
    
    // Store eventId for later use
    body.dataset.eventId = eventId;
    
    // Build partner selection UI (only for creator if partner is removed/empty)
    let partnerUI = `<p><strong>Partner:</strong> ${currentPartnerName || '-'}</p>`;
    if ((isCreator || isAdmin) && isPartnerCanceled) {
        const partnerOptions = BOOKING_CONFIG.AUTHORIZED_USERS
            .filter(u => u.email !== props.userEmail)
            .map(u => `<option value="${u.email}">${u.name}</option>`)
            .join('');
        
        partnerUI = `
            <div class="form-group">
                <label><strong>Partner auswählen:</strong></label>
                <select id="newPartnerSelect" class="form-select">
                    <option value="">Kein Partner</option>
                    ${partnerOptions}
                </select>
            </div>
        `;
    }
    
    body.innerHTML = `
        <p><strong>Studio:</strong> ${studio?.name}</p>
        <p><strong>Zeit:</strong> ${startTime}</p>
        <p><strong>Dauer:</strong> ${props.duration} Minuten</p>
        <p><strong>Fotograf/in:</strong> ${props.userEmail}</p>
        ${partnerUI}
        <p><strong>Status:</strong> ${statusLabel}</p>
        <p><strong>Notizen:</strong> ${sanitizeNotesDescription(booking.description) || '-'}</p>
    `;
    
    const deleteBtn = document.getElementById('deleteBooking');
    deleteBtn.dataset.eventId = eventId;
    deleteBtn.classList.toggle('hidden', !(isCreator || isAdmin));
    
    const cancelBtn = document.getElementById('cancelPartner');
    cancelBtn.dataset.eventId = eventId;
    const canRemovePartner = (isCreator || isAdmin) && !!(props.partner || props.partnerEmail) && !isPartnerCanceled;
    const canCancelPartner = !isCreator && !isAdmin && isPartner && !isPartnerCanceled;
    if (canRemovePartner || canCancelPartner) {
        cancelBtn.textContent = (isCreator || isAdmin) ? 'Partner entfernen' : 'Partner stornieren';
        cancelBtn.classList.remove('hidden');
    } else {
        cancelBtn.classList.add('hidden');
    }
    
    // Show confirm button only if creator and partner was just removed
    const confirmBtn = document.getElementById('confirmNewPartner');
    if (confirmBtn) {
        confirmBtn.dataset.eventId = eventId;
        confirmBtn.classList.toggle('hidden', !((isCreator || isAdmin) && isPartnerCanceled));
    }
    
    modal.classList.remove('hidden');
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.add('hidden');
}

async function confirmNewPartner() {
    const eventId = document.getElementById('confirmNewPartner').dataset.eventId;
    const newPartnerEmail = document.getElementById('newPartnerSelect')?.value;
    
    if (!eventId) return;
    
    const booking = allBookings.find(b => b.id === eventId);
    if (!booking) return;
    
    const props = booking.extendedProperties?.private || {};
    const isCreator = props.userEmail === currentUser?.email;
    if (!isCreator) {
        showError('mainError', 'Nur der Ersteller kann den Partner ändern.');
        return;
    }
    
    // Find partner name if selected
    let newPartnerName = '';
    if (newPartnerEmail) {
        const partnerUser = BOOKING_CONFIG.AUTHORIZED_USERS.find(u => u.email === newPartnerEmail);
        newPartnerName = partnerUser?.name || newPartnerEmail;
    }
    
    // Keep notes clean (no Fotograf/in, Partner, Status lines)
    const updatedDescription = sanitizeNotesDescription(booking.description || '');

    // Update summary to reflect current partner selection
    const updatedSummary = setPartnerInSummary(booking.summary, newPartnerName);
    
    const patch = {
        summary: updatedSummary,
        description: updatedDescription,
        extendedProperties: {
            private: {
                ...props,
                partner: newPartnerName,
                partnerEmail: newPartnerEmail,
                partnerCanceled: 'false',  // Reset partner canceled status
                partnerCanceledByEmail: '',
                partnerCanceledByName: '',
                partnerCanceledAt: ''
            }
        }
    };
    
    console.log('📤 Setting new partner:', newPartnerName);
    const result = await updateBookingByEventId(eventId, patch, 'none');
    
    if (result) {
        await loadAllBookings();  // Refresh bookings list
        showBookingModal(eventId);  // Refresh modal
        updatePersonalView();  // Refresh personal view to show updated booking
        showError('mainError', `Partner ${newPartnerName ? "'" + newPartnerName + "'" : 'entfernt'} eingestellt`);
    }
}

function openNewBookingModal(studioId = null, startTime = null) {
    const modal = document.getElementById('newBookingModal');
    
    // Populate studio dropdown
    const studioSelect = document.getElementById('bookingStudio');
    studioSelect.innerHTML = '<option value="">-- Bitte wählen --</option>';
    BOOKING_CONFIG.STUDIOS.forEach(studio => {
        const option = document.createElement('option');
        option.value = studio.id;
        option.textContent = studio.name;
        if (studio.id === studioId) {
            option.selected = true;
        }
        studioSelect.appendChild(option);
    });
    
    // Populate time dropdown
    const timeSelect = document.getElementById('bookingStartTime');
    timeSelect.innerHTML = '<option value="">-- Bitte wählen --</option>';
    const slots = generateTimeSlots(BOOKING_CONFIG.EVENT_START_TIME, BOOKING_CONFIG.EVENT_END_TIME, 30);
    
    // If studio is selected, mark booked times as disabled
    const studioBookings = studioId 
        ? allBookings.filter(b => b.extendedProperties?.private?.studioId === studioId)
        : [];
    
    slots.forEach(slot => {
        // Find booking that occupies this time slot
        const booking = studioId ? findBookingAtSlot(studioId, slot) : null;
        
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = booking ? `${slot} (belegt)` : slot;
        option.disabled = !!booking;
        
        if (slot === startTime && !booking) {
            option.selected = true;
        }
        
        timeSelect.appendChild(option);
    });
    
    // Reset other fields
    document.getElementById('bookingDuration').value = '30';
    document.getElementById('bookingNotes').value = '';
    
    // Populate partner dropdown
    populatePartnerDropdown();
    
    // Update duration options based on selected time
    updateDurationOptions(startTime);
    
    // Add event listener to update duration when time changes
    timeSelect.addEventListener('change', function() {
        updateDurationOptions(this.value);
    });
    
    modal.classList.remove('hidden');
}

function updateDurationOptions(startTime) {
    const durationSelect = document.getElementById('bookingDuration');
    const currentValue = durationSelect.value;
    
    if (!startTime) {
        // No time selected, show both options
        durationSelect.innerHTML = `
            <option value="30">30 Minuten</option>
            <option value="60">60 Minuten</option>
        `;
        durationSelect.value = currentValue || '30';
        return;
    }
    
    // Calculate remaining time until event end
    const [hours, minutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = BOOKING_CONFIG.EVENT_END_TIME.split(':').map(Number);
    
    const startMinutes = hours * 60 + minutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    const remainingMinutes = endTotalMinutes - startMinutes;
    
    // Only show options that fit in remaining time
    durationSelect.innerHTML = '';
    
    if (remainingMinutes >= 30) {
        const option30 = document.createElement('option');
        option30.value = '30';
        option30.textContent = '30 Minuten';
        durationSelect.appendChild(option30);
    }
    
    if (remainingMinutes >= 60) {
        const option60 = document.createElement('option');
        option60.value = '60';
        option60.textContent = '60 Minuten';
        durationSelect.appendChild(option60);
    }
    
    // Select current value if still valid, otherwise select first option
    if (durationSelect.querySelector(`option[value="${currentValue}"]`)) {
        durationSelect.value = currentValue;
    } else {
        durationSelect.value = durationSelect.options[0]?.value || '30';
    }
}

function populatePartnerDropdown() {
    const partnerSelect = document.getElementById('bookingPartner');
    partnerSelect.innerHTML = '<option value="">-- Bitte wählen --</option>';
    
    // Get current user's default partner
    const currentUserData = BOOKING_CONFIG.AUTHORIZED_USERS.find(u => u.email === currentUser?.email);
    const defaultPartnerEmail = currentUserData?.defaultPartner;
    
    // Add all other users as options (exclude current user)
    BOOKING_CONFIG.AUTHORIZED_USERS.forEach(user => {
        if (user.email !== currentUser?.email) {
            const option = document.createElement('option');
            option.value = user.email;
            option.textContent = `${user.name} (${user.role})`;
            
            // Pre-select default partner
            if (user.email === defaultPartnerEmail) {
                option.selected = true;
            }
            
            partnerSelect.appendChild(option);
        }
    });
}

async function submitNewBooking() {
    const studioId = document.getElementById('bookingStudio').value;
    const startTime = document.getElementById('bookingStartTime').value;
    const duration = parseInt(document.getElementById('bookingDuration').value);
    const partnerEmail = document.getElementById('bookingPartner').value;
    const notes = document.getElementById('bookingNotes').value;
    
    // Validation
    if (!studioId || !startTime) {
        alert('Bitte Studio und Startzeit auswählen.');
        return;
    }
    
    const studio = BOOKING_CONFIG.STUDIOS.find(s => s.id === studioId);
    if (!studio) {
        alert('Studio nicht gefunden.');
        return;
    }
    
    // Check if slot is available
    const validation = validateBooking(studio, startTime, duration);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }
    
    // Create booking
    const [hours, minutes] = startTime.split(':');
    const eventDate = new Date(BOOKING_CONFIG.EVENT_DATE);
    eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const endDate = addMinutes(eventDate, duration);
    
    // Get partner name from email
    const partnerUser = BOOKING_CONFIG.AUTHORIZED_USERS.find(u => normalizeEmail(u.email) === normalizeEmail(partnerEmail));
    const partnerName = partnerUser?.name || '';
    const creatorName = getDisplayNameByEmail(currentUser.email) || currentUser.name;
    
    const event = {
        summary: `${studio.name} - ${creatorName}${partnerName ? ' & ' + partnerName : ''}`,
        description: notes || undefined,
        start: {
            dateTime: eventDate.toISOString(),
            timeZone: 'Europe/Berlin'
        },
        end: {
            dateTime: endDate.toISOString(),
            timeZone: 'Europe/Berlin'
        },
        extendedProperties: {
            private: {
                studioId: studio.id,
                userEmail: normalizeEmail(currentUser.email),
                duration: duration.toString(),
                partner: partnerName,
                partnerEmail: partnerEmail,
                partnerCanceled: 'false'
            }
        }
    };
    
    try {
        showLoading(true);
        
        const url = `${BOOKING_CONFIG.VERCEL_API_URL}/create-booking`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ event })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Fehler beim Erstellen der Buchung');
        }
        
        alert('Buchung erfolgreich erstellt!');
        document.getElementById('newBookingModal').classList.add('hidden');
        await loadAllBookings();
        updateAllViews();
        showLoading(false);
    } catch (error) {
        console.error('Fehler beim Erstellen der Buchung:', error);
        alert('Fehler beim Erstellen der Buchung: ' + error.message);
        showLoading(false);
    }
}

async function deleteBooking() {
    const eventId = document.getElementById('deleteBooking').dataset.eventId;
    const booking = allBookings.find(b => b.id === eventId);
    if (!booking) return;
    
    const props = booking.extendedProperties?.private || {};
    const isCreator = props.userEmail === currentUser?.email;
    if (!isCreator) {
        showError('mainError', 'Nur der Ersteller kann eine Buchung löschen.');
        return;
    }
    
    const confirmed = await showConfirmation('Buchung löschen', 'Soll diese Buchung wirklich gelöscht werden?');
    if (confirmed) {
        await deleteBookingByEventId(eventId);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show a confirmation modal and return a promise
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if canceled
 */
function showConfirmation(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        const modal = document.getElementById('confirmationModal');
        modal.classList.remove('hidden');
        
        const confirmYes = document.getElementById('confirmYes');
        const confirmNo = document.getElementById('confirmNo');
        const modalClose = modal.querySelector('.modal-close');
        
        const cleanup = () => {
            confirmYes.removeEventListener('click', handleYes);
            confirmNo.removeEventListener('click', handleNo);
            modalClose.removeEventListener('click', handleNo);
        };
        
        const handleYes = () => {
            cleanup();
            modal.classList.add('hidden');
            resolve(true);
        };
        
        const handleNo = () => {
            cleanup();
            modal.classList.add('hidden');
            resolve(false);
        };
        
        confirmYes.addEventListener('click', handleYes);
        confirmNo.addEventListener('click', handleNo);
        modalClose.addEventListener('click', handleNo);
    });
}

/**
 * Check if a time slot is occupied by a booking
 * Returns the booking if the slot falls within its duration
 */
function findBookingAtSlot(studioId, slotTime) {
    return allBookings.find(b => {
        const props = b.extendedProperties?.private || {};
        if (props.studioId !== studioId) return false;
        
        const bookingStart = new Date(b.start.dateTime);
        const bookingEnd = new Date(b.end.dateTime);
        
        // Parse slot time
        const [hours, minutes] = slotTime.split(':').map(Number);
        const slotDate = new Date(BOOKING_CONFIG.EVENT_DATE);
        slotDate.setHours(hours, minutes, 0, 0);
        
        // Check if slot is within booking time range
        return slotDate >= bookingStart && slotDate < bookingEnd;
    });
}

function generateTimeSlots(startTime, endTime, interval) {
    const slots = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        slots.push(timeString);
        
        currentMin += interval;
        if (currentMin >= 60) {
            currentMin = 0;
            currentHour++;
        }
    }
    
    return slots;
}

function addMinutes(date, minutes) {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
}

function validateBooking(studio, startTime, duration) {
    // Check max total booking time
    const userBookings = allBookings.filter(b => 
        b.extendedProperties?.private?.userEmail === currentUser?.email
    );
    
    const totalMinutes = userBookings.reduce((sum, b) => {
        return sum + parseInt(b.extendedProperties?.private?.duration || 0);
    }, 0);
    
    if (totalMinutes + duration > BOOKING_CONFIG.RULES.MAX_TOTAL_BOOKING_TIME) {
        return {
            valid: false,
            message: `Max. Buchungszeit (${BOOKING_CONFIG.RULES.MAX_TOTAL_BOOKING_TIME} Min.) überschritten!`
        };
    }
    
    // Check studio availability for all time slots in the booking duration
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date(BOOKING_CONFIG.EVENT_DATE);
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, duration);
    
    // Check all 30-minute slots within the booking duration
    const slots = generateTimeSlots(startTime, 
        `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`, 
        30);
    
    for (const slot of slots) {
        const conflict = findBookingAtSlot(studio.id, slot);
        if (conflict) {
            return {
                valid: false,
                message: `Zeitslot ${slot} ist bereits belegt!`
            };
        }
    }
    
    return { valid: true };
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}
