window.addEventListener('message', async e => {
  console.log('event listener');
  const urlBase64ToUint8Array = base64String => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  navigator.serviceWorker.register('ServiceWorker.js');

  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription()

    if (existingSubscription) {
      return window.opener.postMessage({ stringifiedSubscription: JSON.stringify(existingSubscription) }, '*');
    }

    const vapidPublicKey = 'BJMQ-CpMM_-OoO2hNPt3oM_pM8TSpPhSL_rGwGix99iLj0hdyHCZTP3XYeOO8sf9ghhHHFO2I7QpDrgSyGd1VQ4';
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    const stringifiedSubscription = JSON.stringify(newSubscription)

    return window.opener.postMessage({ stringifiedSubscription }, '*');
  } catch (err) {
    console.log('error creating push subscription:', err);
  }
});