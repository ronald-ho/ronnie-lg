// Everything that can go on the home screen. `id` is the webOS app id passed to
// applicationManager/launch. Apps with no icon file get a coloured tile with an SVG `glyph`.
var HDMI = '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"><path d="M6 16h36v10l-5 6H11l-5-6z"/><path d="M14 22h20" stroke-linecap="round"/></svg>';
var GEAR = '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3"><circle cx="24" cy="24" r="6"/><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M10.6 37.4l4.2-4.2M33.2 14.8l4.2-4.2" stroke-linecap="round"/></svg>';
var SWITCH = '<svg viewBox="0 0 48 48"><rect x="8" y="6" width="14" height="36" rx="7" fill="#fff"/><rect x="26" y="6" width="14" height="36" rx="7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="15" cy="16" r="3" fill="#e60012"/><circle cx="33" cy="30" r="3" fill="#fff"/></svg>';
window.PLUS = '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M24 12v24M12 24h24"/></svg>';

window.CATALOG = [
  { id: 'youtube.leanback.v4', title: 'YouTube', icon: 'icons/youtube.leanback.v4.png' },
  { id: 'io.strem.tv', title: 'Stremio', icon: 'icons/io.strem.tv.png' },
  { id: 'spotify-beehive', title: 'Spotify', icon: 'icons/spotify-beehive.png', color: '#14532d' },
  { id: 'tv.twitch.tv.starshot.lg', title: 'Twitch', icon: 'icons/tv.twitch.tv.starshot.lg.png' },
  { id: 'com.accedo.mi9.prod', title: '9Now', icon: 'icons/com.accedo.mi9.prod.png' },
  { id: 'com.webos.app.hdmi1', title: 'Nintendo Switch', glyph: SWITCH, color: '#e60012' },
  { id: 'com.webos.app.livetv', title: 'Live TV', glyph: HDMI, color: '#3a3a3c' },
  { id: 'com.webos.app.browser', title: 'Web Browser', icon: 'icons/com.webos.app.browser.png' },
  { id: 'com.webos.app.mediadiscovery', title: 'Media Player', icon: 'icons/com.webos.app.mediadiscovery.png' },
  { id: 'com.webos.app.hdmi2', title: 'Sonos (HDMI 2)', glyph: HDMI, color: '#3a3a3c' },
  { id: 'com.webos.app.hdmi3', title: 'HDMI 3', glyph: HDMI, color: '#3a3a3c' },
  { id: 'com.webos.app.hdmi4', title: 'HDMI 4', glyph: HDMI, color: '#3a3a3c' },
  { id: 'com.webos.app.lgchannels', title: 'LG Channels', icon: 'icons/com.webos.app.lgchannels.png' },
  { id: 'com.webos.app.igallery', title: 'Art Gallery', icon: 'icons/com.webos.app.igallery.png' },
  { id: 'amazon.alexa.view', title: 'Amazon Alexa', icon: 'icons/amazon.alexa.view.png' },
  { id: 'com.webos.app.homeconnect', title: 'Home Dashboard', icon: 'icons/com.webos.app.homeconnect.png' },
  { id: 'com.webos.app.discovery', title: 'LG Apps', icon: 'icons/com.webos.app.discovery.png' },
  { id: 'com.webos.app.roomconnect', title: 'Room to Room Share', icon: 'icons/com.webos.app.roomconnect.png' },
  { id: 'com.webos.app.sportsteamsettings', title: 'Sports Alert', icon: 'icons/com.webos.app.sportsteamsettings.png' },
  { id: 'org.webosbrew.hbchannel', title: 'Homebrew Channel', icon: 'icons/org.webosbrew.hbchannel.png' },
  { id: 'com.palmdts.devmode', title: 'Developer Mode', icon: 'icons/com.palmdts.devmode.png' },
  { id: 'com.palm.app.settings', title: 'Settings', glyph: GEAR, color: '#48484a' }
];

// Default dock, left to right. On the TV: hold OK on a tile to move or remove it,
// or pick the + tile to add an app.
window.DEFAULT_DOCK = [
  'youtube.leanback.v4',
  'io.strem.tv',
  'spotify-beehive',
  'tv.twitch.tv.starshot.lg',
  'com.accedo.mi9.prod',
  'com.webos.app.hdmi1'
];

// Antenna channels for the Live TV row, by channel number. The tuner's channelId is
// looked up at launch, so a rescan doesn't break these.
window.CHANNELS = [
  { num: '20', name: 'ABC TV HD', color: '#26262a' },
  { num: '30', name: 'SBS HD', color: '#5c4700' },
  { num: '70', name: '7HD', color: '#8c0010' },
  { num: '90', name: '9HD', color: '#00457d' },
  { num: '10', name: '10 HD', color: '#3a2a1c' },
  { num: '24', name: 'ABC News', color: '#26262a' },
  { num: '22', name: 'ABC Kids', color: '#26262a' },
  { num: '72', name: '7two', color: '#8c0010' },
  { num: '93', name: '9Go!', color: '#00457d' },
  { num: '32', name: 'SBS Movies', color: '#5c4700' }
];
