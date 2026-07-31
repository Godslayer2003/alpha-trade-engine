import { Injectable } from '@nestjs/common';
import { MarketCountry, MarketHoursStatus } from '@alpha-trade/shared-types';

interface ExchangeConfig {
  country: MarketCountry;
  countryLabel: string;
  exchangeName: string;
  timezone: string;
  // [startMinute, endMinute) since local midnight — multiple entries for
  // exchanges with a lunch-break split session (e.g. Tokyo, Shanghai).
  sessions: [number, number][];
}

const EXCHANGES: ExchangeConfig[] = [
  { country: MarketCountry.USA, countryLabel: 'United States', exchangeName: 'NYSE / Nasdaq', timezone: 'America/New_York', sessions: [[570, 960]] },
  { country: MarketCountry.CANADA, countryLabel: 'Canada', exchangeName: 'Toronto Stock Exchange', timezone: 'America/Toronto', sessions: [[570, 960]] },
  { country: MarketCountry.UK, countryLabel: 'United Kingdom', exchangeName: 'London Stock Exchange', timezone: 'Europe/London', sessions: [[480, 990]] },
  { country: MarketCountry.GERMANY, countryLabel: 'Germany', exchangeName: 'Frankfurt Stock Exchange (Xetra)', timezone: 'Europe/Berlin', sessions: [[540, 1050]] },
  { country: MarketCountry.FRANCE, countryLabel: 'France', exchangeName: 'Euronext Paris', timezone: 'Europe/Paris', sessions: [[540, 1050]] },
  { country: MarketCountry.CHINA, countryLabel: 'China', exchangeName: 'Shanghai Stock Exchange', timezone: 'Asia/Shanghai', sessions: [[570, 690], [780, 900]] },
  { country: MarketCountry.JAPAN, countryLabel: 'Japan', exchangeName: 'Tokyo Stock Exchange', timezone: 'Asia/Tokyo', sessions: [[540, 690], [750, 900]] },
  { country: MarketCountry.KOREA, countryLabel: 'South Korea', exchangeName: 'Korea Exchange', timezone: 'Asia/Seoul', sessions: [[540, 930]] },
  { country: MarketCountry.RUSSIA, countryLabel: 'Russia', exchangeName: 'Moscow Exchange', timezone: 'Europe/Moscow', sessions: [[600, 1120]] },
  { country: MarketCountry.SOUTH_AFRICA, countryLabel: 'South Africa', exchangeName: 'Johannesburg Stock Exchange', timezone: 'Africa/Johannesburg', sessions: [[540, 1020]] },
  { country: MarketCountry.ARGENTINA, countryLabel: 'Argentina', exchangeName: 'Buenos Aires Stock Exchange (BYMA)', timezone: 'America/Argentina/Buenos_Aires', sessions: [[660, 1020]] },
  { country: MarketCountry.AUSTRALIA, countryLabel: 'Australia', exchangeName: 'Australian Securities Exchange', timezone: 'Australia/Sydney', sessions: [[600, 960]] },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const TRADING_WEEKDAYS = [1, 2, 3, 4, 5]; // Mon-Fri, none of the above trade weekends
const DISCLAIMER =
  'Computed from each exchange’s regular weekday trading hours; does not account for exchange-specific public holidays.';

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && mins > 0) parts.push(`${mins}m`);
  return parts.length > 0 ? parts.join(' ') : '0m';
}

@Injectable()
export class MarketHoursService {
  list(countries?: MarketCountry[]): MarketHoursStatus[] {
    const wanted = countries && countries.length > 0 ? new Set(countries) : null;
    const now = new Date();
    return EXCHANGES.filter((cfg) => !wanted || wanted.has(cfg.country)).map((cfg) =>
      this.computeStatus(cfg, now),
    );
  }

  private computeStatus(cfg: ExchangeConfig, now: Date): MarketHoursStatus {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: cfg.timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    }).formatToParts(now);

    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    const weekdayIdx = WEEKDAY_INDEX[map.weekday];
    // Midnight rolls Intl's "24:00" hour to "24" on some runtimes — normalize.
    const hour = Number(map.hour) % 24;
    const nowMinutes = hour * 60 + Number(map.minute);

    const isOpen =
      TRADING_WEEKDAYS.includes(weekdayIdx) &&
      cfg.sessions.some(([start, end]) => nowMinutes >= start && nowMinutes < end);

    type Transition = { totalMinutes: number; type: 'OPEN' | 'CLOSE'; minuteInDay: number; dayOffset: number };
    const transitions: Transition[] = [];
    for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
      const wd = (weekdayIdx + dayOffset) % 7;
      if (!TRADING_WEEKDAYS.includes(wd)) continue;
      for (const [start, end] of cfg.sessions) {
        transitions.push({ totalMinutes: dayOffset * 1440 + start, type: 'OPEN', minuteInDay: start, dayOffset });
        transitions.push({ totalMinutes: dayOffset * 1440 + end, type: 'CLOSE', minuteInDay: end, dayOffset });
      }
    }
    transitions.sort((a, b) => a.totalMinutes - b.totalMinutes);
    const next = transitions.find((t) => t.totalMinutes > nowMinutes) ?? transitions[0];
    const inMinutes = next.totalMinutes - nowMinutes;
    const dayLabel =
      next.dayOffset === 0
        ? ''
        : next.dayOffset === 1
          ? 'tomorrow '
          : `${WEEKDAY_NAMES[(weekdayIdx + next.dayOffset) % 7]} `;

    return {
      country: cfg.country,
      countryLabel: cfg.countryLabel,
      exchangeName: cfg.exchangeName,
      timezone: cfg.timezone,
      isOpen,
      currentLocalTime: `${minutesToLabel(nowMinutes)} ${map.weekday}`,
      sessionsLocal: cfg.sessions.map(([s, e]) => ({ opens: minutesToLabel(s), closes: minutesToLabel(e) })),
      nextTransition: {
        type: next.type,
        localLabel: `${next.type === 'OPEN' ? 'Opens' : 'Closes'} ${dayLabel}${minutesToLabel(next.minuteInDay)} · in ${formatDuration(inMinutes)}`,
        inMinutes,
      },
      disclaimer: DISCLAIMER,
    };
  }
}
