console.log("top of ServiceWorker.js");

self.addEventListener("push", event => {
  console.log("push notification received, event:", JSON.stringify(event));

  const payload = event.data ? event.data.text() : "no payload";

  event.waitUntil(
    self.registration
      .showNotification("Catch The Run", {
        body: payload
      })
      .then(res => console.log("showNotification res:", res))
      .catch(err => console.log("showNotification err:", err))
  );

  console.log("end of function");
});