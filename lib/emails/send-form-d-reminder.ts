import { sendEmail } from "@/lib/resend";

interface FormDReminderEmailProps {
  email: string;
  fundName: string;
  amendmentDueDate: Date | null;
  filingDate: Date | null;
}

export async function sendFormDReminderEmail({
  email,
  fundName,
  amendmentDueDate,
  filingDate,
}: FormDReminderEmailProps) {
  const dueDate = amendmentDueDate 
    ? amendmentDueDate.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
    : "Unknown";

  const originalFilingDate = filingDate
    ? filingDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const now = new Date();
  const daysRemaining = amendmentDueDate
    ? Math.ceil((amendmentDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  const urgencyText = daysRemaining <= 0
    ? "OVERDUE - Immediate action required"
    : daysRemaining <= 7
    ? `URGENT - ${daysRemaining} days remaining`
    : `${daysRemaining} days remaining`;

  const subject = daysRemaining <= 0
    ? `[OVERDUE] SEC Form D Amendment Required - ${fundName}`
    : daysRemaining <= 7
    ? `[URGENT] SEC Form D Amendment Due Soon - ${fundName}`
    : `SEC Form D Amendment Reminder - ${fundName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: ${daysRemaining <= 0 ? '#dc2626' : daysRemaining <= 7 ? '#f59e0b' : '#2563eb'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Form D Amendment Reminder</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">${urgencyText}</p>
      </div>
      
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="margin-top: 0; color: #111;">Fund: ${fundName}</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">
              <strong>Original Filing Date</strong>
            </td>
            <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">
              ${originalFilingDate}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">
              <strong>Amendment Due Date</strong>
            </td>
            <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; ${daysRemaining <= 7 ? 'color: #dc2626; font-weight: bold;' : ''}">
              ${dueDate}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; background: white; border: 1px solid #e5e7eb;">
              <strong>Days Remaining</strong>
            </td>
            <td style="padding: 12px; background: white; border: 1px solid #e5e7eb; ${daysRemaining <= 0 ? 'color: #dc2626; font-weight: bold;' : ''}">
              ${daysRemaining <= 0 ? 'OVERDUE' : daysRemaining + ' days'}
            </td>
          </tr>
        </table>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">Action Required</h3>
          <p style="margin-bottom: 0; color: #92400e;">
            Under SEC Rule 503, issuers must file an annual amendment to Form D within 30 days 
            after the anniversary of the initial filing date. Failure to file may affect your 
            ability to rely on Regulation D exemptions.
          </p>
        </div>

        <div style="margin-top: 24px;">
          <h3>Next Steps:</h3>
          <ol style="line-height: 1.8;">
            <li>Review your Form D filing on EDGAR</li>
            <li>Prepare any updates to the offering information</li>
            <li>File the amendment through SEC EDGAR</li>
            <li>Update your records in the dataroom</li>
          </ol>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          This reminder was sent by BF Fund Dataroom. 
          Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send Form D reminder email:", error);
    return { success: false, error };
  }
}
