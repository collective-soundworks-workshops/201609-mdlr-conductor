// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';
import PlayerExperience from './PlayerExperience.js';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';

// list of files to load (passed to the experience)
// const audioFiles = [
//   'sounds/0_catch.mp3',
//   'sounds/0_deplacement.mp3',
//   'sounds/0_drop.mp3',
//   'sounds/0_niveau2.mp3',
//   'sounds/0_POP LVL 2.mp3',
//   'sounds/0_TUNING.mp3',
//   'sounds/BELLS.mp3',
//   'sounds/BRASS.mp3',
//   'sounds/CELLOS.mp3',
//   'sounds/DRUMS.mp3',
//   'sounds/FLUTES.mp3',
//   'sounds/KEYS.mp3',
//   'sounds/VIOLONS.mp3',
//   'sounds/WINDS.mp3'
// ];

// list of files to load (passed to the experience)
const audioFiles = [
  'sounds/0_catch.wav',
  'sounds/0_deplacement.wav',
  'sounds/0_drop.wav',
  'sounds/0_niveau2.wav',
  'sounds/0_POP LVL 2.wav',
  'sounds/0_TUNING.wav',
  'sounds/DRUMS_SNARE.mp3',
  'sounds/KEYS_BELLS.mp3',
  'sounds/VIOLONS_CELLOS.mp3',
  'sounds/WINDS_BRASS_FLUTE.mp3',
];

// const audioFiles = [
//   'sounds/dummy.wav',
//   'sounds/dummy.wav',
//   'sounds/dummy.wav',
//   'sounds/dummy.wav',
//   'sounds/dummy.wav',
//   'sounds/dummy.wav',
//   'sounds/100_celt_bass.mp3',
//   'sounds/100_celt_melody.mp3',
//   'sounds/100_gadda_harmony.mp3',
//   'sounds/100_hb_drums.mp3'
// ];




// launch application when document is fully loaded
const init = () => {
  // configuration received from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const { appName, clientType, socketIO, assetsDomain, standalone, beaconUUID }  = window.soundworksConfig;
  // initialize the 'player' client
  soundworks.client.init(clientType, { appName, socketIO });
  soundworks.client.setViewContentDefinitions(viewContent);
  soundworks.client.setViewTemplateDefinitions(viewTemplates);

  // create client side (player) experience
  const experience = new PlayerExperience(assetsDomain, standalone, beaconUUID, audioFiles);

  // start the client
  soundworks.client.start();
};

if (!!window.cordova)
  document.addEventListener('deviceready', init);
else
  window.addEventListener('load', init);
