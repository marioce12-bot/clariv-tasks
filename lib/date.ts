export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function entryId(uid: string, date = new Date()) {
  return `${uid}_${todayKey(date)}`;
}

export function nextScheduledDate(time = "18:30") {
  const [hours = "18", minutes = "30"] = time.split(":");
  const scheduled = new Date();
  scheduled.setHours(Number(hours), Number(minutes), 0, 0);

  if (scheduled.getTime() < Date.now() + 10 * 60 * 1000) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
}
