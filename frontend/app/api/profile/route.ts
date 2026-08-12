import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const scriptPath = path.resolve(process.cwd(), '../backend/src/query_db.py');
    const cmd = `python "${scriptPath}" profile "${userId}"`;

    const result = await new Promise<string>((resolve) => {
      exec(cmd, (err, stdout) => {
        if (err) {
          exec(`uv run python "${scriptPath}" profile "${userId}"`, (err2, stdout2) => {
            if (err2) {
              resolve('null');
            } else {
              resolve(stdout2);
            }
          });
        } else {
          resolve(stdout);
        }
      });
    });

    const profile = JSON.parse(result || 'null');
    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Error fetching memory profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const scriptPath = path.resolve(process.cwd(), '../backend/src/query_db.py');
    const cmd = `python "${scriptPath}" clear_memory "${userId}"`;

    const result = await new Promise<string>((resolve) => {
      exec(cmd, (err, stdout) => {
        if (err) {
          exec(`uv run python "${scriptPath}" clear_memory "${userId}"`, (err2, stdout2) => {
            if (err2) {
              resolve('{"success": false}');
            } else {
              resolve(stdout2);
            }
          });
        } else {
          resolve(stdout);
        }
      });
    });

    const response = JSON.parse(result || '{"success": false}');
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error clearing memory profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
