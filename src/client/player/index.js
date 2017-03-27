// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';
import PlayerExperience from './PlayerExperience.js';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';

// list of files to load (passed to the experience)
const audioFiles = [
  'sounds/0_POP LVL 2.wav',
  'sounds/0_TUNING.wav',
  'sounds/0_TOUCH.wav',
  'sounds/VIOLONS_CELLOS.mp3',
  'sounds/KEYS_BELLS.mp3',
  'sounds/WINDS_BRASS_FLUTE.mp3',
  'sounds/DRUMS_SNARE.mp3',
];

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
  const experience = new PlayerExperience(assetsDomain, standalone, audioFiles);

  // start the client
  soundworks.client.start();
};

if (!!window.cordova)
  document.addEventListener('deviceready', init);
else
  window.addEventListener('load', init);
