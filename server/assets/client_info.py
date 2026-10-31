"""Coarse, non-identifying labels for the browser a socket came from."""


def device_class(user_agent):
    ua = (user_agent or '').lower()
    if 'ipad' in ua or ('android' in ua and 'mobile' not in ua):
        return 'tablet'
    if any(value in ua for value in ('mobile', 'iphone', 'ipod')):
        return 'mobile'
    return 'desktop' if ua else 'unknown'


def os_family(user_agent):
    ua = (user_agent or '').lower()
    if any(value in ua for value in ('iphone', 'ipad', 'ipod')):
        return 'ios'
    if 'android' in ua:
        return 'android'
    if 'cros' in ua:
        return 'chromeos'
    if 'mac os x' in ua or 'macintosh' in ua:
        return 'macos'
    if 'windows' in ua:
        return 'windows'
    if 'linux' in ua:
        return 'linux'
    return 'other' if ua else 'unknown'


# In-app browsers first: they also carry Safari/Chrome tokens, and they drop sockets differently.
_BROWSERS = (
    ('instagram', 'instagram'), ('fban', 'facebook_app'), ('fbav', 'facebook_app'),
    ('snapchat', 'snapchat_app'), ('tiktok', 'tiktok_app'), ('musical_ly', 'tiktok_app'),
    ('gsa/', 'google_app'), ('line/', 'line_app'),
    ('samsungbrowser', 'samsung'), ('edg', 'edge'), ('opr/', 'opera'),
    ('firefox', 'firefox'), ('fxios', 'firefox'), ('crios', 'chrome'), ('chrome', 'chrome'),
    ('safari', 'safari'),
)


def browser_family(user_agent):
    ua = (user_agent or '').lower()
    if not ua:
        return 'unknown'
    for token, name in _BROWSERS:
        if token in ua:
            return name
    return 'other'


def describe(user_agent):
    return {
        'device_class': device_class(user_agent),
        'os_family': os_family(user_agent),
        'browser_family': browser_family(user_agent),
    }
