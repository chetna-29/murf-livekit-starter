import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export const revalidate = 0;

export async function GET() {
  try {
    const scriptPath = path.resolve(process.cwd(), '../backend/src/query_db.py');
    const cmd = `python "${scriptPath}" escalations`;

    const result = await new Promise<string>((resolve) => {
      exec(cmd, (err, stdout) => {
        if (err) {
          // Try with uv run
          exec(`uv run python "${scriptPath}" escalations`, (err2, stdout2) => {
            if (err2) {
              resolve('[]');
            } else {
              resolve(stdout2);
            }
          });
        } else {
          resolve(stdout);
        }
      });
    });

    const escalations = JSON.parse(result || '[]');
    return NextResponse.json(escalations);
  } catch (error: any) {
    console.error('Error fetching escalations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
