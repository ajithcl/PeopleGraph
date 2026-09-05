"""Email delivery for invites — SMTP when configured, otherwise console log."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from peoplegraph.config import Config

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return bool(Config.SMTP_HOST and Config.SMTP_FROM)


def send_email(to_email: str, subject: str, text_body: str, html_body: str = None) -> dict:
    """
    Returns {ok: bool, delivery: 'smtp'|'console'|'error', error?: str}
    """
    if not to_email:
        return {'ok': False, 'delivery': 'error', 'error': 'No recipient'}

    if not smtp_configured():
        logger.info(
            'EMAIL (console fallback) to=%s subject=%s\n%s',
            to_email,
            subject,
            text_body,
        )
        return {'ok': True, 'delivery': 'console'}

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = Config.SMTP_FROM
    msg['To'] = to_email
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    if html_body:
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    try:
        if Config.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT, timeout=20)
        else:
            server = smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=20)
            if Config.SMTP_USE_TLS:
                server.starttls()

        with server:
            if Config.SMTP_USER:
                server.login(Config.SMTP_USER, Config.SMTP_PASSWORD or '')
            server.sendmail(Config.SMTP_FROM, [to_email], msg.as_string())

        logger.info('Email sent via SMTP to %s', to_email)
        return {'ok': True, 'delivery': 'smtp'}
    except Exception as e:
        logger.error('SMTP send failed: %s', e)
        return {'ok': False, 'delivery': 'error', 'error': str(e)}


def send_invite_email(to_email: str, space_name: str, role: str, invite_url: str, inviter_name: str = '') -> dict:
    subject = f"You're invited to {space_name} on PeopleGraph"
    inviter_line = f'{inviter_name} invited you' if inviter_name else 'You have been invited'
    text = (
        f'{inviter_line} to join the private kinship space "{space_name}" '
        f'as {role}.\n\n'
        f'Open this link to create your account:\n{invite_url}\n\n'
        f'This invite expires according to the space settings.\n'
        f'If you did not expect this email, you can ignore it.\n'
    )
    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 520px; line-height: 1.5;">
      <h2 style="color: #4f46e5;">PeopleGraph invite</h2>
      <p>{inviter_line} to join <strong>{space_name}</strong> as <strong>{role}</strong>.</p>
      <p><a href="{invite_url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;">Accept invite</a></p>
      <p style="color:#64748b;font-size:14px;">Or paste this link:<br>{invite_url}</p>
    </div>
    """
    return send_email(to_email, subject, text, html)
