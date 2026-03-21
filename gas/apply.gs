/**
 * Workeron.ai - Job Application Form Handler
 * 
 * This script handles job applications from the "Join the Team" form
 * and sends notifications to sales@workeron.ai
 * 
 * Setup Instructions:
 * 1. Create a new Google Apps Script project
 * 2. Copy this code into the script editor
 * 3. Create a Google Spreadsheet for storing applications
 * 4. Replace YOUR_SPREADSHEET_ID with your actual spreadsheet ID
 * 5. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 6. Copy the Web App URL and paste it into index.html as APPLY_SCRIPT_URL
 */

// Configuration
const CONFIG = {
  // Replace with your Google Spreadsheet ID
  // Find it in the URL: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
  
  // Sheet name where applications will be stored
  SHEET_NAME: 'Applications',
  
  // Email to receive notifications
  NOTIFICATION_EMAIL: 'websiteforms@workeron.ai',
  
  // CC email (optional)
  CC_EMAIL: ''
};

/**
 * Handle POST requests from the application form
 */
function doPost(e) {
  try {
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.name || !data.email) {
      return createResponse(false, 'Name and email are required');
    }
    
    // Save to Google Sheets
    saveToSheet(data);
    
    // Send email notification
    sendNotificationEmail(data);
    
    // Return success response
    return createResponse(true, 'Application submitted successfully');
    
  } catch (error) {
    Logger.log('Error processing application: ' + error.toString());
    return createResponse(false, 'Error processing application: ' + error.toString());
  }
}

/**
 * Save application data to Google Sheets
 */
function saveToSheet(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
      
      // Add headers
      sheet.appendRow([
        'Timestamp',
        'Name',
        'Email',
        'Role',
        'LinkedIn / Portfolio',
        'Status'
      ]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#21F0D1');
      headerRange.setFontColor('#000000');
    }
    
    // Append application data
    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.role || 'Not specified',
      data.linkedin || '',
      'New'
    ]);
    
    Logger.log('Application saved to sheet: ' + data.email);
    
  } catch (error) {
    Logger.log('Error saving to sheet: ' + error.toString());
    throw error;
  }
}

/**
 * Send email notification to sales team
 */
function sendNotificationEmail(data) {
  try {
    const subject = `🎯 New Job Application: ${data.role || 'General Application'}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #21F0D1 0%, #1AC9B0 100%);
            color: #000;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
          }
          .field {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #f0f0f0;
          }
          .field:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #21F0D1;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .value {
            color: #333;
            font-size: 15px;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 8px 8px;
            font-size: 12px;
            color: #666;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #21F0D1;
            color: #000;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 15px;
          }
          .links {
            margin-top: 15px;
          }
          .links a {
            color: #21F0D1;
            text-decoration: none;
            margin: 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎯 New Job Application</h1>
        </div>
        
        <div class="content">
          <div class="field">
            <div class="label">Candidate Name</div>
            <div class="value">${data.name || 'Not provided'}</div>
          </div>
          
          <div class="field">
            <div class="label">Email Address</div>
            <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
          </div>
          
          <div class="field">
            <div class="label">Role Applied For</div>
            <div class="value">${data.role || 'Not specified'}</div>
          </div>
          
          ${data.linkedin ? `
          <div class="field">
            <div class="label">LinkedIn / Portfolio</div>
            <div class="value"><a href="${data.linkedin}" target="_blank">${data.linkedin}</a></div>
          </div>
          ` : ''}
          
          <div class="field">
            <div class="label">Submitted</div>
            <div class="value">${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
          </div>
          
          <div class="links">
            <a href="mailto:${data.email}?subject=Re: Your Application at Workeron.ai" class="button">
              Reply to Candidate
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p>This application was submitted via the Workeron.ai website.</p>
          <p>View all applications in your <a href="https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}" target="_blank">Google Spreadsheet</a></p>
        </div>
      </body>
      </html>
    `;
    
    const plainBody = `
New Job Application Received

Candidate: ${data.name || 'Not provided'}
Email: ${data.email}
Role: ${data.role || 'Not specified'}
LinkedIn / Portfolio: ${data.linkedin || 'Not provided'}

---
Submitted: ${new Date().toLocaleString()}
View all applications: https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}
    `;
    
    // Send email
    const emailOptions = {
      to: CONFIG.NOTIFICATION_EMAIL,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: 'Workeron.ai Careers'
    };
    
    // Add CC if configured
    if (CONFIG.CC_EMAIL) {
      emailOptions.cc = CONFIG.CC_EMAIL;
    }
    
    MailApp.sendEmail(emailOptions);
    
    Logger.log('Notification email sent to: ' + CONFIG.NOTIFICATION_EMAIL);
    
  } catch (error) {
    Logger.log('Error sending email: ' + error.toString());
    // Don't throw error - we still want to save the application even if email fails
  }
}

/**
 * Create JSON response
 */
function createResponse(success, message) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function - run this to verify setup
 */
function testApplication() {
  const testData = {
    name: 'Test Candidate',
    email: 'test@example.com',
    role: 'Fullstack Developer',
    linkedin: 'https://linkedin.com/in/testuser',
    timestamp: new Date().toISOString()
  };
  
  try {
    saveToSheet(testData);
    sendNotificationEmail(testData);
    Logger.log('✅ Test successful! Check your email and spreadsheet.');
  } catch (error) {
    Logger.log('❌ Test failed: ' + error.toString());
  }
}
