import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';

interface OverviewMetric {
  id: string;
  value: number;
  unit: string;
}

interface OverviewResponse {
  metrics: OverviewMetric[];
}

interface ChartValues {
  values: [number, number, number][];
  summary: { total: { Revenue: number } };
}

interface AdMobRow {
  dimensionValues: { MONTH: { value: string } };
  metricValues: {
    ESTIMATED_EARNINGS?: { microsValue: string };
    IMPRESSIONS?: { integerValue: string };
  };
}

export interface AdMobData {
  estimatedEarningsMonth: number;
  estimatedEarnings30d: number;
  impressionsMonth: number;
  impressions30d: number;
  ecpmMonth: number;
  monthly: { x: string; y: number }[];
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly baseUrl = 'https://api.revenuecat.com/v2';

  constructor(private readonly configService: ConfigService) {}

  private get headers() {
    const key = this.configService.getOrThrow<string>('REVENUECAT_V2_SECRET_KEY');
    return { Authorization: `Bearer ${key}`, Accept: 'application/json' };
  }

  private get projectId() {
    return this.configService.getOrThrow<string>('REVENUECAT_PROJECT_ID');
  }

  private async fetchOverview(): Promise<OverviewResponse> {
    const res = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/metrics/overview`,
      { headers: this.headers },
    );
    if (!res.ok) throw new InternalServerErrorException(`RevenueCat overview error: ${res.status}`);
    return res.json() as Promise<OverviewResponse>;
  }

  private async fetchMonthlyChart(): Promise<ChartValues> {
    // Lancement RevenueCat : février 2026
    const startTime = dayjs('2026-02-01').unix();
    const endTime = dayjs().unix();

    const res = await fetch(
      `${this.baseUrl}/projects/${this.projectId}/charts/revenue?resolution=month&realtime=false&start_time=${startTime}&end_time=${endTime}`,
      { headers: this.headers },
    );
    if (!res.ok) throw new InternalServerErrorException(`RevenueCat chart error: ${res.status}`);
    return res.json() as Promise<ChartValues>;
  }

  private async fetchAdMobData(): Promise<AdMobData | null> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');
    const publisherId = this.configService.get<string>('ADMOB_PUBLISHER_ID');

    if (!clientId || !clientSecret || !refreshToken || !publisherId) {
      this.logger.warn(`AdMob credentials missing — clientId:${!!clientId} clientSecret:${!!clientSecret} refreshToken:${!!refreshToken} publisherId:${!!publisherId}`);
      return null;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      this.logger.error(`AdMob token refresh error: ${tokenRes.status} — ${errBody}`);
      throw new InternalServerErrorException(`AdMob token refresh error: ${tokenRes.status}`);
    }
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const now = dayjs();
    const startDate = now.subtract(1, 'year').startOf('month');

    const reportRes = await fetch(
      `https://admob.googleapis.com/v1/accounts/${publisherId}/networkReport:generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportSpec: {
            dateRange: {
              startDate: { year: startDate.year(), month: startDate.month() + 1, day: 1 },
              endDate: { year: now.year(), month: now.month() + 1, day: now.date() },
            },
            dimensions: ['MONTH'],
            metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS'],
            localizationSettings: { currencyCode: 'USD' },
          },
        }),
      },
    );

    if (!reportRes.ok) throw new InternalServerErrorException(`AdMob report error: ${reportRes.status}`);

    // AdMob streams NDJSON (one JSON object per line)
    const text = await reportRes.text();
    this.logger.log(`AdMob raw response: ${text.slice(0, 500)}`);
    const rows = text
      .split('\n')
      .filter(Boolean)
      .map((line) => { try { return JSON.parse(line) as { row?: AdMobRow }; } catch { return null; } })
      .filter((item): item is { row: AdMobRow } => !!item?.row);

    const currentMonthStr = now.format('YYYYMM');
    const thirtyDaysMonthStr = now.subtract(30, 'day').format('YYYYMM');

    let estimatedEarningsMonth = 0;
    let estimatedEarnings30d = 0;
    let impressionsMonth = 0;
    let impressions30d = 0;
    const monthly: { x: string; y: number }[] = [];

    for (const { row } of rows) {
      const monthStr = row.dimensionValues?.MONTH?.value ?? '';
      const earnings = Number(row.metricValues?.ESTIMATED_EARNINGS?.microsValue ?? 0) / 1_000_000;
      const impressions = Number(row.metricValues?.IMPRESSIONS?.integerValue ?? 0);

      monthly.push({ x: `${monthStr.slice(0, 4)}-${monthStr.slice(4, 6)}`, y: earnings });

      if (monthStr === currentMonthStr) {
        estimatedEarningsMonth = earnings;
        impressionsMonth = impressions;
      }
      if (monthStr >= thirtyDaysMonthStr) {
        estimatedEarnings30d += earnings;
        impressions30d += impressions;
      }
    }

    monthly.sort((a, b) => a.x.localeCompare(b.x));

    return {
      estimatedEarningsMonth,
      estimatedEarnings30d,
      impressionsMonth,
      impressions30d,
      ecpmMonth: impressionsMonth > 0 ? (estimatedEarningsMonth / impressionsMonth) * 1000 : 0,
      monthly,
    };
  }

  async getOverview() {
    const [overview, chart, admob] = await Promise.all([
      this.fetchOverview(),
      this.fetchMonthlyChart(),
      this.fetchAdMobData().catch((err) => { this.logger.warn('AdMob fetch failed', err); return null; }),
    ]);

    const find = (id: string) =>
      overview.metrics.find((m) => m.id === id)?.value ?? 0;

    const monthly = chart.values.map(([ts, rev]) => ({
      x: dayjs.unix(ts).format('MMM YYYY'),
      y: rev,
    }));

    return {
      mrr: find('mrr'),
      revenue28d: find('revenue'),
      activeSubscriptions: find('active_subscriptions'),
      newCustomers28d: find('new_customers'),
      currentMonth: monthly.at(-1)?.y ?? 0,
      totalRevenue: chart.summary?.total?.Revenue ?? 0,
      monthly,
      admob,
    };
  }
}
