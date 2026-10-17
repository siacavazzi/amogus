"""
Running version of the server.

The deploy workflow writes server/version.json on every push to main. Local
runs have no such file, so they fall back to git, then to "dev".
"""
import json
import os
import subprocess

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(SERVER_DIR, 'version.json')


def _from_file():
    try:
        with open(VERSION_FILE) as f:
            info = json.load(f)
        if isinstance(info, dict) and info.get('version'):
            return info
    except (OSError, ValueError):
        pass
    return None


def _from_git():
    try:
        commit = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'],
            cwd=SERVER_DIR, stderr=subprocess.DEVNULL, timeout=2,
        ).decode().strip()
    except Exception:
        return None
    return {'version': f'dev-{commit}', 'commit': commit} if commit else None


def load_version_info():
    info = _from_file() or _from_git() or {'version': 'dev'}
    info.setdefault('commit', None)
    info.setdefault('built_at', None)
    return info


VERSION_INFO = load_version_info()
VERSION = VERSION_INFO['version']
