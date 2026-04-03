/**
 * Portal Access Email Template
 * Email sent to candidates when they request portal access
 */

export interface PortalAccessEmailProps {
  candidateName: string;
  candidateEmail: string;
  companyName: string;
  companyLogo?: string | null;
  portalUrl: string;
  expiresIn: string;
}

/**
 * Generate HTML email for portal access
 */
export function generatePortalAccessEmailHtml(props: PortalAccessEmailProps): string {
  const { candidateName, companyName, companyLogo, portalUrl, expiresIn } = props;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Your Candidate Portal</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      padding: 30px;
      text-align: center;
    }
    .header img {
      max-width: 150px;
      height: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .message {
      color: #4b5563;
      margin-bottom: 25px;
    }
    .features {
      background-color: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .features h3 {
      margin: 0 0 15px 0;
      color: #374151;
      font-size: 16px;
    }
    .features ul {
      margin: 0;
      padding-left: 20px;
      color: #4b5563;
    }
    .features li {
      margin-bottom: 8px;
    }
    .cta-button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin: 10px 0;
    }
    .cta-button:hover {
      background-color: #2563eb;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .expiry {
      color: #6b7280;
      font-size: 14px;
      text-align: center;
      margin-top: 15px;
    }
    .security-notice {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .security-notice p {
      margin: 0;
      font-size: 14px;
      color: #1e40af;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
    .ignore-notice {
      color: #9ca3af;
      font-size: 13px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" />` : ''}
      <h1>Candidate Portal Access</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Hello, <strong>${candidateName}</strong>! 👋</p>
      
      <p class="message">
        You requested access to your candidate portal at <strong>${companyName}</strong>. 
        Click the button below to securely access your personal dashboard.
      </p>
      
      <div class="features">
        <h3>What you can do in the portal:</h3>
        <ul>
          <li>📊 Track your application status in real-time</li>
          <li>📅 Schedule and confirm interviews</li>
          <li>📝 Complete your profile and assessments</li>
          <li>💬 Message the recruitment team</li>
          <li>📄 Upload documents and certificates</li>
        </ul>
      </div>
      
      <div class="cta-container">
        <a href="${portalUrl}" class="cta-button">Access Your Portal</a>
        <p class="expiry">⏰ This link will expire in ${expiresIn}</p>
      </div>
      
      <div class="security-notice">
        <p>
          <strong>🔒 Security Notice:</strong> This link is personal and non-transferible. 
          Do not share it with others. If you didn't request this access, you can safely ignore this email.
        </p>
      </div>
      
      <p class="ignore-notice">
        If you did not request access to the candidate portal, please ignore this email. 
        No action is required on your part.
      </p>
    </div>
    
    <div class="footer">
      <p>
        This email was sent by ${companyName}.<br>
        If you have questions, please contact the recruitment team.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email for portal access
 */
export function generatePortalAccessEmailText(props: PortalAccessEmailProps): string {
  const { candidateName, companyName, portalUrl, expiresIn } = props;

  return `
CANDIDATE PORTAL ACCESS

Hello, ${candidateName}!

You requested access to your candidate portal at ${companyName}.

Access your portal here:
${portalUrl}

⏰ This link will expire in ${expiresIn}

WHAT YOU CAN DO IN THE PORTAL:
• Track your application status in real-time
• Schedule and confirm interviews
• Complete your profile and assessments
• Message the recruitment team
• Upload documents and certificates

SECURITY NOTICE:
This link is personal and non-transferible. Do not share it with others.
If you didn't request this access, you can safely ignore this email.

---
This email was sent by ${companyName}.
If you have questions, please contact the recruitment team.
  `.trim();
}

/**
 * Email template configuration for ResendEmailService
 */
export const PORTAL_ACCESS_EMAIL_TEMPLATE = {
  id: 'PORTAL_ACCESS',
  subject: 'Access Your Candidate Portal - {companyName}',
  html: generatePortalAccessEmailHtml,
  text: generatePortalAccessEmailText,
};
