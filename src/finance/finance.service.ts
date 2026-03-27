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

  async getOverview() {
    const [overview, chart] = await Promise.all([
      this.fetchOverview(),
      this.fetchMonthlyChart(),
    ]);

    const find = (id: string) =>
      overview.metrics.find((m) => m.id === id)?.value ?? 0;

    const monthly = chart.values.map(([ts, rev]) => ({
      x: dayjs.unix(ts).format('MMM YYYY'),
      y: rev,
    }));

    console.log(chart.summary?.total?.Revenue)

    return {
      mrr: find('mrr'),
      revenue28d: find('revenue'),
      activeSubscriptions: find('active_subscriptions'),
      newCustomers28d: find('new_customers'),
      currentMonth: monthly.at(-1)?.y ?? 0,
      totalRevenue: chart.summary?.total?.Revenue ?? 0,
      monthly,
    };
  }
}
