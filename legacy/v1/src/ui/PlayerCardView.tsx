import type { PlayerCard } from '../data/types';
import { ovr, tier } from '../game/ratings';

export function Ovr({ card }: { card: PlayerCard }) {
  const v = ovr(card);
  return <span className={`ovr ${tier(v)}`}>{v}</span>;
}

export function PlayerCardView({ card, disabled, onClick }: { card: PlayerCard; disabled?: boolean; onClick?: () => void }) {
  return (
    <button className={`card${disabled ? ' disabled' : ''}`} disabled={disabled} onClick={onClick}>
      <div className="name">
        {card.name}
        <Ovr card={card} />
      </div>
      <div className="pos">{card.type === 'batter' ? card.pos.join(' / ') : card.role === 'SP' ? '선발' : '불펜'}</div>
      <div className="stats">
        {card.type === 'batter' ? (
          <>
            <span>컨택<b>{card.con}</b></span>
            <span>파워<b>{card.pow}</b></span>
            <span>선구<b>{card.eye}</b></span>
            <span>주루<b>{card.spd}</b></span>
            <span>수비<b>{card.def}</b></span>
          </>
        ) : (
          <>
            <span>구위<b>{card.stu}</b></span>
            <span>제구<b>{card.ctl}</b></span>
            <span>체력<b>{card.sta}</b></span>
          </>
        )}
      </div>
      {card.note && <div className="note">★ {card.note}</div>}
    </button>
  );
}
