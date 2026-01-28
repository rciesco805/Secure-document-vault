import FormDReminderEmail from "@/components/emails/form-d-reminder";
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
}: FormDReminderEmailProps) {
  const dueDate = amendmentDueDate 
    ? amendmentDueDate.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
    : "Unknown";

  const now = new Date();
  const daysRemaining = amendmentDueDate
    ? Math.ceil((amendmentDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  const subject = daysRemaining <= 0
    ? `[OVERDUE] SEC Form D Amendment Required - ${fundName}`
    : daysRemaining <= 7
    ? `[URGENT] SEC Form D Amendment Due Soon - ${fundName}`
    : `SEC Form D Amendment Reminder - ${fundName}`;

  const emailTemplate = FormDReminderEmail({
    fundName,
    deadline: dueDate,
    daysRemaining,
  });

  try {
    await sendEmail({
      to: email,
      subject,
      react: emailTemplate,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send Form D reminder email:", error);
    return { success: false, error };
  }
}
