import React, { useEffect, useState } from 'react';
import { ENDPOINT } from '../../ENDPOINT';
import { CLIENT_VERSION } from '../../version';
import { isBetaChannel } from '../../components/BetaBadge';
import '../admin/AdminDashboard.css';

const REPO_URL = 'https://github.com/siacavazzi/amogus';

function useVersionDocument() {
  useEffect(() => {
    const previousTitle = document.title;
    const robots = document.createElement('meta');
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex');
    document.head.appendChild(robots);
    document.documentElement.classList.add('adm-document');
    document.body.classList.add('adm-document');
    document.title = 'Version - Sus Party';
    return () => {
      robots.remove();
      document.documentElement.classList.remove('adm-document');
      document.body.classList.remove('adm-document');
      document.title = previousTitle;
    };
  }, []);
}

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
    <main className="adm-shell version-page" style={{ padding: '2rem 1rem', maxWidth: 720, margin: '0 auto' }}>
      <style>{'.version-page a { text-decoration: underline; }'}</style>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Sus Party version</h1>
      <table style={{ width: '100%', textAlign: 'left', borderSpacing: '0 0.5rem' }}>
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
