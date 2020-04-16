window.twitchVerificationResponse = null;

var url = window.location.href;
var idTokenIdx = url.indexOf('id_token=');

if (idTokenIdx > -1) {
    var idTokenObj = { idToken: url.slice(idTokenIdx + 'id_token='.length)};

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/producer/twitch/verify');
    xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE) {
            document.body.appendChild(document.createTextNode('done'));
            window.twitchVerificationResponse = xhr.responseText;
        }
    };
    xhr.send(JSON.stringify(idTokenObj));
}