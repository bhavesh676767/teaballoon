const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "hello@teaballoon.com";
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "TeaBalloon";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type SendReplyEmailParams = {
  originalPosterEmail: string;
  originalMessage: string;
  replyMessage: string;
  gifUrl?: string;
};

// Generates the stylized comic-friendly HTML email to send via Brevo
function buildReplyEmailHTML(original: string, reply: string, gif?: string) {
  const gifSection = gif 
    ? `<div style="padding: 10px; text-align: center; background-color: #f7f7f7; border: 3px dashed #ddd; border-radius: 12px; margin-bottom: 20px;">
         <img src="${gif}" style="max-width: 100%; border-radius: 8px;" alt="GIF Message" />
       </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <body style="margin:0; padding:30px; background-color:#fffef5; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- Container -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:500px; margin:auto; background-color:#ffffff; border:4px solid #111111; border-radius:16px; box-shadow:6px 6px 0px #111111;">
        <tr>
          <td style="padding: 30px; text-align: left;">
            
            <!-- Header bar -->
            <div style="font-size: 14px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #111; margin-bottom: 20px;">
              🎈 TEABALLOON
            </div>

            <h2 style="font-size: 24px; font-weight: 800; color: #111; margin: 0 0 16px 0;">
              Someone replied to your balloon!
            </h2>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 24px;">
              A stranger from the sky found your secret and left a response.
            </p>

            <!-- Original Message (muted) -->
            <div style="padding: 16px; background-color: #f7f7f7; border: 3px solid #ddd; border-radius: 12px; margin-bottom: 20px;">
              <p style="font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; margin: 0 0 6px 0;">Your Secret:</p>
              <p style="font-size: 16px; font-style: italic; color: #555; margin: 0;">"${original}"</p>
            </div>

            <!-- The Anonymous Reply (highlighted) -->
            <div style="padding: 20px; background-color: #ffe66d; border: 3px solid #111; border-radius: 12px; margin-bottom: 20px;">
              <p style="font-size: 12px; font-weight: bold; color: #111; text-transform: uppercase; margin: 0 0 8px 0;">Their Reply:</p>
              <p style="font-size: 20px; font-weight: bold; color: #111; margin: 0; line-height: 1.4;">
                "${reply}"
              </p>
            </div>

            ${gifSection}

            <!-- CTA / Disclaimer -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="text-align: center;">
                  <a href="${APP_URL}" style="display: inline-block; padding: 14px 24px; background-color: #4ecdc4; color: #111; text-decoration: none; font-weight: 900; border: 3px solid #111; border-radius: 12px; margin-bottom: 20px;">
                    FLY BACK TO THE SKY 🎈
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
              <strong>P.S.</strong> Your email is completely hidden from them, and their identity is hidden from you. Stay safe in the clouds!
            </p>

          </td>
        </tr>
      </table>

    </body>
    </html>
  `;
}

export async function sendReplyNotificationEmail({ originalPosterEmail, originalMessage, replyMessage, gifUrl }: SendReplyEmailParams) {
  if (!BREVO_API_KEY) {
    console.warn("BREVO_API_KEY is missing. Email skipped.");
    return false;
  }

  const endpoint = "https://api.brevo.com/v3/smtp/email";
  
  const payload = {
    sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
    to: [{ email: originalPosterEmail }],
    subject: "🎈 Someone replied to your secret!",
    htmlContent: buildReplyEmailHTML(originalMessage, replyMessage, gifUrl),
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Brevo API Error:", res.status, errData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to execute Brevo fetch:", error);
    return false;
  }
}
