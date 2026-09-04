import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import email.utils
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@viva-copilot.com")
PLATFORM_URL = "https://ae-interview-copilot.pages.dev"

# Outlook (and many corporate mail policies) block remotely-hosted images by
# default, so a plain https:// <img src> silently fails to render there even
# though it loads fine in Gmail. Embedding the logo as a CID attachment makes
# it part of the message itself, so it displays regardless of that setting.
LOGO_CID = "ae-full-logo"
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "ae-full-logo.png")
LOGO_URL = f"cid:{LOGO_CID}"

# ─── Shared email wrapper ─────────────────────────────────────────────────────

def _base_layout(content: str, preheader: str = "") -> str:
    """Wraps email content in a premium responsive layout."""
    year = datetime.now().year
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <style>
        @media only screen and (max-width: 600px) {{
          .outer-table {{
            padding: 10px 0 !important;
          }}
          .email-container {{
            width: 100% !important;
            border-radius: 0px !important;
            box-shadow: none !important;
          }}
          .header-padding {{
            padding: 20px !important;
          }}
          .content-padding {{
            padding: 24px 20px 16px !important;
          }}
          .card-padding {{
            padding: 16px 20px !important;
          }}
          .footer-padding {{
            padding: 24px 20px !important;
          }}
        }}
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
      <!-- Preheader: shows as the inbox preview snippet, hidden in the body -->
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
        {preheader}
      </div>
      <div style="display:none;max-height:0;overflow:hidden;">&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
      <table class="outer-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
        <tr>
          <td align="center">
            <!-- Container Table -->
            <table class="email-container" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td class="header-padding" style="background-color:#ffffff;padding:28px 40px 24px;text-align:center;border-bottom:1px solid #f1f5f9;">
                  <img src="{LOGO_URL}" alt="AutomationEdge" width="180" height="22" style="display:block;margin:0 auto;width:180px;max-width:60%;height:auto;border:0;outline:none;-ms-interpolation-mode:bicubic;">
                  <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Viva Copilot Training Platform</p>
                </td>
              </tr>
              <!-- Accent bar -->
              <tr>
                <td style="height:4px;line-height:4px;font-size:0;background-color:#F26522;background-image:linear-gradient(90deg,#F26522 0%,#e04e0a 100%);">&nbsp;</td>
              </tr>
              <!-- Body -->
              <tr>
                <td class="content-padding" style="padding:36px 40px 20px;">
                  {content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td class="footer-padding" style="padding:28px 40px 32px;border-top:1px solid #f1f5f9;">
                  <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
                    This is an automated message from <strong style="color:#64748b;">Viva Copilot</strong>. If you weren't expecting this email, you can safely ignore it.
                  </p>
                  <p style="margin:0;color:#cbd5e1;font-size:12px;line-height:1.6;text-align:center;">
                    &copy; {year} AutomationEdge. All rights reserved. &nbsp;&middot;&nbsp;
                    <a href="mailto:{FROM_EMAIL}" style="color:#94a3b8;text-decoration:underline;">Contact Support</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def send_email(to_email: str, subject: str, body: str, plain_text: str = None):
    """
    Dispatch an email via SMTP. Falls back to mock console output if SMTP_HOST is not configured.
    Returns True on success, False on failure.
    """
    if not SMTP_HOST:
        print("\n" + "="*50)
        print("  MOCK EMAIL DISPATCH")
        print("="*50)
        print(f"  To:      {to_email}")
        print(f"  Subject: {subject}")
        print("-" * 50)
        print(plain_text or "(HTML body — see rendered email)")
        print("="*50 + "\n")
        return True

    msg = MIMEMultipart('related')
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    msg['Subject'] = subject
    msg['Date'] = email.utils.formatdate(localtime=True)
    msg['Message-ID'] = email.utils.make_msgid(domain=FROM_EMAIL.split('@')[-1] if '@' in FROM_EMAIL else 'viva-copilot.com')

    if not plain_text:
        plain_text = f"{subject}. Please view this email in an HTML-compatible client for full details."

    alt_part = MIMEMultipart('alternative')
    alt_part.attach(MIMEText(plain_text, 'plain'))
    alt_part.attach(MIMEText(body, 'html'))
    msg.attach(alt_part)

    if f"cid:{LOGO_CID}" in body:
        try:
            with open(LOGO_PATH, 'rb') as f:
                logo_part = MIMEImage(f.read())
            logo_part.add_header('Content-ID', f'<{LOGO_CID}>')
            logo_part.add_header('Content-Disposition', 'inline', filename='ae-full-logo.png')
            msg.attach(logo_part)
        except OSError as e:
            logger.warning(f"Could not attach inline logo: {e}")

    try:
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            
        if SMTP_USER and SMTP_PASS:
            server.login(SMTP_USER, SMTP_PASS)
            
        server.send_message(msg)
        server.quit()
        print(f"✅ EMAIL SUCCESS: Sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ EMAIL FAILED: Could not send to {to_email}. Error: {str(e)}")
        return False


# ─── Welcome Email ─────────────────────────────────────────────────────────────

def send_welcome_email(to_email: str, username: str, password: str, full_name: str = None):
    subject = "Welcome to Viva Copilot — Your Account is Ready"
    name = full_name if full_name else "there"
    
    plain_text = (
        f"Hi {name},\n\n"
        f"Welcome to Viva Copilot! Your training account has been created.\n\n"
        f"Your Login Credentials:\n"
        f"  Username: {username}\n"
        f"  Password: {password}\n\n"
        f"Log in here: {PLATFORM_URL}\n\n"
        f"Please change your password after your first login for security.\n\n"
        f"— The Automation Edge Team"
    )
    
    preheader = f"Your Viva Copilot training account is ready — sign in with the credentials inside."

    content = f"""
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">Hi {name},</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      Welcome aboard. Your training account on <strong>Viva Copilot</strong> has been created and is ready to use.
    </p>

    <!-- Credentials Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef7f2;border:1px solid #fde0cc;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td class="card-padding" style="padding:24px 28px;">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your Login Credentials</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #fde0cc;">
                <span style="color:#6b7280;font-size:13px;">Username</span>
              </td>
              <td style="padding:8px 0;border-bottom:1px solid #fde0cc;text-align:right;">
                <strong style="color:#1a1a2e;font-size:14px;">{username}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="color:#6b7280;font-size:13px;">Temporary Password</span>
              </td>
              <td style="padding:8px 0;text-align:right;">
                <code style="background:#fff3e6;color:#e04e0a;padding:4px 10px;border-radius:4px;font-size:14px;font-weight:600;">{password}</code>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Notice -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
            <strong>Important:</strong> For security, please change your password immediately after your first login.
          </p>
        </td>
      </tr>
    </table>

    <!-- Login Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="{PLATFORM_URL}" target="_blank" style="display:inline-block;background-color:#F26522;background-image:linear-gradient(135deg,#F26522 0%,#e04e0a 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
            Log In to Viva Copilot
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
      If you have any questions, please reach out to your trainer or administrator.
    </p>
    """

    body = _base_layout(content, preheader=preheader)
    return send_email(to_email, subject, body, plain_text=plain_text)


# ─── Session Assignment Email ──────────────────────────────────────────────────

def send_session_assignment_email(to_email: str, module_name: str, duration_minutes: int, full_name: str = None, question_count: int = None):
    subject = f"New Exam Assigned — {module_name}"
    name = full_name if full_name else "there"
    
    questions_text = f"{question_count} questions" if question_count else "Auto-calculated"
    
    plain_text = (
        f"Hi {name},\n\n"
        f"A new exam session has been assigned to you.\n\n"
        f"Exam Details:\n"
        f"  Module:     {module_name}\n"
        f"  Duration:   {duration_minutes} minutes\n"
        f"  Questions:  {questions_text}\n\n"
        f"Start your exam here: {PLATFORM_URL}\n\n"
        f"Complete the exam before it expires (24 hours).\n\n"
        f"Good luck!\n"
        f"— The Automation Edge Team"
    )
    
    preheader = f"Your {module_name} exam is ready — {duration_minutes} minutes, {questions_text.lower()}."

    content = f"""
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">Hi {name},</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      A new exam session has been assigned to you. Here are the details:
    </p>

    <!-- Exam Details Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td class="card-padding" style="padding:24px 28px;">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Exam Details</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #bae6fd;">
                <span style="color:#6b7280;font-size:13px;">Module</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #bae6fd;text-align:right;">
                <strong style="color:#1a1a2e;font-size:14px;">{module_name}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #bae6fd;">
                <span style="color:#6b7280;font-size:13px;">Duration</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #bae6fd;text-align:right;">
                <strong style="color:#1a1a2e;font-size:14px;">{duration_minutes} minutes</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;">
                <span style="color:#6b7280;font-size:13px;">Questions</span>
              </td>
              <td style="padding:10px 0;text-align:right;">
                <strong style="color:#1a1a2e;font-size:14px;">{questions_text}</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Tips Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:600;">Before you begin</p>
          <ul style="margin:0;padding-left:18px;color:#166534;font-size:13px;line-height:1.7;">
            <li>Find a quiet place with a stable internet connection</li>
            <li>Speak clearly and take your time with each answer</li>
            <li>Complete the exam before it expires (24 hours)</li>
          </ul>
        </td>
      </tr>
    </table>
    <!-- Start Exam Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="{PLATFORM_URL}" target="_blank" style="display:inline-block;background-color:#F26522;background-image:linear-gradient(135deg,#F26522 0%,#e04e0a 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
            Go to Dashboard &amp; Start Exam
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;text-align:center;">
      Good luck!
    </p>
    """

    body = _base_layout(content, preheader=preheader)
    return send_email(to_email, subject, body, plain_text=plain_text)
