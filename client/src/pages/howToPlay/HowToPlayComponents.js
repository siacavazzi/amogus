import React from 'react';
import { ArrowRight } from 'lucide-react';

function joinClasses(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

export function ButtonLink({ href, variant = 'secondary', compact = false, className = '', children }) {
  return (
    <a
      href={href}
      className={joinClasses(
        'htp-button',
        `htp-button--${variant}`,
        compact && 'htp-button--compact',
        className,
      )}
    >
      {children}
    </a>
  );
}

export function JumpLinks({ links }) {
  return (
    <nav className="htp-jump-links" aria-label="Page sections">
      {links.map((link) => (
        <a key={link.href} href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}

export function Section({ id, kicker, title, intro, children }) {
  return (
    <section className="htp-section" id={id}>
      <div className="htp-section__header">
        <div>
          <p className="htp-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        {intro ? <p className="htp-section__intro">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function CardGrid({ columns = 2, className = '', children }) {
  return <div className={joinClasses('htp-grid', `htp-grid--${columns}`, className)}>{children}</div>;
}

export function InfoCard({ tone = 'neutral', icon: Icon, eyebrow, title, description, items }) {
  return (
    <article className={joinClasses('htp-card', `htp-card--${tone}`)}>
      {Icon ? (
        <div className="htp-card__icon" aria-hidden="true">
          <Icon size={20} strokeWidth={2} />
        </div>
      ) : null}
      {eyebrow ? <p className="htp-card__eyebrow">{eyebrow}</p> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {items?.length ? (
        <ul className="htp-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function RoleCard({ tone, label, icon: Icon, title, description, items }) {
  return (
    <article className={joinClasses('htp-card', 'htp-card--role', `htp-card--${tone}`)}>
      <div className="htp-role-card__header">
        <span className="htp-role-card__label">{label}</span>
        {Icon ? (
          <div className="htp-card__icon" aria-hidden="true">
            <Icon size={20} strokeWidth={2} />
          </div>
        ) : null}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <ul className="htp-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export function FlowStep({ step, title, description, note }) {
  return (
    <article className="htp-step">
      <div className="htp-step__number">{step}</div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {note ? <p className="htp-step__note">{note}</p> : null}
      </div>
    </article>
  );
}

export function NotePanel({ tone = 'neutral', title, children, className = '' }) {
  return (
    <div className={joinClasses('htp-note', `htp-note--${tone}`, className)}>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

export function FooterCta({ title, description, href, actionLabel }) {
  return (
    <div className="htp-footer-cta">
      <div>
        <p className="htp-kicker">{title}</p>
        <p className="htp-footer-cta__text">{description}</p>
      </div>
      <ButtonLink href={href} variant="primary">
        <span>{actionLabel}</span>
        <ArrowRight size={18} strokeWidth={2.4} />
      </ButtonLink>
    </div>
  );
}