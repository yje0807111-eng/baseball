import { useState } from 'react';
import { seriesLabel } from '../data/series';
import type { PlayerCard, Series } from '../data/types';
import { REROLLS, ROUNDS, rollSeries } from '../game/draft';
import { openSlotsFor, SLOT_LABEL, type Pick, type SlotId } from '../game/roster';
import { PlayerCardView } from './PlayerCardView';
import { RosterPanel } from './RosterPanel';

export function DraftScreen({ onDone }: { onDone: (picks: Pick[]) => void }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [series, setSeries] = useState<Series>(() => rollSeries([]));
  const [rerolls, setRerolls] = useState(REROLLS);
  const [pending, setPending] = useState<{ card: PlayerCard; slots: SlotId[] } | null>(null);

  const commit = (card: PlayerCard, slot: SlotId) => {
    const next = [...picks, { slot, seriesId: series.id, card }];
    setPicks(next);
    setPending(null);
    if (next.length < ROUNDS) setSeries(rollSeries(next, Math.random, series.id));
  };

  const choose = (card: PlayerCard) => {
    const slots = openSlotsFor(card, picks);
    if (slots.length === 1) commit(card, slots[0]);
    else setPending({ card, slots });
  };

  const done = picks.length >= ROUNDS;

  return (
    <div className="layout">
      <div>
        <div className="panel">
          <div className="series-head">
            <div>
              <div className="muted">라운드 {Math.min(picks.length + 1, ROUNDS)} / {ROUNDS}</div>
              <div className="series-title">
                {seriesLabel(series)}
                <span className={`kind ${series.kind}`}>{series.kind === 'national' ? '국가대표' : '구단'}</span>
              </div>
            </div>
            {!done && (
              <button className="ghost" disabled={rerolls <= 0} onClick={() => { setRerolls(rerolls - 1); setSeries(rollSeries(picks, Math.random, series.id)); }}>
                🎲 다시 뽑기 ({rerolls})
              </button>
            )}
          </div>
          {done ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p>팀 구성이 끝났어요.</p>
              <button className="primary" onClick={() => onDone(picks)}>경기 시작 ▶</button>
            </div>
          ) : (
            <>
              <p className="muted">이 시리즈에서 한 명을 영입하세요. 흐린 카드는 이미 뽑았거나 빈 자리가 없는 선수예요.</p>
              <div className="cards">
                {series.players.map((c) => (
                  <PlayerCardView key={c.id} card={c} disabled={openSlotsFor(c, picks).length === 0} onClick={() => choose(c)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <RosterPanel title="내 팀" picks={picks} highlight={pending?.slots} />

      {pending && (
        <div className="modal-bg" onClick={() => setPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{pending.card.name} — 어느 자리에?</h3>
            <div className="choices">
              {pending.slots.map((s) => (
                <button key={s} className="primary" onClick={() => commit(pending.card, s)}>{SLOT_LABEL[s]}</button>
              ))}
            </div>
            <button className="ghost" onClick={() => setPending(null)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
