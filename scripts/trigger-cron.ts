const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const cronSecret = process.env.CRON_SECRET?.trim();

async function triggerCron() {
  if (!appUrl || !cronSecret) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL and CRON_SECRET must be set in your environment.",
    );
  }

  const response = await fetch(`${appUrl}/api/cron/publish-scheduled`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error?: { message?: string } }).error?.message)
        : `Cron request failed with status ${response.status}`;
    throw new Error(message);
  }

  console.log("Scheduled publish cron completed:");
  console.log(JSON.stringify(json, null, 2));
}

triggerCron().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
