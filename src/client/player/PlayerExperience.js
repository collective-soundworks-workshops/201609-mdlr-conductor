import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

import SpatSourcesHandler from './SpatSourcesHandler';
import PlayerRenderer from './PlayerRenderer';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

const viewTemplate = `
  <canvas class="background"></canvas>
  <div class="foreground background-beacon">

    <div class="section-top flex-middle">
      <p class="big">Beacon ID: <%= major %>.<%= minor %></p>
      </br>
      <p class="small"> touch to grab instrument </p>
    </div>

    <div class="section-center flex-center">
      <p class="small" id="logValues"></p>
    </div>

    <div class="section-bottom flex-middle">
      <p id="value0" class="small"><%= 'NaN' %></p>
      <p id="value1" class="small"><%= 'NaN' %></p>
      <p id="value2" class="small"><%= 'NaN' %></p>      
    </div>

  </div>
`;

// this experience plays a sound when it starts, and plays another sound when
// other clients join the experience
export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain, standalone, beaconUUID, audioFiles) {
    super(!standalone);
    this.standalone = standalone;

    // services
    this.platform = this.require('platform', { features: ['web-audio'] });
    if (!standalone) this.checkin = this.require('checkin', { showDialog: false });
    this.loader = this.require('loader', { files: audioFiles });
    this.motionInput = this.require('motion-input', { descriptors: ['deviceorientation', 'accelerationIncludingGravity'] });
    // beacon only work in cordova mode since it needs access right to BLE
    if (window.cordova) {
      this.beacon = this.require('beacon', { uuid: beaconUUID });
      this.beaconCallback = this.beaconCallback.bind(this);
    }

    // bind
    this.initBeacon = this.initBeacon.bind(this);

    // local attributes
    this.lastShakeTime = 0.0;
    this.beingMovedSrcId = -1;
    this.currentOrientation = {azim:0, elev:0};
  }

  init() {
    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = { major: this.beacon.major, minor: this.beacon.minor };
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();
    this.renderer = new PlayerRenderer();
    this.view.addRenderer(this.renderer);
  }

  start() {
    super.start();

    if (!this.hasStarted){
      this.initBeacon();
      this.init();
    }

    this.show();

    // init audio source spatializer
    let roomReverb = false;
    this.spatSourceHandler = new SpatSourcesHandler(this.loader.buffers, roomReverb);
    this.spatSourceHandler.start();

    // setup motion input listener (update audio listener aim based on device orientation)
    if (this.motionInput.isAvailable('deviceorientation')) {
      this.motionInput.addListener('deviceorientation', (data) => {
        // display orientation info on screen
        document.getElementById("value0").innerHTML = Math.round(data[0]*10)/10;
        document.getElementById("value1").innerHTML = Math.round(data[1]*10)/10;
        document.getElementById("value2").innerHTML = Math.round(data[2]*10)/10;
        // this.spatSourceHandler.setListenerAim(data[0], data[1]);
        // if selected source (touch) then..
        this.currentOrientation.azim = data[0];
        if( this.beingMovedSrcId > -1 ){
          // move source
          let val = data[0];
          if (Math.abs(data[1]) > 90) val -= 180;
          this.spatSourceHandler.setSourcePos( this.beingMovedSrcId, val, 0 );
          
          // apply effect (after remapping of data to traditional roll)
          val = - data[2];
          if (Math.abs(data[1]) > 90) val = 180 + val;
          val = Math.max(Math.min( 1 - (val / 180), 1), 0);
          this.spatSourceHandler.setSourceEffect( this.beingMovedSrcId, val );

          // apply volume (-90 90 whatever "effect angle" value -> DOESN T WORK)
          // if( val > 90 ) val = 180 - val;
          // if( val < -90 ) val = -180 - val;
          val = Math.min( Math.max(0, (90 + data[1]) / 180), 1);
          this.spatSourceHandler.setSourceVolume( this.beingMovedSrcId, val );
        }

      });
    }

    // setup motion input listeners (shake to change listening mode)
    if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
      this.motionInput.addListener('accelerationIncludingGravity', (data) => {

          // get acceleration data
          const mag = Math.sqrt(data[0] * data[0] + data[1] * data[1] + data[2] * data[2]);

          // switch between spatialized mono sources / HOA playing on shaking (+ throttle inputs)
          if (mag > 40 && ( (audioContext.currentTime - this.lastShakeTime) > 0.5) ){
            // update throttle timer
            this.lastShakeTime = audioContext.currentTime;
            // do something
            // ...
          }
      });
    }

    // create touch event source referring to our view
    const surface = new soundworks.TouchSurface(this.view.$el);
    // setup touch listeners (reset listener orientation on touch)
    surface.addListener('touchstart', (id, normX, normY) => {
      // if( this.beingMovedSrcId == -1 ){ // DEBUG
        
        // select closest source
        this.beingMovedSrcId = this.spatSourceHandler.getNearestSource(this.currentOrientation.azim);
        console.log('source being moved:', this.beingMovedSrcId);
        
        // change bkg color
        this.renderer.setBkgColor([0, 100, 0]);
      // } // DEBUG
      // else{ // DEBUG (with if above and comments below)
      //   this.beingMovedSrcId = -1;
      //   this.renderer.setBkgColor([0, 0, 0]);        
      // }
    });
    surface.addListener('touchend', (id, normX, normY) => {
      // disable source motion
      this.beingMovedSrcId = -1;
      // change bkg color
      this.renderer.setBkgColor([0, 0, 0]);
    });    
    surface.addListener('touchmove', (id, normX, normY) => {
      // let val = normX;;
      // this.spatSourceHandler.setSourceEffect( this.beingMovedSrcId, val );

      // apply volume
      // val = 1 - normY;
      // this.spatSourceHandler.setSourceVolume( this.beingMovedSrcId, val );
    }); 
  }

  // -------------------------------------------------------------------------------------------
  // BEACON-RELATED METHODS
  // -------------------------------------------------------------------------------------------

  initBeacon() {

    // initialize ibeacon service
    if (this.beacon) {
      // add callback, invoked whenever beacon scan is executed
      this.beacon.addListener(this.beaconCallback);
      // fake calibration
      this.beacon.txPower = -55; // in dB (see beacon service for detail)
      // set major / minor ID based on client id
      if (!this.standalone) {
        this.beacon.major = 0;
        this.beacon.minor = client.index;
        this.beacon.restartAdvertising();
      }
    }

    // INIT FAKE BEACON (for computer based debug)
    else { 
      this.beacon = {major:0, minor: client.index};
      this.beacon.rssiToDist = function(){return 1.5 + 1*Math.random()};    
      window.setInterval(() => {
        var pluginResult = { beacons : [] };
        for (let i = 0; i < 4; i++) {
          var beacon = {
            major: 0,
            minor: i,
            rssi: -45 - i * 5,
            proximity : 'fake, nearby',
          };
          pluginResult.beacons.push(beacon);
        }
        this.beaconCallback(pluginResult);
      }, 1000);
    }

  }

  beaconCallback(pluginResult) {
    // diplay beacon list on screen
    var log = 'Closeby Beacons: </br></br>';
    pluginResult.beacons.forEach((beacon) => {
      log += beacon.major + '.' + beacon.minor + ' dist: ' 
            + Math.round( this.beacon.rssiToDist(beacon.rssi)*100, 2 ) / 100 + 'm' + '</br>' +
             '(' + beacon.proximity + ')' + '</br></br>';
    });
    document.getElementById('logValues').innerHTML = log;

  }

  // -------------------------------------------------------------------------------------------

}
