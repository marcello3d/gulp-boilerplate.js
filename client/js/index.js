console.log("Hello world!");

require('./lib/foobar');

document.getElementById('message').textContent = location.hostname ? 'Congratulations, you got everything running!' : 'You are looking at the pre-compiled website!'