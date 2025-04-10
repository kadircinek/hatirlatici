export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('This browser does not support service workers');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('ServiceWorker registration successful');
    return registration;
  } catch (err) {
    console.log('ServiceWorker registration failed: ', err);
  }
};

export const scheduleDailyNotifications = async () => {
  const registration = await navigator.serviceWorker.ready;
  
  // Schedule notification for 9:00 AM every day
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    9, // 9 AM
    0,
    0
  );

  // If it's already past 9 AM, schedule for next day
  if (now > scheduledTime) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delay = scheduledTime.getTime() - now.getTime();

  setTimeout(async () => {
    // Fetch today's tasks
    const response = await fetch('/api/reminders/today');
    const data = await response.json();

    const { calls, visits } = data;

    // Send notification
    registration.active?.postMessage({
      title: 'Daily Tasks',
      body: `You have ${calls.length} calls and ${visits.length} visits scheduled for today.`,
    });

    // Schedule next notification
    scheduleDailyNotifications();
  }, delay);
};

export const sendNotification = (title: string, body: string) => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192x192.png',
    });
  }
}; 