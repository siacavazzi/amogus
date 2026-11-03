# Localization

The game screens come in English, French, Spanish, German and Romanian.

**Every translation is a machine draft.** None of it has been checked by a native speaker yet. Have someone fluent read through each `client/src/i18n/locales/<lang>.json` before relying on it.

## How it works

- `client/src/i18n/index.js` holds `t()`, `tn()` and `tk()`. The English text is the key, so a missing translation shows English and never breaks a screen.
- The language is picked once per page load: `?lang=fr`, then the picker's saved choice (`localStorage.sus_language`), then the browser's languages, then English. An English-first browser stays English. Headless Chrome (the SEO prerender) is always English.
- The 🌐 picker sits on the name screen and in the lobby footer. Choosing a language saves it and reloads the page.
- The server still sends English. Its messages are listed in `i18n/serverMessages.js` and `i18n/deathMessages.js`, so the phone translates them. A message with values in it (a task name, a player count) is matched through the templates registered there.
- Playwright runs with the `en-US` locale, so e2e tests always see English.
- Room codes, player names, timers and meltdown codes carry `translate="no"`. `utils/translateGuard.js` stops Chrome's own page translation from crashing React.

## Adding or changing a string

1. Wrap the English in `t('...')`. Use `t('Room {code}', { code })` for values and `tn(count, '{count} task', '{count} tasks')` for plurals. Use `tk('...')` in a lookup table, then show it with `t(value)`.
2. Run `node scripts/i18n-keys.js` to see what each language is missing. `node scripts/i18n-keys.js missing fr` prints the missing keys as JSON.
3. Add the translations to every file in `src/i18n/locales/`. A plural entry is keyed by the singular English and has `one` and `other`. Romanian also needs `few` (used for 0 and 2 to 19; 20 and up take "de": "20 de sarcini").
4. The jest test `src/__tests__/i18n/i18n.test.js` fails if a language is missing a string, has different placeholders, or keeps a string the code no longer uses.

`scripts/i18n-leftovers.js` lists English-looking text that isn't wrapped yet.

## Glossary

Keep these the same everywhere. The name **Sus Party** is never translated.

| English | Français | Español | Deutsch | Română |
|---|---|---|---|---|
| crew / crewmate | équipage / membre d'équipage | tripulación / tripulante | Crew / Crewmitglied | echipaj / membru al echipajului |
| intruder | intrus | intruso | Eindringling | intrus |
| meeting | réunion | reunión | Meeting | ședință |
| vent | conduit | conducto | Schacht | ventilație |
| task | tâche | tarea | Aufgabe | sarcină |
| room (game) | salon | sala | Raum | cameră |
| host | hôte | anfitrión | Host | gazdă |
| round | manche | ronda | Runde | rundă |
| meltdown | fusion | fusión | Kernschmelze | topire |
| card | carte | carta | Karte | carte |
| ENTER VENT | ENTRER DANS LE CONDUIT | ENTRAR AL CONDUCTO | IN DEN SCHACHT | INTRĂ ÎN VENTILAȚIE |
| CALL MEETING | LANCER UNE RÉUNION | CONVOCAR REUNIÓN | MEETING EINBERUFEN | CONVOACĂ ȘEDINȚA |

Cards:

| English | Français | Español | Deutsch | Română |
|---|---|---|---|---|
| Emergency Meeting | Réunion d'urgence | Reunión de emergencia | Notfall-Meeting | Ședință de urgență |
| EMP | IEM | PEM | EMP | EMP |
| Area Denial | Zone interdite | Zona prohibida | Sperrzone | Zonă interzisă |
| Fake Task | Fausse tâche | Tarea falsa | Falsche Aufgabe | Sarcină falsă |
| Taunt Message | Message moqueur | Mensaje burlón | Spott-Nachricht | Mesaj batjocoritor |
| Remote Sabotage | Sabotage à distance | Sabotaje remoto | Fernsabotage | Sabotaj de la distanță |
| Shorten Meltdown | Fusion accélérée | Fusión acelerada | Schnelle Kernschmelze | Topire rapidă |

### "sus" in each language

- French and German players already say "sus", so it stays in the game text.
- Spanish "sus" means "their", so "be sus" reads as broken grammar. The game text says "sospechoso" instead.
- Romanian "sus" means "up", so "too sus" would read as "too high up". The game text says "suspect" instead.

Tone: informal "you" everywhere (tu / tú / du / tu).
