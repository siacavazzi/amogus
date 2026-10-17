#!/usr/bin/env python3
"""Check public routes with the deployment configuration and an isolated Nginx server."""
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile
import time

repo = Path(__file__).resolve().parents[2]
nginx = shutil.which('nginx')
if not nginx:
    raise SystemExit('Install Nginx before this check.')
routes = json.loads((repo / 'client/src/seo/routes.json').read_text())


def free_port():
    with socket.socket() as server:
        server.bind(('127.0.0.1', 0))
        return server.getsockname()[1]


with tempfile.TemporaryDirectory(prefix='sus-party-seo-nginx-') as directory:
    root = Path(directory)
    (root / 'logs').mkdir()
    http_port, https_port = free_port(), free_port()
    certificate, key = root / 'cert.pem', root / 'key.pem'
    subprocess.run([
        'openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
        '-subj', '/CN=susparty.com', '-addext', 'subjectAltName=DNS:susparty.com,DNS:www.susparty.com',
        '-keyout', str(key), '-out', str(certificate),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    config = (repo / 'deploy/nginx-amogus.conf').read_text()
    config = re.sub(r'^\s*listen \[::\].*;\s*$', '', config, flags=re.M)
    config = config.replace('listen 80;', f'listen 127.0.0.1:{http_port};')
    config = config.replace('listen 443 ssl http2;', f'listen 127.0.0.1:{https_port} ssl http2;')
    config = config.replace('/etc/letsencrypt/live/susparty.com/fullchain.pem', str(certificate))
    config = config.replace('/etc/letsencrypt/live/susparty.com/privkey.pem', str(key))
    config = config.replace('/opt/amogus/client/build', str(repo / 'client/build'))
    config = config.replace('/opt/amogus-beta/client/build', str(repo / 'client/build'))
    config = config.replace('/var/log/nginx/amogus_', str(root / 'amogus_'))
    (root / 'site.conf').write_text(config)
    user = 'user root;\n' if os.geteuid() == 0 else ''
    # Override package defaults so the check needs no system directory access.
    (root / 'nginx.conf').write_text(user + '''pid logs/nginx.pid;
events {}
http {
    access_log logs/access.log;
    client_body_temp_path client_body_temp;
    proxy_temp_path proxy_temp;
    fastcgi_temp_path fastcgi_temp;
    uwsgi_temp_path uwsgi_temp;
    scgi_temp_path scgi_temp;
    types { text/html html; text/plain txt; application/xml xml; }
    include site.conf;
}
''')
    command = [nginx, '-p', str(root) + '/', '-c', 'nginx.conf', '-e', 'stderr']
    subprocess.run(command + ['-t'], check=True)
    with (root / 'process.log').open('w') as output:
        process = subprocess.Popen(command + ['-g', 'daemon off;'], stdout=output, stderr=output)
        try:
            for _ in range(50):
                if process.poll() is not None:
                    raise RuntimeError((root / 'process.log').read_text())
                try:
                    with socket.create_connection(('127.0.0.1', https_port), timeout=0.1):
                        break
                except OSError:
                    time.sleep(0.1)

            def request(path, host='susparty.com', scheme='https', cookie=None):
                port = https_port if scheme == 'https' else http_port
                subprocess.run([
                    'curl', '--silent', '--show-error', '--fail', '--max-time', '10', '--noproxy', '*',
                    '--cacert', str(certificate), '--resolve', f'{host}:{port}:127.0.0.1',
                    '--dump-header', str(root / 'headers'), '--output', str(root / 'body'),
                    *(['--cookie', cookie] if cookie else []),
                    f'{scheme}://{host}:{port}{path}',
                ], check=True)
                return (root / 'headers').read_text(), (root / 'body').read_text()

            for route in routes:
                if route.get('prerender') is False:
                    continue
                for suffix in ['', '?utm_source=seo-check'] + (['/'] if route['path'] != '/' else []):
                    headers, body = request(route['path'] + suffix)
                    assert re.match(r'HTTP/\S+ 200', headers), (route['path'], headers)
                    assert 'location:' not in headers.lower(), (route['path'], headers)
                    assert f'href="{route["canonical"]}"' in body, route['path']
                    assert re.search(r'content-type:\s*text/html', headers, re.I), headers

            for scheme, host in [('https', 'www.susparty.com'), ('http', 'www.susparty.com'), ('http', 'susparty.com')]:
                headers, _ = request('/among-us-irl-task-generator?room=Desk&room=Yard', host, scheme)
                assert re.match(r'HTTP/\S+ 301', headers), headers
                location = re.search(r'^location:\s*(.+)$', headers, re.I | re.M).group(1).strip()
                assert location == 'https://susparty.com/among-us-irl-task-generator?room=Desk&room=Yard', headers
            headers, robots = request('/robots.txt')
            assert re.match(r'HTTP/\S+ 200', headers), headers
            exclusions = re.findall(r'^Disallow:\s*(\S+)\s*$', robots, re.I | re.M)
            assert sorted(exclusions) == ['/dashboard', '/dashboard/'], robots

            # Beta channel: ?beta=1 opts in, the cookie keeps it, ?beta=0 opts out.
            # Prod responses carry neither the cookie nor a noindex header.
            headers, _ = request('/')
            assert not re.search(r'^(set-cookie|x-robots-tag):', headers, re.I | re.M), headers
            headers, _ = request('/play?beta=1')
            assert re.search(r'^set-cookie:\s*sus_channel=beta;', headers, re.I | re.M), headers
            assert re.search(r'^x-robots-tag:\s*noindex', headers, re.I | re.M), headers
            headers, _ = request('/play', cookie='sus_channel=beta')
            assert re.search(r'^x-robots-tag:\s*noindex', headers, re.I | re.M), headers
            # Pages without a prerendered snapshot fall back to /index.html internally
            headers, _ = request('/version?utm_source=x&beta=1')
            assert re.search(r'^set-cookie:\s*sus_channel=beta;', headers, re.I | re.M), headers
            headers, _ = request('/play?beta=0', cookie='sus_channel=beta')
            assert re.search(r'^set-cookie:\s*sus_channel=;.*Max-Age=0', headers, re.I | re.M), headers
            assert not re.search(r'^x-robots-tag:', headers, re.I | re.M), headers
            print(f'PASS {len(routes)} routes on Nginx: direct 200 responses, slash and query variants, canonical tags, crawl access, and host redirects.')
        finally:
            process.terminate()
            process.wait(timeout=10)
