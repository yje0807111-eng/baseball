import { SERIES_BY_ID, seriesLabel } from '../data/series';
import { buildTeam } from '../game/lineup';
import { SLOTS, type Pick, type SlotId } from '../game/roster';
import { STAT_KEYS } from '../game/synergy';
import { Ovr } from './PlayerCardView';

export function RosterPanel({ title, picks, highlight }: { title: string; picks: Pick[]; highlight?: SlotId[] }) {
  const team = buildTeam(title, picks);
  const bySlot = new Map(team.batters.concat(team.pitchers as never).map((e) => [e.pick.slot, e]));
  return (
    <div className="panel">
      <h2>{title}<small>{picks.length}/{SLOTS.length}</small></h2>
      <div className="roster">
        {SLOTS.map(({ id, label }) => {
          const e = bySlot.get(id);
          if (!e) {
            return (
              <div key={id} className={`roster-row empty${highlight?.includes(id) ? ' target' : ''}`}>
                <span className="slot">{label}</span>
                <span>—</span>
              </div>
            );
          }
          const total = STAT_KEYS.reduce((s, k) => s + e.bonus[k], 0);
          return (
            <div key={id} className="roster-row">
              <span className="slot">{label}</span>
              <span>
                {e.pick.card.name}
                {total > 0 && <span className="bonus">▲시너지</span>}
                <div className="from">{seriesLabel(SERIES_BY_ID[e.pick.seriesId])}</div>
              </span>
              <Ovr card={e.eff} />
            </div>
          );
        })}
      </div>
      {team.synergies.length > 0 && (
        <div className="synergy">
          {team.synergies.map((s) => (
            <div key={s.key} className="synergy-item">
              <b>{s.name}</b>
              {s.desc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
