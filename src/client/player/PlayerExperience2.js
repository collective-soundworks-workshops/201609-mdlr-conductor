import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

import SpatSourcesHandler from './SpatSourcesHandler';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

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

    // bind
    this.init = this.init.bind(this);
    this.start = this.start.bind(this);

    // local attributes
    this.hasStarted = false;
    this.lastShakeTime = 0.0;
    this.beingMovedSrcId = -1;
    this.currentOrientation = {azim:0, elev:0};
    this.phaseId = 2;

    this.start();
  }

  init() {
    console.log('phase 2: init');
    
    // initialize the view
    this.view.content.title = 'Maestro';
    this.view.content.instructions = 'touch to grab instrument';
    this.view.content.classname = 'phase-2';
    this.view.render();
    
    // change bkd color
    this.view.$el.lastElementChild.className = "foreground phase-" + this.phaseId;

    this.hasStarted = true;

  }

  start() {
    console.log('phase 2: start');
    // super.start();

    if (!this.hasStarted){

      this.init();
      
    

      // init audio source spatializer
      let roomReverb = false;
      this.spatSourceHandler = new SpatSourcesHandler(this.loader.buffers, roomReverb);
      this.spatSourceHandler.start();

    }

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

    // setup touch listeners (reset listener orientation on touch)
    this.surface.addListener('touchstart', (id, normX, normY) => {
      // if( this.beingMovedSrcId == -1 ){ // DEBUG
        
        // select closest source
        this.beingMovedSrcId = this.spatSourceHandler.getNearestSource(this.currentOrientation.azim);
        console.log('source being moved:', this.beingMovedSrcId);
        
        // change bkg color
        this.view.$el.lastElementChild.className = "foreground phase-" + this.phaseId + "-screen-touched";
    });

    this.surface.addListener('touchend', (id, normX, normY) => {
        // disable source motion
        this.beingMovedSrcId = -1;
        // change bkg color
        this.view.$el.lastElementChild.className = "foreground phase-" + this.phaseId;
        // this.renderer.setBkgColor([100, 0, 0]);

    });    

    this.surface.addListener('touchmove', (id, normX, normY) => {
      // let val = normX;;
      // this.spatSourceHandler.setSourceEffect( this.beingMovedSrcId, val );

      // apply volume
      // val = 1 - normY;
      // this.spatSourceHandler.setSourceVolume( this.beingMovedSrcId, val );
    }); 


  
  }

  stop(){
    // stop all sources
    this.spatSourceHandler.stop();

    // remove listeners
    this.surface._listeners.touchstart = [];
    this.surface._listeners.touchmove = [];
    this.surface._listeners.touchend = [];  
    this.motionInput.removeListener('accelerationIncludingGravity');  
    this.motionInput.removeListener('deviceorientation');  
  }

}
