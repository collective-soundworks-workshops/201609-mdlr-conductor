import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

import AudioPlayer from './AudioPlayer';

const audioContext = soundworks.audioContext;
const client = soundworks.client;
const srcIdOffset = 6;

const AddedOffsetToPlayerBeaconId = 100;
// this experience plays a sound when it starts, and plays another sound when
// other clients join the experience
export default class PlayerExperience extends soundworks.Experience {
  constructor(args, services) {
    super(!args.standalone);

    // args
    this.view = args.view;
    this.surface = args.surface;

    // services
    this.loader = services.loader;
    this.motionInput = services.motionInput;
    this.beacon = services.beacon;
    this.sync = services.sync;
    this.scheduler = services.scheduler;

    // bind
    this.init = this.init.bind(this);
    this.start = this.start.bind(this);
    if( this.beacon ) this.beaconCallback = this.beaconCallback.bind(this);

    // local attributes
    this.hasStarted = false;
    this.phaseId = 1;
    this.selectedSoundId = -1;
    this.beaconMap = new Map();

    this.start();
  }

  init() {
    
    console.log('phase 1: init');

    // initialize the view
    console.log(this.view);
    // this.view.content.title = 'Beacon Id: 0.' + (client.index + AddedOffsetToPlayerBeaconId);
    this.view.content.title = 'Sound Finder <br /> <br /> lvl ' + (client.index + AddedOffsetToPlayerBeaconId);
    this.view.content.instructions = 'explore sounds from nearest beacons <br /> <br /> touch the screen to make it your own';
    this.view.content.classname = 'phase-1';
    this.view.render();
    
    // change bkd color
    this.view.$el.lastElementChild.className = "foreground phase-" + this.phaseId;

    // init beacon 
    this.initBeacon();

    this.hasStarted = true;
  }

  start() {
    console.log('phase 1: start');
    // super.start();

    if (!this.hasStarted) this.init();

    this.audioPlayer = new AudioPlayer(this.sync, this.scheduler, this.loader.buffers, {
      quantization: 2.4,
    });

    // console.log(this.motionInput);
    // // setup motion input listener (update audio listener aim based on device orientation)
    // if (this.motionInput.isAvailable('deviceorientation')) {
    //   this.motionInput.addListener('deviceorientation', (data) => {
    //     // display orientation info on screen
    //     document.getElementById("value0").innerHTML = Math.round(data[0]*10)/10;
    //     document.getElementById("value1").innerHTML = Math.round(data[1]*10)/10;
    //     document.getElementById("value2").innerHTML = Math.round(data[2]*10)/10;
    //   });

    // }

    // // setup motion input listeners (shake to change listening mode)
    // if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
    //   this.motionInput.addListener('accelerationIncludingGravity', (data) => {

    //       // get acceleration data
    //       const mag = Math.sqrt(data[0] * data[0] + data[1] * data[1] + data[2] * data[2]);

    //       // switch between spatialized mono sources / HOA playing on shaking (+ throttle inputs)
    //       if (mag > 40 && ( (audioContext.currentTime - this.lastShakeTime) > 0.5) ){
    //         // update throttle timer
    //         this.lastShakeTime = audioContext.currentTime;
    //         // do something
    //         // ...
    //       }
    //   });
    // }

    // setup touch listeners (reset listener orientation on touch)
    this.surface.addListener('touchstart', (id, normX, normY) => {
        // change bkg color
        this.view.$el.lastElementChild.className = "foreground phase-" + this.phaseId + "-screen-touched";
        
        // get nearest beacon
        let nearestId = -1; 
        let dist = Infinity;
        this.beaconMap.forEach((item, key) => {
          if( item < dist ){
            dist = item;
            nearestId = key;
          }
        });
        if( nearestId > -1) {
          this.selectedSoundId = nearestId;
          console.log('selected sound:', nearestId);
        }
    });

    this.surface.addListener('touchend', (id, normX, normY) => {
        // change bkg color
        this.view.$el.lastElementChild.className = "foreground phase-" + this.phaseId;
    });    
  
  }

  stop(){
    // remove listeners
    this.surface._listeners.touchstart = [];
    // this.surface._listeners.touchmove = [];
    this.surface._listeners.touchend = [];  
    // this.motionInput.removeListener('accelerationIncludingGravity');  
    // this.motionInput.removeListener('deviceorientation');  

    this.beacon = null;
    this.beaconCallback = function(){};

    // remove audio tracks
    this.audioPlayer.stop();
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
      this.beacon.major = 0;
      this.beacon.minor = client.index + AddedOffsetToPlayerBeaconId; // dirty offset, I'm a player, keep away from "beacon" indexes
      this.beacon.restartAdvertising();
    
    }

    // INIT FAKE BEACON (for computer based debug)
    else { 
      this.beacon = {major:0, minor: client.index + AddedOffsetToPlayerBeaconId};
      this.beacon.rssiToDist = function(){return 1.5 + 2*Math.random()};    
      window.setInterval(() => {
        var pluginResult = { beacons : [] };
        for (let i = 0; i < 4; i++) {
          if( i != client.index ){
            var beacon = {
              major: 0,
              minor: i,
              rssi: -45 - i * 5,
              proximity : 'fake, nearby',
            };
            pluginResult.beacons.push(beacon);
          }
        }
        this.beaconCallback(pluginResult);
      }, 1000);
    }

  }

  beaconCallback(pluginResult) {
    // // diplay beacon list on screen
    // var log = 'Closeby Beacons: </br></br>';
    // pluginResult.beacons.forEach((beacon) => {
    //   log += beacon.major + '.' + beacon.minor + ' dist: ' 
    //         + Math.round( this.beacon.rssiToDist(beacon.rssi)*100, 2 ) / 100 + 'm' + '</br>' +
    //          '(' + beacon.proximity + ')' + '</br></br>';
    // });
    // document.getElementById('logValues').innerHTML = log;

    
    pluginResult.beacons.forEach((beacon) => {
      let dist = this.beacon.rssiToDist(beacon.rssi);
      // save into local map
      this.beaconMap.set( beacon.minor, dist );
      // update audio tracks  
      if (beacon.minor < this.loader.buffers.length){
        // keep selected track always close by
        // console.log('beacon', beacon.minor, dist);
        if( beacon.minor == this.selectedSoundId ){
          // console.log('keep', this.selectedSoundId, beacon.minor, dist);
          dist = 0.1;
        } 

        this.audioPlayer.updateTrack(beacon.minor + srcIdOffset, dist);
      }
    });
  }

  // -------------------------------------------------------------------------------------------

}
