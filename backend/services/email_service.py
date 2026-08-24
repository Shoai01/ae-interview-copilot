import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import email.utils
import os
import logging

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@viva-copilot.com")
PLATFORM_URL = "https://ae-interview-copilot.pages.dev"

# ─── Shared email wrapper ─────────────────────────────────────────────────────

def _base_layout(content: str) -> str:
    """Wraps email content in a premium responsive layout."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
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
            padding: 24px 20px !important;
          }}
          .content-padding {{
            padding: 24px 20px 16px !important;
          }}
          .card-padding {{
            padding: 16px 20px !important;
          }}
        }}
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
      <table class="outer-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
        <tr>
          <td align="center">
            <!-- Container Table -->
            <table class="email-container" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td class="header-padding" style="background: linear-gradient(135deg, #F26522 0%, #e04e0a 100%);padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Automation Edge</h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:500;">Viva Copilot Training Platform</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td class="content-padding" style="padding:36px 40px 20px;">
                  {content}
                </td>
              </tr>
              <!-- Body End -->
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

    msg = MIMEMultipart('alternative')
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    msg['Subject'] = subject
    msg['Date'] = email.utils.formatdate(localtime=True)
    msg['Message-ID'] = email.utils.make_msgid(domain=FROM_EMAIL.split('@')[-1] if '@' in FROM_EMAIL else 'viva-copilot.com')
    
    if not plain_text:
        plain_text = f"{subject}. Please view this email in an HTML-compatible client for full details."
    msg.attach(MIMEText(plain_text, 'plain'))
    msg.attach(MIMEText(body, 'html'))
    
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
    
    content = f"""
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">Hi {name} 👋</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
      Welcome aboard! Your training account on <strong>Viva Copilot</strong> has been successfully created.
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

    <!-- Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
            ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
          </p>
        </td>
      </tr>
    </table>

    <!-- Login Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="{PLATFORM_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#F26522 0%,#e04e0a 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
            Log In to Viva Copilot →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
      If you have any questions, please reach out to your trainer or administrator.
    </p>
    """
    
    body = _base_layout(content)
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
    
    content = f"""
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;">Hi {name} 👋</h2>
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
                <span style="color:#6b7280;font-size:13px;">📚 Module</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #bae6fd;text-align:right;">
                <strong style="color:#1a1a2e;font-size:14px;">{module_name}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #bae6fd;">
                <span style="color:#6b7280;font-size:13px;">⏱️ Duration</span>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #bae6fd;text-align:right;">
                <strong style="color:#1a1a2e;font-size:14px;">{duration_minutes} minutes</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;">
                <span style="color:#6b7280;font-size:13px;">❓ Questions</span>
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
          <p style="margin:0 0 6px;color:#166534;font-size:13px;font-weight:600;">💡 Quick Tips</p>
          <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
            • Find a quiet place with a stable internet connection<br>
            • Speak clearly and take your time with each answer<br>
            • Complete the exam before it expires (24 hours)
          </p>
        </td>
      </tr>
    </table>
    <!-- Start Exam Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="{PLATFORM_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#F26522 0%,#e04e0a 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
            Go to Dashboard & Start Exam →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;text-align:center;">
      Good luck! 🎯
    </p>
    """
    
    body = _base_layout(content)
    return send_email(to_email, subject, body, plain_text=plain_text)
