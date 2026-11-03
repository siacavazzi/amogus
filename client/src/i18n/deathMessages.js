// The server picks a death message in English (server/assets/player.py). Phones show it in their
// own language: fixed lines are catalog keys, and the lines that quote a task are matched back to
// their template so the task text stays as the host wrote it. Keep this list in sync with the server.
import { registerTemplates, t, tk } from './index';

export const DEATH_MESSAGES = [
    tk('was yeeted into the cold vacuum of space by popular demand'),
    tk('got democratically deleted from existence'),
    tk('was voted off the island'),
    tk('learned that democracy sometimes really sucks'),
    tk('was ejected with extreme prejudice'),
    tk('took an unscheduled spacewalk without a suit'),
    tk('found out what happens when you lose a popularity contest in space'),
    tk('was shown the airlock by their former friends'),
    tk('has permission to crash out after being voted out for no reason'),
    tk('was ejected despite doing literally nothing wrong'),
    tk('was the victim of a tragic misunderstanding'),
    tk('was a little too sus'),
    tk('got caught lacking'),
    tk('got spaced for being an intruder'),
    tk('got killed by a mob of angry crewmates'),
    tk('was brutally eliminated while minding their own business'),
    tk('got absolutely destroyed by an intruder'),
    tk('was deleted from the crew roster permanently'),
    tk('had a fatal encounter with someone suspicious'),
    tk('was removed from the game... and from life'),
    tk('experienced an unexpected case of death'),
    tk('was assassinated mid-task like a productivity martyr'),
    tk('died doing what they loved (chores)'),
    tk('got merked while trying to be a good crewmate'),
    tk('was killed before they could finish their job'),
    tk('learned the hard way that some tasks are to die for'),
    tk('was irradiated to a crispy finish'),
    tk('became one with the reactor core'),
    tk("got a lethal dose of 'should have entered the code faster'"),
    tk('experienced rapid unplanned disassembly via nuclear fire'),
    tk('was vaporized by the power of the atom'),
    tk('learned that radiation is not, in fact, good for you'),
    tk('mysteriously vanished into the void'),
    tk('rage quit the game'),
    tk('pulled a tactical retreat'),
    tk('went AFK'),
    tk('died under mysterious circumstances'),
    tk('perished in an unexplained incident'),
    tk('was found dead (cause: ¯\\_(ツ)_/¯)'),
    tk('ceased to exist for reasons unknown'),
];

export const TASK_TEMPLATES = [
    tk("was brutally murdered while trying to '{task}'"),
    tk("got killed mid-way through '{task}' like a true martyr"),
    tk("died attempting to complete '{task}' - so close, yet so dead"),
    tk("was assassinated while innocently doing '{task}'"),
    tk("never got to finish '{task}' because someone chose violence"),
];

registerTemplates(TASK_TEMPLATES);

/** The death message in this phone's language (see registerTemplates for the ones that quote a task). */
export function localizeDeathMessage(message) {
    return message ? t(message) : message;
}
