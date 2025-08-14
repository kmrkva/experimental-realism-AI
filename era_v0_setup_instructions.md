# ERA (Experimental Realism AI) - v0.dev Integration Setup

## Overview
This version of ERA uses v0.dev's API instead of Claude's API. v0.dev specializes in generating modern web components and is particularly good at creating responsive, production-ready HTML/CSS/JavaScript code from screenshots and prompts.

## Why v0.dev?
- **Specialized in web development**: Built specifically for generating web components
- **Modern frameworks**: Excellent at creating responsive, modern designs
- **Screenshot analysis**: Advanced ability to recreate layouts from images
- **Production-ready code**: Generates clean, optimized HTML/CSS/JavaScript
- **Tailwind CSS**: Automatically uses modern CSS frameworks

## Project Structure
```
era-v0-project/
├── public/
│   └── index.html          # Your main website (same as before)
├── server-v0.js            # Backend server with v0.dev API integration
├── package.json            # Node.js dependencies (updated for v0.dev)
├── .env                    # Environment variables (create this)
├── .env.example            # Template for environment variables
├── uploads/                # Temporary folder for uploaded images
└── README.md              # These setup instructions
```

## Setup Steps

### 1. Install Node.js
- Download and install Node.js from https://nodejs.org/ (version 16 or higher)

### 2. Create Project Directory
```bash
mkdir era-v0-project
cd era-v0-project
```

### 3. Save the Files
- Save the HTML artifact as `public/index.html` (same as before)
- Save the v0.dev backend code as `server-v0.js`
- Save the v0.dev package.json as `package.json`
- Save the v0.dev .env.example as `.env.example`

### 4. Install Dependencies
```bash
npm install
```

### 5. Set Up Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your actual values:
   - **V0_API_KEY**: Get from v0.dev API dashboard
   - **EMAIL_USER**: Your Gmail address
   - **EMAIL_PASS**: Gmail app password

### 6. Get v0.dev API Key
1. Go to https://v0.dev
2. Sign up/log in with your GitHub account
3. Navigate to API settings or dashboard
4. Generate a new API key
5. Copy it to your `.env` file as V0_API_KEY

**Note**: v0.dev's public API is relatively new. If you have trouble accessing it:
- Check v0.dev's documentation for the latest API endpoints
- Ensure you have the correct permissions/subscription
- Contact v0.dev support if needed

### 7. Set Up Gmail App Password
(Same as Claude version)
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings > Security > App passwords
3. Generate an app password for "ERA v0.dev Application"
4. Copy this app password to your `.env` file as EMAIL_PASS

### 8. Start the Server
```bash
npm start
```
Or for development:
```bash
npm run dev
```

### 9. Access Your Website
Open your browser and go to: `http://localhost:3000`

## How v0.dev Integration Works

### API Flow:
1. **Screenshot Upload**: User uploads image to your server
2. **Prompt Generation**: Your form data creates detailed prompt
3. **v0.dev API Call**: 
   - Screenshot + prompt sent to v0.dev
   - v0.dev analyzes image and generates code
   - Returns modern HTML/CSS/JavaScript
4. **Code Processing**: 
   - If v0.dev returns React components, converts to HTML
   - Adds your tracking functionality
   - Integrates Qualtrics redirect
5. **User Receives**: Complete, modern webpage code

### v0.dev Advantages:
- ✅ **Superior web design**: Specialized in modern UI/UX
- ✅ **Responsive layouts**: Automatically mobile-friendly
- ✅ **Modern CSS**: Uses Tailwind, CSS Grid, Flexbox
- ✅ **Clean code**: Production-ready, well-structured
- ✅ **Component-based**: Modular, reusable design
- ✅ **Accessibility**: Built-in accessibility features

## API Differences from Claude

### v0.dev API Endpoints:
```
POST /generate - Generate webpage from image + prompt
POST /convert - Convert React components to HTML
GET /health - API health check
```

### Request Format:
```javascript
FormData {
  image: [screenshot file],
  prompt: [detailed prompt],
  framework: 'html',
  style: 'tailwind',
  typescript: 'false'
}
```

### Response Format:
```javascript
{
  code: "<!DOCTYPE html>...",  // Generated HTML
  preview_url: "...",          // Optional preview
  framework: "html",
  timestamp: "..."
}
```

## Customization Options

### Framework Selection:
- `html` - Plain HTML/CSS/JS
- `react` - React components
- `vue` - Vue.js components
- `svelte` - Svelte components

### Styling Options:
- `tailwind` - Tailwind CSS (recommended)
- `css` - Plain CSS
- `styled-components` - CSS-in-JS
- `scss` - SASS/SCSS

### Modify API Calls:
Edit the `generateWebpageWithV0()` function in `server-v0.js` to:
- Change framework preferences
- Adjust prompt structure
- Add additional parameters
- Handle different response formats

## Troubleshooting v0.dev Specific Issues

### "v0.dev API error (401)"
- Check your V0_API_KEY is correct
- Verify API key has proper permissions
- Ensure you're on the right subscription plan

### "v0.dev API error (429)"
- You've hit rate limits
- Wait before making more requests
- Check your usage quotas

### "No code generated"
- v0.dev couldn't process the image/prompt
- Try with a simpler screenshot
- Adjust the prompt to be more specific

### React to HTML Conversion Issues
- The automatic conversion might not work perfectly
- Manual fallback HTML is provided
- Consider using React directly if suitable

### Image Format Issues
- v0.dev prefers PNG format
- Ensure images are clear and high-resolution
- Avoid very large files (>10MB)

## Cost Comparison

### v0.dev Pricing (approximate):
- **Per generation**: ~$0.02-0.10 depending on complexity
- **Monthly plans**: Available with usage quotas
- **Free tier**: Limited generations per month

### When to Use v0.dev vs Claude:
- **v0.dev**: Better for modern web UI, responsive design, component-based layouts
- **Claude**: Better for complex logic, detailed explanations, custom functionality

## Production Deployment

### Recommended Platforms for v0.dev Integration:
1. **Vercel** (natural choice since v0.dev is by Vercel)
2. **Netlify**
3. **Railway**
4. **Heroku**

### Vercel Deployment:
```bash
npm install -g vercel
vercel
```

## Next Steps
1. Test with a simple screenshot first
2. Experiment with different prompt styles
3. Try various framework options
4. Deploy to Vercel for best integration
5. Monitor API usage and costs

Your ERA system now leverages v0.dev's specialized web development AI for creating modern, responsive consumer choice webpages! 🚀

## Support
- **v0.dev Documentation**: https://v0.dev/docs
- **v0.dev Discord**: Community support
- **GitHub Issues**: For technical problems