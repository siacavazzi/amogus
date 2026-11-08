"""The sign-in code email, sent through Resend (https://resend.com).

Set RESEND_API_KEY to turn email codes on. AUTH_EMAIL_FROM changes the sender
(default "Sus Party <signin@susparty.com>"; the domain must be verified in Resend).
"""

import html
import json
import logging
import os
import urllib.request

logger = logging.getLogger('app_logger')

RESEND_URL = 'https://api.resend.com/emails'
DEFAULT_FROM = 'Sus Party <signin@susparty.com>'

# subject, line 1 (before the code), line 2 (after the code). {code} is the 4 digits.
TEXT = {
    'en': ('Your Sus Party code: {code}',
           'Here is your code to sign in to Sus Party:',
           'It works for 10 minutes. If you didn\'t ask for it, you can ignore this email.'),
    'fr': ('Ton code Sus Party : {code}',
           'Voici ton code pour te connecter à Sus Party :',
           'Il est valable 10 minutes. Si tu ne l\'as pas demandé, tu peux ignorer cet e-mail.'),
    'es': ('Tu código de Sus Party: {code}',
           'Este es tu código para iniciar sesión en Sus Party:',
           'Sirve durante 10 minutos. Si no lo pediste, puedes ignorar este correo.'),
    'de': ('Dein Sus Party Code: {code}',
           'Hier ist dein Code für die Anmeldung bei Sus Party:',
           'Er gilt 10 Minuten. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.'),
    'ro': ('Codul tău Sus Party: {code}',
           'Acesta este codul tău de conectare la Sus Party:',
           'Este valabil 10 minute. Dacă nu l-ai cerut, poți ignora acest e-mail.'),
    'pt': ('Seu código do Sus Party: {code}',
           'Este é o seu código para entrar no Sus Party:',
           'Ele vale por 10 minutos. Se você não pediu, pode ignorar este e-mail.'),
    'no': ('Koden din for Sus Party: {code}',
           'Her er koden din for å logge inn på Sus Party:',
           'Den virker i 10 minutter. Hvis du ikke ba om den, kan du se bort fra denne e-posten.'),
    'sv': ('Din kod för Sus Party: {code}',
           'Här är din kod för att logga in på Sus Party:',
           'Den fungerar i 10 minuter. Om du inte bad om den kan du strunta i det här mejlet.'),
}
ALIASES = {'nb': 'no', 'nn': 'no'}


def email_language(lang):
    base = lang.lower().split('-')[0] if isinstance(lang, str) else ''
    base = ALIASES.get(base, base)
    return base if base in TEXT else 'en'


def compose(code, lang='en'):
    subject, before, after = TEXT[email_language(lang)]
    subject = subject.format(code=code)
    text = f'{before}\n\n{code}\n\n{after}\n\nsusparty.com'
    body = (
        '<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:16px;color:#141726;max-width:420px">'
        f'<p>{html.escape(before)}</p>'
        f'<p style="font-size:36px;font-weight:800;letter-spacing:8px;margin:18px 0">{code}</p>'
        f'<p style="color:#596079">{html.escape(after)}</p>'
        '<p style="color:#596079">susparty.com</p></div>'
    )
    return subject, text, body


def email_configured():
    return bool(os.environ.get('RESEND_API_KEY'))


def send_code(to, code, lang='en'):
    """True when Resend accepted the email."""
    key = os.environ.get('RESEND_API_KEY')
    if not key:
        return False
    subject, text, body = compose(code, lang)
    payload = json.dumps({
        'from': os.environ.get('AUTH_EMAIL_FROM') or DEFAULT_FROM,
        'to': [to],
        'subject': subject,
        'text': text,
        'html': body,
    }).encode()
    request = urllib.request.Request(RESEND_URL, data=payload, method='POST', headers={
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'User-Agent': 'SusParty/1.0',
    })
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return 200 <= response.status < 300
    except Exception as exc:  # network error or Resend said no
        logger.warning(f'Sign-in email was not sent: {type(exc).__name__}: {getattr(exc, "code", "")}')
        return False
