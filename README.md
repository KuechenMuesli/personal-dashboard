# Personal Dashboard

## About this project

Personal Dashboard is a customizable web application designed to serve as a central hub for your daily digital needs. Built with SvelteKit and deployed on Cloudflare Pages, it provides a flexible grid-based interface where users can arrange various widgets to create their ideal dashboard experience.

The philosophy behind Personal Dashboard is simplicity and extensibility. It focuses on providing essential functionality through modular widgets that can be easily added, removed, or rearranged. The application prioritizes performance, responsiveness, and user control, allowing individuals to tailor their dashboard to their specific workflow and preferences.

This software is intended for individuals who want a personalized start page or dashboard that consolidates multiple tools and information sources into a single, organized view. It's particularly useful for developers, productivity enthusiasts, and anyone who values having quick access to frequently used information and tools.

## How to use the software

### Accessing the dashboard

Visit the public hosted domain at https://dashboard.paul-simon.dev to access the live dashboard.

### Adding widgets

1. Click the "Add Widget" button to open the widget picker.
2. Select from the available widgets:
   - Searchbar: Quick search functionality
   - Favorites: Bookmarked links and shortcuts
   - Sticky Note: Text notes and reminders
   - Parcel Tracker: Package delivery tracking
   - TRMNL Current Screen: Display for TRMNL device
   - Clock & Weather: Time, date, and weather information
   - Web Embed: Embedded web content
   - Timer / Stopwatch: Time tracking tools
   - Whiteboard: Drawing and sketching area
   - Network Metrics: Network performance monitoring

### Customizing the layout

1. Enter edit mode by clicking the edit button.
2. Drag widgets to reposition them on the grid.
3. Resize widgets by dragging their edges or corners.
4. Remove widgets by clicking the delete button on them.

### Configuring widgets

1. Click the settings icon on a widget to open its configuration panel.
2. Adjust settings specific to each widget (e.g., location for weather, URLs for embeds).
3. Save changes to apply the new configuration.

### Responsive design

The dashboard automatically adapts to different screen sizes:
- On mobile devices (less than 640px wide), it uses a 2-column layout
- On larger screens, it expands to a 9-column grid for more flexibility

## Running the software locally and development

### Prerequisites

- Node.js (version 18 or higher)
- npm or another package manager

### Local development setup

1. Clone the repository:
   ```
   git clone https://github.com/KuechenMuesli/personal-dashboard
   cd personal-dashboard/src/personal-dashboard
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the port shown in the terminal).

### Building for production

1. Build the application:
   ```
   npm run build
   ```

2. Preview the production build locally:
   ```
   npm run preview
   ```

### Deploying

The project is configured for deployment on Cloudflare Pages. The build output is automatically generated in the `.svelte-kit/cloudflare` directory.

To deploy:
1. Push your changes to the main branch
2. Cloudflare Pages will automatically build and deploy the application

### Developing new widgets

1. Create a new Svelte component in `src/lib/widgets/`
   - Follow the naming convention: `WidgetName.svelte`
   - The component should accept props: `id`, `isEditing`, `height`, and optionally `showSettings`

2. Add the widget to the widgets object in `src/routes/+page.svelte`:
   ```typescript
   widgets: {
     // ... existing widgets
     yourWidget: { 
       name: "Your Widget Name", 
       load: () => import("$lib/widgets/YourWidget.svelte"), 
       defaultSize: { width: 2, height: 2 } 
     }
   }
   ```

3. Implement the widget component with:
   - Proper state management using Svelte 5 runes
   - Settings dialog for configuration (if needed)
   - Responsive design that adapts to different heights
   - Local storage for persistent settings

4. Test the widget:
   - Add it to the dashboard
   - Verify it works in both view and edit modes
   - Test resizing and repositioning
   - Ensure it works on different screen sizes

### Code quality

- Run type checking: `npm run check`
- Lint code: `npm run lint`
- Format code: `npm run format`

The project uses TypeScript for type safety, Prettier for code formatting, and Tailwind CSS for styling. All widgets should follow these standards for consistency.
