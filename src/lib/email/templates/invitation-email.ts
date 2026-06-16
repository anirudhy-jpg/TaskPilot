interface InvitationEmailParams {
  inviterName: string;
  workspaceName: string;
  projectName: string;
  invitationUrl: string;
}

/**
 * Generates the HTML body for the workspace invitation email.
 */
export function getInvitationEmailHtml({
  inviterName,
  workspaceName,
  projectName,
  invitationUrl,
}: InvitationEmailParams): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workspace Invitation - TaskPilot</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f8fafc;
          color: #334155;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #1e293b;
          padding: 32px;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: 800;
          color: #f59e0b;
          text-decoration: none;
          letter-spacing: -0.025em;
        }
        .logo span {
          color: #ffffff;
        }
        .content {
          padding: 40px 32px;
          text-align: left;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .description {
          font-size: 15px;
          line-height: 1.6;
          color: #475569;
          margin-bottom: 24px;
        }
        .details-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 32px;
        }
        .details-row {
          margin-bottom: 12px;
          font-size: 14px;
        }
        .details-row:last-child {
          margin-bottom: 0;
        }
        .details-label {
          font-weight: 600;
          color: #64748b;
          display: inline-block;
          width: 120px;
        }
        .details-value {
          font-weight: 700;
          color: #0f172a;
        }
        .button-container {
          text-align: center;
          margin-bottom: 32px;
        }
        .button {
          display: inline-block;
          background-color: #f59e0b;
          color: #0f172a !important;
          font-size: 15px;
          font-weight: 800;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 10px;
          box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2);
          transition: background-color 0.2s;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #94a3b8;
        }
        .footer-link {
          color: #f59e0b;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header / Logo -->
        <div class="header">
          <a href="#" class="logo">Task<span>Pilot</span></a>
        </div>

        <!-- Main Content -->
        <div class="content">
          <h2 class="title">You've been invited!</h2>
          <p class="description">
            Hello, <br/><br/>
            <strong>${inviterName}</strong> has invited you to collaborate on <strong>TaskPilot</strong>. You will be joining their workspace to collaborate on projects and track tasks.
          </p>

          <!-- Invitation Details Card -->
          <div class="details-card">
            <div class="details-row">
              <span class="details-label">Workspace:</span>
              <span class="details-value">${workspaceName}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Project:</span>
              <span class="details-value">${projectName}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Invited By:</span>
              <span class="details-value">${inviterName}</span>
            </div>
          </div>

          <!-- CTA Button -->
          <div class="button-container">
            <a href="${invitationUrl}" class="button" target="_blank">Accept Invitation</a>
          </div>

          <p class="description" style="font-size: 13px; color: #64748b;">
            If you don't have a TaskPilot account yet, clicking the button will guide you to set up your account and automatically join the workspace.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>This invitation was sent by TaskPilot. If you did not expect this invitation, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} TaskPilot. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
