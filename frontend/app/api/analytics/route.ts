import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language');
    const channel = searchParams.get('channel');
    const outcome = searchParams.get('outcome');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const filters: any = {};
    if (language) filters.language = language;
    if (channel) filters.channel = channel;
    if (outcome) filters.outcome = outcome;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;

    // Convert filters to base64 for safe shell invocation on all platforms
    const filtersJson = JSON.stringify(filters);
    const b64Filters = Buffer.from(filtersJson).toString('base64');

    const scriptPath = path.resolve(process.cwd(), '../backend/src/query_db.py');
    const cmd = `python "${scriptPath}" analytics "${b64Filters}"`;

    const result = await new Promise<string>((resolve) => {
      exec(cmd, (err, stdout) => {
        if (err) {
          // Fallback to uv run if default python execution fails
          exec(`uv run python "${scriptPath}" analytics "${b64Filters}"`, (err2, stdout2) => {
            if (err2) {
              resolve('{}');
            } else {
              resolve(stdout2);
            }
          });
        } else {
          resolve(stdout);
        }
      });
    });

    const analytics = JSON.parse(result || '{}');
    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
