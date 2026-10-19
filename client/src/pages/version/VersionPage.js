import React, { useEffect, useState } from 'react';
import { ENDPOINT } from '../../ENDPOINT';
import { CLIENT_VERSION } from '../../version';
import { isBetaChannel } from '../../components/BetaBadge';

const REPO_URL = 'https://github.com/siacavazzi/amogus';

function useVersionDocument() {
  useEffect(() => {
    const previousTitle = document.title;
    const robots = document.createElement('meta');
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex');
    document.head.appendChild(robots);
    document.documentElement.classList.add('version-document');
    document.body.classList.add('version-document');
    document.title = 'Version - Sus Party';
    return () => {
      robots.remove();
      document.documentElement.classList.remove('version-document');
      document.body.classList.remove('version-document');
      document.title = previousTitle;
    };
  }, []);
}

// Flat Signal look: dark screen, heavy type. Self-contained so it needs no shared stylesheet.
const VERSION_CSS = `
html.version-document, body.version-document { background: #101317; }
.version-page { min-height: 100dvh; max-width: 760px; margin: 0 auto; padding: 40px 20px; color: #fff;
  font-family: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 500; line-height: 1.5; }
.version-page h1 { font-size: clamp(2.4rem, 8vw, 3.6rem); font-weight: 900; letter-spacing: -0.045em; line-height: .95; margin: 0 0 28px; }
.version-page table { width: 100%; text-align: left; border-collapse: collapse; margin: 0 0 24px; }
.version-page th, .version-page td { padding: 12px 12px 12px 0; border-bottom: 1px solid rgba(255,255,255,.18); vertical-align: top; }
.version-page td { overflow-wrap: anywhere; }
.version-page thead th { white-space: nowrap; }
.version-page thead th { font-size: .85rem; font-weight: 800; color: rgba(255,255,255,.65); border-bottom: 3px solid #fff; }
.version-page tbody th { font-weight: 900; }
.version-page td strong { font-size: 1.15rem; font-weight: 900; color: #ffc21a; }
.version-page p { margin: 0 0 12px; }
.version-page a { color: #fff; font-weight: 800; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }
`;

function VersionRow({ label, info }) {
  if (!info) return <tr><th>{label}</th><td colSpan={3}>Loading…</td></tr>;
  if (info.error) return <tr><th>{label}</th><td colSpan={3}>{info.error}</td></tr>;
  return (
    <tr>
      <th>{label}</th>
      <td><strong>{info.version}</strong></td>
      <td>
        {info.commit
          ? <a href={`${REPO_URL}/commit/${info.commit}`} target="_blank" rel="noreferrer">{info.commit}</a>
          : '-'}
      </td>
      <td>{info.builtAt ? new Date(info.builtAt).toLocaleString() : '-'}</td>
    </tr>
  );
}

function VersionPage() {
  useVersionDocument();
  const [server, setServer] = useState(null);

  useEffect(() => {
    fetch(`${ENDPOINT}/api/version`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setServer({ version: data.version, commit: data.commit, builtAt: data.built_at }))
      .catch((err) => setServer({ error: `Could not reach the server (${err.message})` }));
  }, []);

  const mismatch = server && !server.error && server.version !== CLIENT_VERSION.version;

  return (
    <main className="version-page">
      <style>{VERSION_CSS}</style>
      <h1>Sus Party version</h1>
      <table>
        <thead>
          <tr><th /><th>Version</th><th>Commit</th><th>Built</th></tr>
        </thead>
        <tbody>
          <VersionRow label="Server" info={server} />
          <VersionRow label="This page" info={CLIENT_VERSION} />
        </tbody>
      </table>
      <p>
        {isBetaChannel()
          ? <>You are on <strong>beta</strong>. <a href="/version?beta=0">Switch to prod</a></>
          : <>You are on <strong>prod</strong>. <a href="/version?beta=1">Switch to beta</a></>}
      </p>
      {mismatch && (
        <p>
          The page and server versions differ. Your browser may have an older copy cached;
          reload to pick up the latest build.
        </p>
      )}
    </main>
  );
}

export default VersionPage;
