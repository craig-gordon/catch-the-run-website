self.addEventListener("push", event => {
  const payload = event.data ? event.data.text() : "no payload";

  event.waitUntil(
    self.registration.showNotification("Catch The Run", { body: payload })
  );
});