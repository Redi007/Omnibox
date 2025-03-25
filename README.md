# Website Omnibox

A responsive, keyboard-activated command palette for websites. Allows users to quickly search, navigate, and execute commands using Ctrl+K / Cmd+K.

![Start](https://github.com/Redi007/Omnibox/blob/main/images/start.png?raw=true)
![Light](https://github.com/Redi007/Omnibox/blob/main/images/light.png?raw=true)
![Dark](https://github.com/Redi007/Omnibox/blob/main/images/dark.png?raw=true)

## Features

- ⌨️ Keyboard shortcut activation (Ctrl+K/Cmd+K)
- 🔍 Search through navigation links and commands
- 🌓 Built-in dark/light theme support
- 📱 Responsive design for all device sizes
- 🧩 Customizable via providers system


## Installation

1. Include the required files:
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Source+Sans+Pro:wght@300;400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="omnibox.css">

<!-- At the end of your body tag -->
<script src="omnibox.js"></script>
```

2. Add the HTML:
```html
<!-- Omnibox container -->
<div id="omnibox-overlay" class="hidden">
    <div id="omnibox-container">
        <div id="omnibox-header">
            <div id="omnibox-search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>
            <input type="text" id="omnibox-input" placeholder="Search, navigate, or run a command...">
            <div id="omnibox-close" role="button" tabindex="0">
                <kbd>ESC</kbd>
            </div>
        </div>
        <div id="omnibox-results">
            <!-- Results will be populated dynamically -->
            <div id="omnibox-loading" class="omnibox-loading hidden">
                <div class="omnibox-loading-spinner"></div>
            </div>
        </div>
        <div id="omnibox-footer">
            <div id="omnibox-help">
                <span class="key">↑↓</span> to navigate
                <span class="key">Tab</span> to cycle
                <span class="key">Enter</span> to select
                <span class="key">Esc</span> to close
            </div>
        </div>
    </div>
</div>

<!-- Floating shortcut hint -->
<div id="omnibox-hint" class="omnibox-hint" role="button" tabindex="0">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <kbd><span id="omnibox-shortcut-key">Ctrl + K</span></kbd>
</div>
```


## Basic Usage

Initialize the omnibox with navigation routes and commands:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation provider with routes
    const navigationProvider = new NavigationProvider([
        {
            title: 'Home',
            description: 'Return to homepage',
            icon: '<svg>...</svg>', // Your SVG icon
            action: () => { window.location.href = '/'; }
        },
        {
            title: 'About Us',
            description: 'Learn about our company',
            icon: '<svg>...</svg>',
            action: () => { window.location.href = '/about'; }
        }
    ]);

    // Initialize command provider with actions
    const commandProvider = new CommandProvider([
        {
            title: 'Toggle Dark Mode',
            description: 'Switch between light and dark themes',
            icon: '<svg>...</svg>',
            keywords: ['theme', 'dark', 'light'],
            action: () => { toggleDarkMode(); }
        },
        {
            title: 'Clear Storage',
            description: 'Reset all local settings',
            icon: '<svg>...</svg>',
            action: () => { localStorage.clear(); }
        }
    ]);

    // Initialize the omnibox
    const omnibox = new Omnibox({
        providers: [navigationProvider, commandProvider],
        categories: true, // Show category headers
        placeholder: 'Search or run a command...'
    });
});
```


## Adding Custom Entries

### Navigation Routes

Add navigation links that users can quickly access:

```javascript
const routes = [
    {
        title: 'Documentation', // Required: Display name
        description: 'View developer docs', // Optional: Additional info
        icon: '<svg>...</svg>', // Optional: SVG icon
        action: () => { window.location.href = '/docs'; } // Required: Action to perform
    }
];

const navigationProvider = new NavigationProvider(routes);
```


### Commands

Add executable commands for actions within your application:

```javascript
const commands = [
    {
        title: 'Log Out', // Required: Display name
        description: 'Sign out of your account', // Optional: Additional info
        icon: '<svg>...</svg>', // Optional: SVG icon
        keywords: ['signout', 'exit', 'logout'], // Optional: Alternative search terms
        action: () => { logoutUser(); } // Required: Action to perform
    }
];

const commandProvider = new CommandProvider(commands);
```


## Creating Custom Providers

Create providers to integrate with APIs or custom data sources:

```javascript
class APISearchProvider extends ResultProvider {
    constructor(apiEndpoint) {
        super('Search Results');
        this.apiEndpoint = apiEndpoint;
    }

    async getResults(query) {
        if (!query || query.length < 2) return [];
        
        try {
            const response = await fetch(`${this.apiEndpoint}?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            return data.results.map(item => ({
                title: item.title,
                description: item.excerpt,
                icon: '<svg>...</svg>',
                action: () => { window.location.href = item.url; }
            }));
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
}

// Usage
const searchProvider = new APISearchProvider('https://api.example.com/search');
```


## Configuration Options

The omnibox supports the following configuration options:

```javascript
const omnibox = new Omnibox({
    shortcut: { key: 'k', ctrlKey: true }, // Keyboard shortcut (Ctrl+K or Cmd+K)
    placeholder: 'Search or run a command...', // Input placeholder text
    emptyMessage: 'No results found', // Message when no results match
    maxResults: 10, // Maximum number of results to display
    categories: true, // Show category headers for different providers
    providers: [navigationProvider, commandProvider, searchProvider] // Result providers
});
```


## Theming

The omnibox automatically adapts to light and dark themes. You can customize the appearance by:

1. Using the built-in toggle dark mode command
2. Modifying CSS variables in your own stylesheet:
```css
:root {
    /* Light theme colors */
    --bg-color: #f8f8f8;
    --text-color: #222222;
    --highlight-bg: #f0f0f0;
    --highlight-border: #222222;
    /* Add more as needed */
}

.dark-theme {
    /* Dark theme colors */
    --bg-color: #1a1a1a;
    --text-color: #f0f0f0;
    --highlight-bg: #2a2a2a;
    --highlight-border: #787878;
    /* Add more as needed */
}
```


## Browser Compatibility

Works in all modern browsers:

- Chrome, Firefox, Safari, Edge


## License

MIT License
