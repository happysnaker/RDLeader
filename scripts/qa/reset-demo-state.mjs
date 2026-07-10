const baseUrl = process.env.RDLEADER_BASE_URL ?? 'http://127.0.0.1:3001';

async function main() {
  const response = await fetch(`${baseUrl}/admin/dev/reset-demo-state`, {
    method: 'POST',
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    console.error(JSON.stringify({ status: response.status, payload }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
