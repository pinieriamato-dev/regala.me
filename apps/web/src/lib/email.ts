export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log('sendEmail stub', { to, subject });
    return;
  }
  const { Resend } = await import('resend');
  const resend = new Resend(key);
  await resend.emails.send({ from: 'no-reply@regala.me', to, subject, html });
}
