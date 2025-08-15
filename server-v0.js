// server-v0.js - ERA Backend Server with v0.dev API Integration
require('dotenv').config(); // load .env

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const v0Key = process.env.V0_API_KEY;

const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const FormData = require('form-data');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// v0.dev API configuration
const V0_API_BASE = 'https://api.v0.dev/v1';
const V0_API_KEY = process.env.V0_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your HTML file from public folder

// Configure multer for file uploads (for webpage generation)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// For Share Example (accept any file type, in-memory storage)
const uploadShare = multer({ storage: multer.memoryStorage() });

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ======= EXISTING ENDPOINTS =======

// Main endpoint for webpage generation
app.post('/api/generate-webpage', upload.single('screenshot'), async (req, res) => {
    try {
        const {
            email,
            redirect,
            dataPoints,
            modifications,
            multipleVersions,
            versionDifference,
            qualtricsUrl
        } = req.body;

        const screenshotPath = req.file?.path;

        if (!screenshotPath) {
            return res.status(400).json({ success: false, error: 'Screenshot is required' });
        }

        let detailedPrompt;
		const hasAllOldFields =
			redirect &&
			dataPoints &&
			modifications !== undefined &&
			multipleVersions &&
			versionDifference !== undefined &&
			qualtricsUrl;

		if (hasAllOldFields) {
			// Use the original detailed prompt
			detailedPrompt = generateDetailedPrompt({
				redirect,
				dataPoints: Array.isArray(dataPoints) ? dataPoints : [dataPoints].filter(Boolean),
				modifications,
				multipleVersions,
				versionDifference,
				qualtricsUrl
			});
		} else {
			// Use the new simple fixed prompt
			detailedPrompt = "Please make a .html webpage that recreates the UI shown in the attached screenshot as accurately as possible.";
		}


        const generatedCode = await generateWebpageWithV0(screenshotPath, detailedPrompt);

        await sendEmails(email, detailedPrompt, generatedCode);

        await fs.unlink(screenshotPath);

        res.json({
            success: true,
            generatedCode: generatedCode,
            prompt: detailedPrompt
        });

    } catch (error) {
        console.error('Error generating webpage:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate webpage'
        });
    }
});

// ======= NEW ENDPOINT: Share Your Example =======
app.post('/api/share-example', uploadShare.single('exampleUpload'), async (req, res) => {
    try {
        const { yourEmail, exampleDesc } = req.body;
        const file = req.file;

        let emailText =
            `A new example was submitted via ERA website.\n\n` +
            `From: ${yourEmail || 'No email provided'}\n\n` +
            `Description: ${exampleDesc || 'No description provided.'}`;

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.NOTIFY_TO_EMAIL || process.env.EMAIL_USER || 'kmrkva@alumni.nd.edu',
            subject: 'New Example Shared via ERA Website',
            text: emailText,
            attachments: file
                ? [
                    {
                        filename: file.originalname,
                        content: file.buffer
                    }
                ]
                : []
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) {
        console.error('Error sending "Share Example" email:', err);
        res.status(500).json({ error: 'Failed to send email.' });
    }
});

// ======= PROMPT GENERATION & v0.dev LOGIC (unchanged) =======

function generateDetailedPrompt(data) {
    const { redirect, dataPoints, modifications, multipleVersions, versionDifference, qualtricsUrl } = data;

    let prompt = `Create a complete HTML webpage that recreates the design shown in the uploaded screenshot. This is for a consumer choice experiment with the following requirements:

DESIGN & LAYOUT:
- Recreate the visual design, layout, colors, fonts, and overall appearance exactly as shown in the screenshot
- Ensure the webpage looks professional, authentic, and matches the original
- Make it fully responsive for different screen sizes
- Use modern CSS techniques and clean code structure

TRACKING & ANALYTICS:
Please add JavaScript to track user interactions and record the following data points: ${dataPoints.join(', ')}
`;

    if (dataPoints.includes('choice')) {
        prompt += `- Track which specific option/choice the user selects\n`;
    }
    if (dataPoints.includes('allClicks')) {
        prompt += `- Record all clicks made by the user anywhere on the page\n`;
    }
    if (dataPoints.includes('decisionTime')) {
        prompt += `- Track the total time spent on the page before making a final decision\n`;
    }
    if (dataPoints.includes('maxScroll')) {
        prompt += `- Record the maximum scroll depth reached by the user (as percentage)\n`;
    }

    prompt += `
REDIRECT & INTEGRATION:
- Redirect to ${qualtricsUrl} when the user ${redirect}
- Pass all tracked data as URL parameters to Qualtrics in this format: ?choice=X&decisionTime=Y&allClicks=Z&maxScroll=W
- Ensure the redirect happens smoothly without any errors

CUSTOMIZATIONS:
${modifications ? `- Apply these specific changes from the original: ${modifications}` : '- No specific modifications requested - recreate exactly as shown'}

EXPERIMENT VERSIONS:
${multipleVersions === 'Yes' ? `- This experiment requires multiple versions with the following differences: ${versionDifference}` : '- Single version only'}

TECHNICAL SPECIFICATIONS:
- Generate complete HTML with embedded CSS and JavaScript in a single file
- Use semantic HTML5 elements
- Ensure cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Add proper error handling for all interactive elements
- Include detailed comments explaining the tracking functionality
- Make sure all buttons and interactive elements work properly
- Test that the Qualtrics redirect functions correctly

IMPORTANT: The webpage should look and feel exactly like a real website/app, not like an obvious experiment. Users should have a natural, authentic experience that matches their expectations from the original website.`;

    return prompt;
}

async function generateWebpageWithV0(screenshotPath, prompt) {
    try {
        const formData = new FormData();
        const imageBuffer = await fs.readFile(screenshotPath);
        formData.append('image', imageBuffer, {
            filename: 'screenshot.png',
            contentType: 'image/png'
        });
        formData.append('prompt', prompt);
        formData.append('framework', 'vanilla'); // <-- change from 'html' to 'vanilla'

        const response = await fetch(`${V0_API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${V0_API_KEY}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`v0.dev API error (${response.status}): ${errorData}`);
        }

        const result = await response.json();
        let generatedCode = result.code || result.html || result.content;

        if (!generatedCode) {
            throw new Error('No code generated by v0.dev API');
        }

        // Use the correct React → HTML fallback
        if (generatedCode.includes('export default') || generatedCode.includes('import React')) {
            generatedCode = await generateHTMLFromReact(generatedCode);
        }

        return generatedCode;

    } catch (error) {
        console.error('Error calling v0.dev API:', error);
        throw new Error(`Failed to generate webpage with v0.dev: ${error.message}`);
    }
}


async function generateHTMLFromReact(reactCode) {
    try {
        const response = await fetch(`${V0_API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${V0_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: reactCode,
                target: 'html',
                framework: 'vanilla' // must be vanilla
            })
        });

        if (response.ok) {
            const result = await response.json();
            return result.html || result.code;
        }
    } catch (error) {
        console.log('Could not convert React to HTML, using fallback');
    }
    return generateFallbackHTML();
}

function generateFallbackHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consumer Choice Experiment</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .choice-button {
            background: #007bff;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin: 15px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .choice-button:hover {
            background: #0056b3;
            transform: translateY(-2px);
        }
        .options-container {
            text-align: center;
            margin: 30px 0;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        p {
            color: #666;
            text-align: center;
            font-size: 18px;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Make Your Choice</h1>
        <p>Please select one of the options below to continue:</p>
        <div class="options-container">
            <button class="choice-button" onclick="recordChoice('option1')">Option 1</button>
            <button class="choice-button" onclick="recordChoice('option2')">Option 2</button>
            <button class="choice-button" onclick="recordChoice('option3')">Option 3</button>
        </div>
    </div>
    
    <script>
        // Tracking variables
        let startTime = Date.now();
        let allClicks = [];
        let maxScroll = 0;
        let choice = '';

        // Track all clicks
        document.addEventListener('click', function(e) {
            allClicks.push({
                element: e.target.tagName,
                time: Date.now() - startTime,
                x: e.clientX,
                y: e.clientY
            });
        });

        // Track scroll depth
        window.addEventListener('scroll', function() {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            maxScroll = Math.max(maxScroll, scrollPercent);
        });

        function recordChoice(selectedChoice) {
            choice = selectedChoice;
            const decisionTime = Date.now() - startTime;
            
            // Prepare data for Qualtrics
            const params = new URLSearchParams({
                choice: choice,
                decisionTime: decisionTime,
                allClicks: JSON.stringify(allClicks),
                maxScroll: maxScroll
            });
            
            // Redirect to Qualtrics with data
            window.location.href = 'YOUR_QUALTRICS_URL?' + params.toString();
        }
    </script>
</body>
</html>`;
}

async function sendEmails(userEmail, prompt, generatedCode) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: [userEmail, 'kmrkva@alumni.nd.edu'],
        subject: 'Your Generated Consumer Choice Webpage - ERA (v0.dev)',
        html: `
            <h2>Your ERA Generated Webpage (via v0.dev)</h2>
            <p>Hello,</p>
            <p>Your consumer choice webpage has been successfully generated using v0.dev's AI! Below you'll find both the prompt used and the generated HTML code.</p>
            
            <h3>Generated Prompt:</h3>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${prompt}</pre>
            
            <h3>Generated HTML Code (via v0.dev):</h3>
            <p>The complete HTML code is attached as a file, and also included below:</p>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${generatedCode}</pre>
            
            <p>This webpage was generated using v0.dev's advanced AI, which specializes in creating modern, responsive web components.</p>
            
            <p>You can copy this code and save it as an HTML file to use in your experiment.</p>
            
            <p>Best regards,<br>ERA Team</p>
        `,
        attachments: [
            {
                filename: 'generated-webpage-v0.html',
                content: generatedCode,
                contentType: 'text/html'
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'ERA v0.dev Integration',
        timestamp: new Date().toISOString()
    });
});

// Create uploads directory if it doesn't exist
async function createUploadsDir() {
    try {
        await fs.access('uploads');
    } catch {
        await fs.mkdir('uploads');
    }
}

// Start server
createUploadsDir().then(() => {
    app.listen(PORT, () => {
        console.log(`ERA server (v0.dev integration) running on port ${PORT}`);
        console.log('Make sure to set the following environment variables:');
        console.log('- V0_API_KEY: Your v0.dev API key');
        console.log('- EMAIL_USER: Your email address');
        console.log('- EMAIL_PASS: Your email password/app password');
        console.log('- NOTIFY_TO_EMAIL: Notification recipient for shared examples (optional, defaults to EMAIL_USER)');
    });
});

module.exports = app;