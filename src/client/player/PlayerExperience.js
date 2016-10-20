import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

import PlayerExperience1 from './PlayerExperience1';
import PlayerExperience2 from './PlayerExperience2';
import SimpleAudioPlayer from './SimpleAudioPlayer';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

const viewTemplate = `
  <canvas class="background"></canvas>
  <div class="foreground <%= classname %>">

    <div class="section-top flex-middle">
      <p class="big"> <%= title %> </p>
    </div>

    <div class="section-center flex-center">
      <p class="small"> <%= instructions %> </p>
    </div>

    <div class="section-bottom flex-middle">
      <p id="value0" class="small"><%= 'NaN' %></p>
      <p id="value1" class="small"><%= 'NaN' %></p>
      <p id="value2" class="small"><%= 'NaN' %></p>      
    </div>

  </div>
`;

export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain, standalone, beaconUUID, audioFiles) {
    super(!standalone);

    // services
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin', { showDialog: false });    
    this.params = this.require('shared-params');
    this.motionInput = this.require('motion-input', { descriptors: ['deviceorientation', 'accelerationIncludingGravity'] });
    this.loader = this.require('loader', { files: audioFiles });
    this.sync = this.require('sync');
    this.scheduler = this.require('scheduler');
    if (window.cordova) {
      this.beacon = this.require('beacon', { uuid: beaconUUID });
    }

    // passed attributes
    this.services = {motionInput:this.motionInput, loader:this.loader, beacon:this.beacon, sync:this.sync, scheduler:this.scheduler};
    this.args = {assetsDomain:assetsDomain, standalone:standalone, beaconUUID:beaconUUID, audioFiles:audioFiles, 
                 view:undefined, surface:undefined};

    // bind
    this.reset = this.reset.bind(this);
  }

  init() {
    // init view
    this.viewTemplate = viewTemplate;
    this.viewContent = { title: 'Base Experience', classname: 'phase-none', instructions: '' };
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();
    
    // touch surface
    const surface = new soundworks.TouchSurface(this.view.$el);
    
    // prepare args
    this.args.view = this.view;
    this.args.surface = surface;
  }

  start() {
    super.start();

    if (!this.hasStarted)
      this.init();

    this.show();

    // init simple audio player
    this.simpleAudioPlayer = new SimpleAudioPlayer(this.loader.buffers);

    // disable text selection and magnifier on ios
    document.getElementsByTagName("body")[0].addEventListener("touchstart",
    function(e) { e.returnValue = false });

    this.params.addParamListener('phaseId', (phaseId) => {
      
      console.log('Start phase', phaseId);

      if( phaseId == 1 ){
        // start audio simple
        this.simpleAudioPlayer.startSource(5);
        //         
        if (this.experience !== undefined) this.reset();
        this.experience = new PlayerExperience1( this.args, this.services );
      }
      else if( phaseId == 2 ){
        // start audio simple
        this.simpleAudioPlayer.stopSource(5);     
           
        // play sound phase 2
        // this.simpleAudioPlayer.startSource(4);
        if (this.experience !== undefined) this.reset();
        this.experience = new PlayerExperience2( this.args, this.services );
      }

    });


  }

  reset() {
    this.experience.stop();
  }

}
