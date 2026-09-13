export type FieldPos = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';
/** 'DH'만 가진 타자는 지명타자 슬롯에만 들어간다. */
export type BatPos = FieldPos | 'DH';
export type PitchRole = 'SP' | 'RP';

export type Franchise = 'KIA' | 'SAMSUNG' | 'LG' | 'DOOSAN' | 'SK' | 'LOTTE' | 'HANWHA' | 'HEROES' | 'NC';

/** 능력치는 40~99. 그 시즌(대회) 기준 값이다. */
export interface BatterCard {
  type: 'batter';
  /** 동일 인물 판별 키. 한 팀에 같은 사람을 두 번 넣을 수 없다. */
  id: string;
  name: string;
  /** 첫 번째가 주 포지션 */
  pos: BatPos[];
  con: number; // 컨택
  pow: number; // 파워
  eye: number; // 선구안
  spd: number; // 주루
  def: number; // 수비
  note?: string;
}

export interface PitcherCard {
  type: 'pitcher';
  id: string;
  name: string;
  role: PitchRole;
  stu: number; // 구위
  ctl: number; // 제구
  sta: number; // 체력
  note?: string;
}

export type PlayerCard = BatterCard | PitcherCard;

export interface Series {
  id: string;
  kind: 'team' | 'national';
  year: number;
  title: string;
  /** 구단 시리즈만 가진다 (프랜차이즈 시너지용) */
  franchise?: Franchise;
  players: PlayerCard[];
}
