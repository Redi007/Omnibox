class Omnibox {
    /**
     * Create a new Omnibox instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Default options
        this.options = {
            shortcut: { key: 'k', ctrlKey: true },
            placeholder: 'Search, navigate, or run a command...',
            emptyMessage: 'No results found',
            maxResults: 15,
            providers: [],
            categories: true, // Show category headers
            ...options
        };

        // DOM elements
        this.overlay = document.getElementById('omnibox-overlay');
        this.input = document.getElementById('omnibox-input');
        this.results = document.getElementById('omnibox-results');

        // State
        this.isOpen = false;
        this.currentResults = [];
        this.selectedIndex = -1;

        // Initialize
        this.initialize();
    }

    /**
     * Set up event listeners and initial state
     */
    initialize() {
        // Set placeholder text
        this.input.placeholder = this.options.placeholder;

        // Detect OS and set appropriate shortcut text
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const shortcutElement = document.getElementById('omnibox-shortcut-key');
        if (shortcutElement) {
            shortcutElement.textContent = isMac ? 'Cmd + K' : 'Ctrl + K';
        }

        // Set up the hint functionality
        this.setupHint();

        // Keyboard shortcut listener
        document.addEventListener('keydown', (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            
            // Check if shortcut matches (Ctrl+K or Cmd+K)
            if ((isMac ? e.metaKey : e.ctrlKey) && 
                e.key.toLowerCase() === this.options.shortcut.key.toLowerCase() && 
                !e.shiftKey && !e.altKey) {
                e.preventDefault();
                this.toggle();
            }

            // Close with Escape key
            if (e.key === 'Escape' && this.isOpen) {
                e.preventDefault();
                this.close();
            }
        });

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Make close button clickable
        const closeButton = document.getElementById('omnibox-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.close();
            });
            closeButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.close();
                }
            });
        }

        // Input event for search
        this.input.addEventListener('input', () => {
            this.search();
        });

        // Navigation keys
        this.input.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectNext();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectPrevious();
                    break;
                case 'Tab':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.selectPrevious();
                    } else {
                        this.selectNext();
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    // If nothing is selected, select the first item
                    if (this.selectedIndex === -1 && this.currentResults.length > 0) {
                        this.selectedIndex = 0;
                        this.highlightSelected();
                    }
                    this.executeSelected();
                    break;
            }
        });
    }

    /**
     * Set up the floating hint functionality
     */
    setupHint() {
        const hint = document.getElementById('omnibox-hint');
        if (!hint) return;
        
        // Make hint clickable to open omnibox
        hint.addEventListener('click', () => {
            this.open();
        });
        
        hint.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.open();
            }
        });

        // Auto-hide hint after 5 seconds, show on mousemove
        let hideTimeout;
        
        // Initial auto-hide
        setTimeout(() => {
            hint.classList.add('omnibox-hint-hidden');
        }, 5000);
        
        // Show again when user moves mouse
        document.addEventListener('mousemove', () => {
            hint.classList.remove('omnibox-hint-hidden');
            
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                hint.classList.add('omnibox-hint-hidden');
            }, 3000);
        }, { passive: true });

        // Show on touch events for mobile
        document.addEventListener('touchstart', () => {
            hint.classList.remove('omnibox-hint-hidden');
            
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                hint.classList.add('omnibox-hint-hidden');
            }, 3000);
        }, { passive: true });
    }

    /**
     * Toggle the omnibox open/closed with improved animation handling
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open the omnibox with improved animation
     */
    open() {
        this.isOpen = true;
        this.overlay.classList.remove('hidden');
        
        // Force a reflow to ensure the transition works
        void this.overlay.offsetWidth;
        
        // Focus the input after a short delay to allow the animation to start
        setTimeout(() => {
            this.input.focus();
            this.search(); // Show initial results
        }, 50);
    }

    /**
     * Close the omnibox with improved animation
     */
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.overlay.classList.add('hidden');
        
        // Clear input and results after animation completes
        setTimeout(() => {
            this.input.value = '';
            this.results.innerHTML = '';
            this.selectedIndex = -1;
        }, 300); // Match the CSS transition duration
    }

    /**
     * Perform search based on current input value
     */
    async search() {
        const query = this.input.value.trim();
        this.currentResults = [];
        
        // Show loading indicator for searches
        const loadingEl = document.getElementById('omnibox-loading');
        if (loadingEl) loadingEl.classList.remove('hidden');
        
        try {
            // Collect results from all providers
            for (const provider of this.options.providers) {
                try {
                    const providerResults = await provider.getResults(query);
                    
                    // If we have category support and results
                    if (this.options.categories && providerResults.length > 0) {
                        // Add category if provider has a name
                        if (provider.name) {
                            providerResults[0].category = provider.name;
                        }
                    }
                    
                    this.currentResults = [
                        ...this.currentResults,
                        ...providerResults
                    ];
                } catch (error) {
                    console.error(`Error in provider ${provider.name}:`, error);
                }
            }

            // Sort by relevance (if providers implement a relevance score)
            this.currentResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

            // Limit number of results
            this.currentResults = this.currentResults.slice(0, this.options.maxResults);
        } finally {
            // Hide loading indicator
            if (loadingEl) loadingEl.classList.add('hidden');
            
            // Update the UI
            this.renderResults();
        }
    }

    /**
     * Render the current results in the UI
     */
    renderResults() {
        this.results.innerHTML = '';
        // Re-add the loading indicator
        this.results.innerHTML = '<div id="omnibox-loading" class="omnibox-loading hidden"><div class="omnibox-loading-spinner"></div></div>';
        
        this.selectedIndex = -1;

        if (this.currentResults.length === 0) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'omnibox-empty';
            emptyElement.textContent = this.options.emptyMessage;
            this.results.appendChild(emptyElement);
            return;
        }

        // Keep track of categories we've already seen
        let renderedCategories = new Set();
        
        // Create and append result elements
        this.currentResults.forEach((result, index) => {
            // If we have a category and haven't rendered it yet
            if (this.options.categories && result.category && !renderedCategories.has(result.category)) {
                renderedCategories.add(result.category);
                
                const categoryElement = document.createElement('div');
                categoryElement.className = 'omnibox-category';
                categoryElement.textContent = result.category;
                this.results.appendChild(categoryElement);
            }
            
            const resultElement = document.createElement('div');
            resultElement.className = 'omnibox-result';
            resultElement.setAttribute('role', 'option');
            resultElement.setAttribute('tabindex', '0');
            resultElement.innerHTML = `
                <div class="omnibox-result-icon">
                    ${result.icon || ''}
                </div>
                <div class="omnibox-result-content">
                    <div class="omnibox-result-title">${result.title}</div>
                    ${result.description ? `<div class="omnibox-result-description">${result.description}</div>` : ''}
                </div>
                ${result.shortcut ? `<div class="omnibox-result-shortcut">${result.shortcut}</div>` : ''}
            `;

            // Add click handler
            resultElement.addEventListener('click', () => {
                this.executeResult(result);
            });
            
            // Add keyboard handler
            resultElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.executeResult(result);
                }
            });

            this.results.appendChild(resultElement);
        });
    }

    /**
     * Highlight the currently selected result
     */
    highlightSelected() {
        // Remove selected class from all results
        const resultElements = this.results.querySelectorAll('.omnibox-result');
        resultElements.forEach(el => el.classList.remove('selected'));
        
        // Add selected class to current selection if valid
        if (this.selectedIndex >= 0 && this.selectedIndex < resultElements.length) {
            const selectedElement = resultElements[this.selectedIndex];
            selectedElement.classList.add('selected');
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Select the next result in the list
     */
    selectNext() {
        if (this.currentResults.length === 0) return;
        
        // Get all result elements (excluding categories)
        const resultElements = this.results.querySelectorAll('.omnibox-result');
        if (resultElements.length === 0) return;
        
        // Select next (or loop back to first)
        this.selectedIndex = (this.selectedIndex + 1) % resultElements.length;
        
        this.highlightSelected();
    }

    /**
     * Select the previous result in the list
     */
    selectPrevious() {
        if (this.currentResults.length === 0) return;
        
        // Get all result elements (excluding categories)
        const resultElements = this.results.querySelectorAll('.omnibox-result');
        if (resultElements.length === 0) return;
        
        // Select previous (or loop to last)
        this.selectedIndex = this.selectedIndex <= 0 ? 
            resultElements.length - 1 : this.selectedIndex - 1;
        
        this.highlightSelected();
    }

    /**
     * Execute the currently selected result
     */
    executeSelected() {
        // Get all selectable elements
        const resultElements = this.results.querySelectorAll('.omnibox-result');
        
        if (this.selectedIndex >= 0 && this.selectedIndex < resultElements.length) {
            // Find the corresponding result object
            const selectedResult = this.currentResults.find(result => 
                result.title === resultElements[this.selectedIndex].querySelector('.omnibox-result-title').textContent
            );
            
            if (selectedResult) {
                this.executeResult(selectedResult);
            }
        }
    }

    /**
     * Execute a specific result
     * @param {Object} result - The result to execute
     */
    executeResult(result) {
        if (typeof result.action === 'function') {
            result.action();
        }
        
        // Close omnibox after execution unless explicitly told not to
        if (result.keepOpen !== true) {
            this.close();
        }
    }
}

/**
 * ResultProvider - Base class for omnibox result providers
 */
class ResultProvider {
    /**
     * Create a new result provider
     * @param {string} name - Provider name
     */
    constructor(name) {
        this.name = name;
    }

    /**
     * Get results based on a query
     * @param {string} query - The search query
     * @returns {Promise<Array>} - Array of result objects
     */
    async getResults(query) {
        // Override this method in subclasses
        return [];
    }
}

/**
 * NavigationProvider - A provider for navigation links
 */
class NavigationProvider extends ResultProvider {
    /**
     * Create a navigation provider
     * @param {Array} routes - Array of route objects
     */
    constructor(routes) {
        super('Navigation');
        this.routes = routes;
    }

    async getResults(query) {
        if (!query) {
            // Show all routes when query is empty
            return this.routes.map(route => ({
                ...route,
                relevance: 1
            }));
        }

        // Filter routes by query
        return this.routes
            .filter(route => {
                const title = route.title.toLowerCase();
                const description = (route.description || '').toLowerCase();
                const q = query.toLowerCase();
                
                return title.includes(q) || description.includes(q);
            })
            .map(route => {
                // Calculate relevance score based on how early the match appears
                const title = route.title.toLowerCase();
                const q = query.toLowerCase();
                const titleIndex = title.indexOf(q);
                
                // Higher relevance if it matches at the beginning
                const relevance = titleIndex === 0 ? 2 : 1;
                
                return {
                    ...route,
                    relevance
                };
            });
    }
}

/**
 * CommandProvider - A provider for executable commands
 */
class CommandProvider extends ResultProvider {
    /**
     * Create a command provider
     * @param {Array} commands - Array of command objects
     */
    constructor(commands) {
        super('Commands');
        this.commands = commands;
    }

    async getResults(query) {
        // Always show commands, even with empty query
        if (!query) {
            return this.commands.map(command => ({
                ...command,
                relevance: 0.5 // Lower relevance for empty query, so navigation links show first
            }));
        }

        // Filter commands by query
        return this.commands
            .filter(command => {
                const title = command.title.toLowerCase();
                const q = query.toLowerCase();
                
                return title.includes(q) || 
                       (command.keywords && command.keywords.some(k => k.includes(q)));
            })
            .map(command => {
                // Calculate relevance based on match quality
                const title = command.title.toLowerCase();
                const q = query.toLowerCase();
                
                // Higher relevance if it matches title exactly or at the beginning
                let relevance = 1;
                if (title === q) {
                    relevance = 3;
                } else if (title.startsWith(q)) {
                    relevance = 2;
                }
                
                return {
                    ...command,
                    relevance
                };
            });
    }
}

/**
 * Check if the user prefers dark mode
 */
function prefersDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Update theme based on current state
 */
function updateTheme(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark-theme');
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
}

/**
 * Toggle between light and dark themes
 */
function toggleDarkMode() {
    const isDarkMode = document.documentElement.classList.contains('dark-theme');
    updateTheme(!isDarkMode);
}

// Apply user's saved theme preference or OS preference
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        updateTheme(true);
    } else if (savedTheme === 'light') {
        updateTheme(false);
    } else {
        // No saved preference, use OS preference
        updateTheme(prefersDarkMode());
    }
    
    // Sample navigation routes
    const navigationRoutes = [
        {
            title: 'Home',
            description: 'Return to the homepage',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
            action: () => { window.location.href = '/'; }
        },
        {
            title: 'About',
            description: 'Learn more about us',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
            action: () => { window.location.href = '/about'; }
        },
        {
            title: 'Contact',
            description: 'Get in touch with our team',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
            action: () => { window.location.href = '/contact'; }
        },
        // Add more routes as needed
    ];

    // Sample commands
    const commands = [
        {
            title: 'Toggle Dark Mode',
            description: 'Switch between light and dark themes',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
            keywords: ['theme', 'dark', 'light', 'mode'],
            action: () => { 
                toggleDarkMode();
            }
        },
        {
            title: 'Clear Local Storage',
            description: 'Clear all locally stored data',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
            keywords: ['clear', 'storage', 'data', 'reset'],
            action: () => {
                if (confirm('Are you sure you want to clear local storage?')) {
                    localStorage.clear();
                    alert('Local storage cleared!');
                    // Re-apply theme based on OS preference since we cleared saved preference
                    updateTheme(prefersDarkMode());
                }
            }
        },
        {
            title: 'Feedback',
            description: 'Send feedback about this website',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
            keywords: ['feedback', 'comment', 'suggest'],
            action: () => {
                window.location.href = 'mailto:feedback@example.com?subject=Website%20Feedback';
            }
        },
        {
            title: 'Search Documentation',
            description: 'Search through our documentation',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
            keywords: ['docs', 'documentation', 'help', 'guide'],
            action: () => {
                window.location.href = '/documentation';
            }
        }
    ];

    // Initialize providers
    const navigationProvider = new NavigationProvider(navigationRoutes);
    const commandProvider = new CommandProvider(commands);

    // Initialize omnibox
    const omnibox = new Omnibox({
        providers: [navigationProvider, commandProvider],
        placeholder: 'Search or type a command...',
        emptyMessage: 'No matching results found',
        categories: true // Show category headers
    });
});
