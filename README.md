# Voyage AI - Smart Travel Planner

A smart travel planner application built with React, Vite, and Google Gemini.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file in the root directory (copy from `.env.example` if available) and add your API keys:
    ```
    GEMINI_API_KEY=your_api_key_here
    ```

3.  **Run Locally:**
    ```bash
    npm run dev
    ```

## Deployment

### Manual Deployment
This project is configured to deploy to **GitHub Pages**.

```bash
npm run deploy
```
This command runs the build script and pushes the `dist` folder to the `gh-pages` branch.

### Automated Deployment (GitHub Actions)
A GitHub Action is set up in `.github/workflows/deploy.yml`.
Any push to the `main` or `master` branch will automatically:
1.  Install dependencies.
2.  Build the project.
3.  Deploy the `dist` folder to the `gh-pages` branch.

## Technologies
- React 19
- Vite
- Google Gemini SDK
- Lucide React
- TypeScript

## Features
- **AI-Powered Itineraries**: Generate trip plans using Google Gemini 2.5 Flash.
- **URL Route Import**: Paste a `tourcenter.com.tw` URL to automatically extract and generate a matching itinerary.
- **Interactive Map**: Visualizes the route on a map (in progress).

## Testing
Scripts are provided to verification of connectivity and model characteristics:
- `node test_connection.js`: Simple API connection test.
- `node test_url_route.js`: Verifies that the AI can parse and generate a route from a specific travel URL.
