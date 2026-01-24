"""
Email utility module for sending alerts and notifications.
Uses Hostinger SMTP server.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

logger = logging.getLogger(__name__)

# Email configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.hostinger.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "admin@invoaice.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Invoaice")

# Low balance threshold in paise (₹200 = 20000 paise)
LOW_BALANCE_THRESHOLD = int(os.getenv("LOW_BALANCE_THRESHOLD", "20000"))


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> bool:
    """
    Send an email using Hostinger SMTP server.

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body of the email
        text_content: Plain text alternative (optional)

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD not configured. Email not sent.")
        return False

    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
        msg["To"] = to_email

        # Add plain text part
        if text_content:
            part1 = MIMEText(text_content, "plain")
            msg.attach(part1)

        # Add HTML part
        part2 = MIMEText(html_content, "html")
        msg.attach(part2)

        # Connect to SMTP server using SSL
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        logger.info(f"Email sent successfully to {to_email}: {subject}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending email to {to_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def get_low_balance_email_html(user_name: str, balance_rupees: float, company_name: Optional[str] = None) -> str:
    """Generate HTML content for low balance alert email."""

    greeting = f"Dear {user_name},"
    if company_name:
        greeting = f"Dear {user_name} ({company_name}),"

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Low Balance Alert - Invoaice</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                ⚠️ Low Balance Alert
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                {greeting}
                            </p>

                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Your Invoaice wallet balance is running low. Your current balance is:
                            </p>

                            <!-- Balance Box -->
                            <div style="background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                                <p style="margin: 0; color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Current Balance</p>
                                <p style="margin: 10px 0 0; color: #dc2626; font-size: 36px; font-weight: 700;">₹{balance_rupees:.2f}</p>
                            </div>

                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                <strong>Important:</strong> When your balance reaches ₹0, your WhatsApp messages will stop sending automatically. To ensure uninterrupted service, please recharge your wallet at your earliest convenience.
                            </p>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://akashvanni.com/add-money"
                                   style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                                    Recharge Now
                                </a>
                            </div>

                            <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Need help? Simply reply to this email or contact our support team.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center; line-height: 1.5;">
                                This is an automated message from Invoaice.<br>
                                © 2024 Invoaice. All rights reserved.
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


def get_low_balance_email_text(user_name: str, balance_rupees: float, company_name: Optional[str] = None) -> str:
    """Generate plain text content for low balance alert email."""

    greeting = f"Dear {user_name},"
    if company_name:
        greeting = f"Dear {user_name} ({company_name}),"

    return f"""
{greeting}

LOW BALANCE ALERT

Your Invoaice wallet balance is running low. Your current balance is:

₹{balance_rupees:.2f}

IMPORTANT: When your balance reaches ₹0, your WhatsApp messages will stop sending automatically. To ensure uninterrupted service, please recharge your wallet at your earliest convenience.

Recharge your wallet: https://akashvanni.com/add-money

Need help? Simply reply to this email or contact our support team.

---
This is an automated message from Invoaice.
© 2024 Invoaice. All rights reserved.
"""


def send_low_balance_alert(user_email: str, user_name: str, balance_paise: int, company_name: Optional[str] = None) -> bool:
    """
    Send low balance alert email to user.

    Args:
        user_email: User's email address
        user_name: User's name
        balance_paise: Current balance in paise
        company_name: User's company name (optional)

    Returns:
        bool: True if email was sent successfully
    """
    balance_rupees = balance_paise / 100

    subject = f"⚠️ Low Balance Alert - Your wallet has ₹{balance_rupees:.2f} remaining"
    html_content = get_low_balance_email_html(user_name, balance_rupees, company_name)
    text_content = get_low_balance_email_text(user_name, balance_rupees, company_name)

    return send_email(user_email, subject, html_content, text_content)


def check_and_send_low_balance_alert(user) -> bool:
    """
    Check if user's balance is below threshold and send alert if needed.
    This should be called after any balance deduction.

    Args:
        user: User model instance with email, name, balance, and company_name

    Returns:
        bool: True if alert was sent, False otherwise
    """
    if user.balance < LOW_BALANCE_THRESHOLD:
        return send_low_balance_alert(
            user_email=user.email,
            user_name=user.name,
            balance_paise=user.balance,
            company_name=user.company_name
        )
    return False
