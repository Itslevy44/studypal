import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getMarketplaceItems, getSubscriptions, getUsers, getPapers, readJsonFile } from '@/lib/dataStore';
import { getUniversitiesFromTelegramStore } from '@/lib/universitiesTelegram';

const ALL_ACCESS_PRICE = 100;

type UserRecord = {
  role?: unknown;
  [key: string]: unknown;
};

type SubscriptionRecord = {
  paperId?: unknown;
  status?: unknown;
  expiryDate?: unknown;
  amount?: unknown;
  [key: string]: unknown;
};

type MarketplaceItemRecord = {
  status?: unknown;
  price?: unknown;
  [key: string]: unknown;
};

const isStudent = (user: UserRecord) => user.role === 'student' || !user.role || user.role === undefined;

const isActiveAllAccessSubscription = (sub: SubscriptionRecord, now: Date) => (
  sub.paperId === 'all_access' &&
  sub.status === 'active' &&
  typeof sub.expiryDate === 'string' &&
  new Date(sub.expiryDate) > now
);

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const now = new Date();
    const users = getUsers() || [];
    const papers = getPapers() || [];
    const universities = await getUniversitiesFromTelegramStore();
    const subscriptions = getSubscriptions() || [];
    const marketplaceItems = getMarketplaceItems() || [];
    const pendingPayments = readJsonFile('pending_payments.json') || [];

    const students = users.filter((user: UserRecord) => isStudent(user));
    const activeSubscriptions = subscriptions.filter((sub: SubscriptionRecord) => isActiveAllAccessSubscription(sub, now));

    const allAccessRevenue = activeSubscriptions.reduce(
      (sum: number, sub: SubscriptionRecord) => sum + (toNumber(sub.amount) || ALL_ACCESS_PRICE),
      0
    );
    const soldItems = marketplaceItems.filter((item: MarketplaceItemRecord) => item.status === 'sold');
    const marketplaceRevenue = soldItems.reduce(
      (sum: number, item: MarketplaceItemRecord) => sum + toNumber(item.price),
      0
    );
    const totalRevenue = allAccessRevenue + marketplaceRevenue;

    return NextResponse.json({
      paperCount: papers.length,
      universityCount: universities.length,
      studentCount: students.length,
      activeSubscriptionCount: activeSubscriptions.length,
      pendingPaymentCount: pendingPayments.length,
      paperRevenue: allAccessRevenue,
      marketplaceRevenue,
      totalRevenue,
      revenueBreakdown: {
        allAccess: allAccessRevenue,
        marketplace: marketplaceRevenue,
      },
      totalSubscriptionRevenue: subscriptions.reduce(
        (sum: number, sub: SubscriptionRecord) =>
          sub.status === 'active' ? sum + (toNumber(sub.amount) || ALL_ACCESS_PRICE) : sum,
        0
      ),
      soldMarketplaceCount: soldItems.length,
    });
  } catch (error: unknown) {
    console.error('[Admin Stats API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch admin stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
