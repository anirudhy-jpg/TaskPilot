import sgMail from "@sendgrid/mail";

// Initialize SendGrid with the API Key
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn("SENDGRID_API_KEY environment variable is not defined.");
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Sends an email using SendGrid.
 * 
 * @param params - The email parameters including recipient, subject, and body.
 * @returns A promise resolving to a structured result indicating success or failure.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<SendEmailResult> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey) {
    const errorMsg = "SendGrid API key is missing. Email cannot be sent.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!fromEmail) {
    const errorMsg = "SENDGRID_FROM_EMAIL environment variable is not defined.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const msg = {
      to,
      from: fromEmail,
      subject,
      html,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error: any) {
    // Log details of the SendGrid failure
    console.error("SendGrid email delivery failed:", error);
    if (error.response && error.response.body) {
      console.error("SendGrid API Response Error Body:", JSON.stringify(error.response.body, null, 2));
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during email delivery.",
    };
  }
}
