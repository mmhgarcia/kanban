// Google Drive API Configuration
// To enable Google Drive integration, you need to:
// 1. Create a project in Google Cloud Console (https://console.cloud.google.com)
// 2. Enable Google Drive API
// 3. Create OAuth 2.0 credentials
// 4. Replace the placeholder values below

export const GOOGLE_DRIVE_CONFIG = {
  apiKey: 'YOUR_API_KEY', // Replace with your Google API key
  clientId: 'YOUR_CLIENT_ID', // Replace with your OAuth 2.0 client ID
  appId: 'YOUR_APP_ID', // Replace with your app ID
  scope: 'https://www.googleapis.com/auth/drive.file' // Scope for file access
};

// For development/testing, you can use environment variables:
// const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_API_KEY';
// const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';