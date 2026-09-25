/* 증강 카드 일러스트(public/augments/<id>.webp) 생성 도구.
   그림체는 게임에 이미 들어간 것과 같은 "야간 구장 시네마틱 실사" — 등급 색 안개가 배경에 깔리고,
   아래 3분의 1은 카드 글자가 올라가도록 검게 비운다. 증강마다 효과가 한눈에 읽히는 장면 하나를 정해 두었다.

   node scripts/augment-art.mjs prompts [등급|id ...]   생성용 프롬프트를 JSON 으로 출력
   node scripts/augment-art.mjs fetch <id>=<이미지URL> [...]   내려받아 art-src/augments/<id>.png + public/augments/<id>.webp
   node scripts/augment-art.mjs missing                  아직 그림이 없는 증강 id */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'art-src', 'augments');
const OUT = join(root, 'public', 'augments');
export const ART_W = 720;
export const ART_H = 1072;

const GLOW = { silver: 'vivid cyan and steel-blue energy haze' };

/** [등급, 장면] — 장면은 그 증강의 효과가 사진 한 장으로 읽히도록 */
export const SCENES = {
  hell: ['silver', 'a runner hurling himself head-first into home plate through a wall of dirt as the catcher lunges with the tag, the go-ahead run arriving by sheer will'],
  cleanupBomb: ['silver', 'three power hitters in a row connecting, seen as one long exposure of overlapping swings, the ball leaving the frame over the fence'],
  daesseuyo: ['silver', 'a huge left-handed slugger frozen at the end of a two-run home-run swing, bat held high, ball already a streak in the night sky'],
  closer: ['silver', 'a closer slamming the final pitch of the ninth inning, the catcher squeezing it, iron gates of the bullpen shut behind him'],
  ace: ['silver', 'an ace starter mid-strikeout, ball snapping into the mitt, batter frozen in a checked swing'],
  bigGame: ['silver', 'a national-team batter delivering the go-ahead hit in a packed stadium, flags blurred in the stands'],
  lefty: ['silver', 'a right-handed batter turning on a pitch from a left-handed pitcher, the lefty pitcher small and out of focus behind'],
  rightLock: ['silver', 'a right-handed pitcher painting the outside corner, right-handed batter frozen mid-swing and missing'],
  speedBall: ['silver', 'a base stealer exploding out of his lead, spikes tearing dirt, fielder reaching for the throw'],
  muscle: ['silver', 'a hitter\'s chalked forearms gripping a bat handle in a dim stadium weight room, loaded barbell racked behind him'],
  eyeTrain: ['silver', 'extreme close-up on a batter\'s focused eyes under the helmet brim, the incoming ball sharply reflected in them'],
  sprintTrain: ['silver', 'sprint drill on the base path at night, a runner exploding past training cones, spikes throwing dirt'],
  gloveTrain: ['silver', 'an infielder fully extended in a diving stop, glove snapping the ball out of the dirt'],
  toContact: ['silver', 'a batter choking up on the bat and punching a compact line drive the other way, bat shortened in his hands'],
  toPower: ['silver', 'a batter abandoning a short stroke for a full uppercut cut, back leg torqued, bat exploding through the zone'],
  trainerOn: ['silver', 'a team trainer taping a pitcher\'s shoulder in the dugout tunnel, the pitcher flexing his arm, ready to go back out'],
  speedGap: ['silver', 'two runners racing on parallel base paths, one clearly ahead in a blur of speed while the other lags'],
  bloop: ['silver', 'a broken-bat blooper falling untouched just beyond the infielders\' reach, fielders converging too late'],
  mercContract: ['silver', 'a tall foreign import player in an unmarked uniform stepping onto the field for the first time, duffel bag over his shoulder'],
  leftLine: ['silver', 'a line of left-handed batters in the on-deck circle, all mirroring the same left-handed stance'],
  rightLine: ['silver', 'a line of right-handed batters in the on-deck circle, all mirroring the same right-handed stance'],
  weakFix: ['silver', 'a coach drilling a struggling player one-on-one in an empty night stadium, patching the weak part of his game'],
  posFree: ['silver', 'a player standing between positions on an empty field, holding both an infielder\'s glove and an outfielder\'s glove'],
  bullpenInsure: ['silver', 'two relief pitchers warming side by side in the bullpen, the stronger one showing the weaker one his grip'],
  hometownFans: ['silver', 'a packed home crowd rising as one behind the dugout, thousands of hands raised, players lifted by the roar'],
  natPride: ['silver', 'a player pressing the national-team emblem on his chest, plain flag colors blurred in the stands behind him'],
  legendAura: ['silver', 'an aging legend standing alone on the mound at night, faint ghostly afterimages of his younger self around him'],
  rookieHunger: ['silver', 'an unknown young player in a plain practice jersey sprinting out of the dugout shadows into the floodlights'],
  veteran: ['silver', 'a weathered veteran calmly adjusting his batting gloves, scarred hands, completely unhurried in a loud stadium'],
  closerFocus: ['silver', 'a closer alone on the mound in the ninth, everything around him blurred to black except his eyes and the ball'],
  aceDay: ['silver', 'a starting pitcher walking out to the mound in the first inning, long shadow stretching ahead of him'],
  smallBall: ['silver', 'a batter laying down a perfect sacrifice bunt, ball dying in the grass as the runner takes off'],
  fullSwing: ['silver', 'a slugger swinging so hard his helmet flies off, bat wrapped all the way around, dirt kicked from the box'],
  grind: ['silver', 'a batter fouling off pitch after pitch late in the count, sweat and dirt on his face, pitcher visibly frustrated'],
  staminaTrain: ['silver', 'a pitcher running conditioning sprints in the outfield at night, breath fogging, floodlights behind him'],
  catcherLead: ['silver', 'a catcher flashing signs behind the plate, calm and in command, the pitcher nodding in the background'],
  cleanupUp: ['silver', 'the three-four-five hitters standing shoulder to shoulder in the dugout with bats on their shoulders, pure menace'],
  setterUp: ['silver', 'the leadoff and number-two hitters taking off together, two runners in motion on the base paths'],
  bottomUp: ['silver', 'the bottom-of-the-order hitters celebrating a rally in the dugout, unlikely heroes covered in dirt'],
  ironDefense: ['silver', 'the whole infield set in perfect defensive posture, gloves down, a wall of fielders under the lights'],
  allOutPitch: ['silver', 'a pitcher throwing with everything he has, face contorted, arm blurred, sweat spraying off him'],
  extraRun: ['silver', 'a runner rounding third and being waved home for one more run, third base coach windmilling his arm'],
  shutoutCounter: ['silver', 'the defense sprinting off the field after a scoreless inning while the first batter grabs his bat, momentum turning'],
  rally: ['silver', 'a dugout erupting during a big inning, players banging the railing as another run scores'],
  bargain: ['silver', 'a squad of unheralded low-cost players lined up in plain uniforms, arms crossed, quietly confident'],
  clutchMaster: ['silver', 'a manager stepping out of the dugout in the decisive moment, pointing, taking the game into his own hands'],
  bullpenGame: ['silver', 'a procession of relief pitchers warming in the bullpen one after another, a relay of arms'],
  southpaws: ['silver', 'several left-handed pitchers throwing side by side in the bullpen, all mirroring the same lefty delivery'],
  balanceTrain: ['silver', 'a pitcher and a hitter training back to back on the same field, perfectly balanced composition'],
  emergency: ['silver', 'a late-night emergency call-up arriving at the stadium, a new player handed a jersey in the tunnel'],
  allInSkew: ['silver', 'a single overwhelming strength on display — one colossal swing lit up while everything else falls into darkness'],
  extremeLeft: ['silver', 'an entire batting order of left-handed hitters standing in the same mirrored stance, unsettling symmetry'],
  mercAll: ['silver', 'three foreign import players standing together like a mercenary crew in an unmarked dark uniform'],
  hitStreak: ['silver', 'back-to-back-to-back base hits shown as overlapping motion of three batters connecting'],
  luckySeven: ['silver', 'the seventh-inning rally, a stadium full of fans standing, one hitter driving the ball into the gap'],
  greenLight: ['silver', 'a runner given the green light, taking off for second on his own, slide already beginning'],
  doubleSwitch: ['silver', 'a manager handing the ball to a fresh reliever on the mound, the starter walking away into shadow'],
  scoutReport: ['silver', 'a catcher and pitching coach studying a scouting chart in the dugout dark, opponent blurred on the field'],
  tightPitching: ['silver', 'a pitcher escaping a bases-loaded jam with a double play, infielders turning it at second'],
  captain: ['silver', 'the team captain with the C on his chest rallying teammates in a huddle on the mound'],
  autumnDNA: ['silver', 'a championship-hardened player under October night air, confetti ghosting in the floodlights behind him'],
  workhorse: ['silver', 'a starting pitcher still on the mound deep in the game, jersey soaked, refusing to come out'],
  sluggerArmy: ['silver', 'a whole lineup of massive sluggers walking out of the dugout shoulder to shoulder with bats over their shoulders'],
  underdog: ['silver', 'a smaller underdog team standing defiant against towering opponents blurred in the background'],
  cannon: ['silver', 'a titanic home run launching out of the stadium, the ball a burning streak against the night sky'],
  synBoom: ['silver', 'teammates converging in an explosive celebration at home plate, energy bursting where they meet'],
  synCopy: ['silver', 'one player\'s aura spreading outward to every teammate on the field like a shared shockwave of light'],
  cleanupCore: ['silver', 'the clean-up hitter alone in the batter\'s box, enormous and centered, the pitcher tiny in the distance'],
  pressure: ['silver', 'a pitcher on the mound sagging under relentless pressure, batters looming huge around the edges of the frame'],
  legendsWeight: ['silver', 'a row of legendary players standing in line under the lights, monumental, like statues come alive'],
  regress: ['silver', 'a star player passing his strength to teammates in a huddle, light flowing from him into them'],
  oneWell: ['silver', 'a single skill honed to perfection — one hitter repeating the identical swing, dozens of ghost images stacked'],
  glassCannon: ['silver', 'a devastating swing shattering the bat into flying splinters, beautiful and fragile at once'],
  oneMan: ['silver', 'one superstar standing alone at the center of the field, teammates faded into deep shadow around him'],
  dynasty: ['silver', 'a dynasty roster posing together under falling confetti in an empty night stadium, unified in one dark uniform'],
  allOrNothing: ['silver', 'a batter swinging out of his shoes for everything — either a towering drive or nothing at all'],
  revive: ['silver', 'a reliever stopping a collapse cold, bases loaded behind him, the inning dying in his glove'],
  walkoffInstinct: ['silver', 'the walk-off moment: a batter watching his ball disappear as the whole dugout pours onto the field'],
  perfectPace: ['silver', 'an untouchable starter mid-windup with a spotless scoreboard glowing far behind him'],
  dramaComeback: ['silver', 'a late-inning comeback swelling, players streaming out of the dugout as the deficit finally falls'],
  clutchGod: ['silver', 'a hitter locked in at the decisive at-bat, time seemingly stopped, the ball hanging in the air in front of him'],
  speedRevolution: ['silver', 'multiple runners in motion on every base at once, the whole field turned into a track meet'],
  flyballRevolution: ['silver', 'an uppercut swing sending a towering fly ball, the trajectory rising out of the frame'],
  contactRevolution: ['silver', 'a pure contact hitter squaring the ball perfectly, barrel meeting ball dead center in razor-sharp detail'],
  defenseRevolution: ['silver', 'an impossible defensive play, an outfielder robbing a home run above the wall'],
  bullpenFortress: ['silver', 'the bullpen gate standing like a fortress door with relievers waiting behind it, impassable'],
  gamble: ['silver', 'a player flipping a coin in the dugout dark, the outcome of the night hanging in the air'],
  winStreak: ['silver', 'a winning team storming the field again, riding a streak, momentum burning behind them'],
  ironMan: ['silver', 'a complete-game pitcher taking the mound in the ninth inning, exhausted and unbreakable'],
  mirrorMatch: ['silver', 'a pitcher and a batter facing each other in perfect mirrored symmetry across the frame, adapting to one another'],

  stuffTrain: ['silver', 'a pitcher in a night bullpen session driving a fastball into the mitt, the catcher rocked back by the force'],
  ctrlTrain: ['silver', 'a pitcher painting the very edge of the zone, the catcher glove unmoved, batter frozen watching it'],
  mentalCoach: ['silver', 'a coach gripping a young pitcher by the shoulder on the mound, steadying him mid-inning'],
  tempo: ['silver', 'a veteran pitcher holding the ball at his chest, taking his time while the batter waits, rhythm entirely his'],
  aceFirst: ['silver', 'an ace starter walking to the mound ahead of the rest of the rotation, the others watching from the dugout rail'],
  bullpenBoost: ['silver', 'a whole bullpen of relievers warming at once along the pen, a row of arms in motion'],
  infieldWall: ['silver', 'four infielders crouched low in a row across the dirt, a wall nothing gets through'],
  outfieldWall: ['silver', 'an outfielder timing his leap at the fence and pulling a home run back into the park'],
  centerLine: ['silver', 'the catcher, shortstop, second baseman and center fielder aligned down the middle of the field in one straight axis'],
  focusLine: ['silver', 'the whole batting order leaning over the dugout rail in unison, every eye locked on the plate'],
  lateBlast: ['silver', 'a batter driving a late-inning pitch as the crowd rises behind him, the game turning in the eighth'],
  starterFocus: ['silver', 'a starting pitcher alone on the mound at the top of the first, drawing one long breath'],
  firstBlood: ['silver', 'the first run of the game crossing the plate, the dugout erupting over the rail behind it'],
  holdLead: ['silver', 'infielders gathered at the mound guarding a one-run lead, gloves over their mouths'],
  tieBreak: ['silver', 'two opposing players locked eye to eye in a tied game, neither giving ground'],
  extraGame: ['silver', 'exhausted players on the bench deep into extra innings, towels around their necks, the scoreboard still level'],
  aceKiller: ['silver', 'a batter staring down an ace across the mound, the two of them alone in the frame'],
  setupCrew: ['silver', 'three relievers shoulder to shoulder at the bullpen gate, gloves in hand, waiting for the call'],
};

export const promptFor = (id) => {
  const [tier, scene] = SCENES[id];
  return `Cinematic dramatic baseball photograph, night stadium, the player brightly lit by stadium floodlights with a strong glowing rim light, ${GLOW[tier]} filling the background, flying dirt, very high contrast, shallow depth of field. Scene: ${scene}. The scene must read instantly at a glance. Vertical framing: the action fills the upper two thirds; the bottom third falls away into near-black empty space. Photoreal, filmic color grade, no text, no letters, no numbers, no team logos, no jersey numbers, no watermark.`;
};

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'prompts') {
  const ids = args.length
    ? Object.keys(SCENES).filter((id) => args.includes(id) || args.includes(SCENES[id][0]))
    : Object.keys(SCENES);
  console.log(JSON.stringify(ids.map((id) => ({ id, tier: SCENES[id][0], prompt: promptFor(id) })), null, 1));
} else if (cmd === 'fetch') {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const failed = [];
  await Promise.all(args.map(async (arg) => {
    const i = arg.indexOf('=');
    const id = arg.slice(0, i);
    try {
      const res = await fetch(arg.slice(i + 1));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(join(SRC, `${id}.png`), buf);
      await sharp(buf).resize(ART_W, ART_H, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toFile(join(OUT, `${id}.webp`));
    } catch (e) {
      failed.push(`${id} (${e.message})`);
    }
  }));
  console.log(`저장 ${args.length - failed.length}개${failed.length ? `, 실패: ${failed.join(', ')}` : ''}`);
} else if (cmd === 'missing') {
  const have = new Set(existsSync(OUT) ? readdirSync(OUT).map((f) => f.replace(/\.webp$/, '')) : []);
  const miss = Object.keys(SCENES).filter((id) => !have.has(id));
  console.log(miss.join(' ') || '없음');
  console.log(`${miss.length} / ${Object.keys(SCENES).length}`);
} else {
  console.log('사용법: prompts | fetch <id>=<url> ... | missing');
}
