import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

import SpatSourcesHandler from './SpatSourcesHandler';
import SimpleAudioPlayer from './SimpleAudioPlayer';

const audioContext = soundworks.audioContext;
const client = soundworks.client;
const srcIdOffset = 7;

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

    this.isOrientationInitialized = false;
    this.savedAzim = 0;
    this.offsetAzim = 0;
  }

  init() {
    console.log('phase 2: init');
    
    // initialize the view
    this.view.content.title = 'Maestro';
    this.view.content.instructions = 'touch to start! <br /> <br /> then touch to grab instrument <br /> <br /> aim up/down: volume <br /> <br /> rotate wrist: effect';
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

      // init simple audio player
      this.simpleAudioPlayer = new SimpleAudioPlayer(this.loader.buffers);    

      // start tunning sound
      this.simpleAudioPlayer.startSource(5, 10, true);

      // this.oscillator = audioContext.createOscillator();
      // this.oscillator.connect(audioContext.destination);
      // this.oscillator.type = 'square';
      // this.oscillator.frequency.value = 100; // valeur en hertz      
      // this.oscillator.start();

    }

    // setup motion input listener (update audio listener aim based on device orientation)
    if (this.motionInput.isAvailable('deviceorientation')) {
      this.motionInput.addListener('deviceorientation', (data) => {
        // display orientation info on screen
        // this.spatSourceHandler.setListenerAim(data[0], data[1]);
        // if selected source (touch) then..

        // move source: stabilize azimuth
        let val = data[0] - this.offsetAzim;
        if (Math.abs(data[1]) > 90){
          if( data[0] < 180)  val =  val + 180;
          else val = val - 180;
        }
        this.spatSourceHandler.setSourcePos( this.beingMovedSrcId, val, 0 );
        this.currentOrientation.azim = val; // keep local copy for nearest source detection latter
        document.getElementById("value0").innerHTML = Math.round(val*10)/10;

        // apply effect (after remapping of data to traditional roll)
        val = - data[2];
        if (Math.abs(data[1]) > 90) val = 180 + val;
        val = Math.max(Math.min( 1 - (val / 180), 1), 0);
        this.spatSourceHandler.setSourceEffect( this.beingMovedSrcId, val );
        document.getElementById("value1").innerHTML = Math.round(val*10)/10;

        // apply volume (-90 90 whatever "effect angle" value -> DOESN T WORK)
        val = data[1];
        if( data[1] > 90 ) val = 180 - data[1];
        if( data[1] < -90 ) val = -180 - data[1];
        val = Math.min( Math.max(0, (90 + val) / 180), 1);
        this.spatSourceHandler.setSourceVolume( this.beingMovedSrcId, val );
        document.getElementById("value2").innerHTML = Math.round(val*10)/10;

      });
    }

    // // setup motion input listeners (shake to change listening mode)
    // if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
    //   this.motionInput.addListener('accelerationIncludingGravity', (data) => {

    //       // get acceleration data
    //       const mag = Math.sqrt(data[0] * data[0] + data[1] * data[1] + data[2] * data[2]);

    //       // switch between spatialized mono sources / HOA playing on shaking (+ throttle inputs)
    //       if (mag > 40 && ( (audioContext.currentTime - this.lastShakeTime) > 0.5) ){
    //         // update throttle timer
    //         this.lastShakeTime = audioContext.currentTime;

    //         // play init orientation sound
    //         // this.simpleAudioPlayer.startSource(6);

    //       }
    //   });
    // }

    // setup touch listeners (reset listener orientation on touch)
    this.surface.addListener('touchstart', (id, normX, normY) => {
      if( !this.isOrientationInitialized ){

        // init ori
        this.offsetAzim = this.currentOrientation.azim;

        // stop tunning sound
        this.simpleAudioPlayer.stopSource(5, 0);

        // play sound init ok
        this.simpleAudioPlayer.startSource(4);

        // start spat sources
        for( let i = srcIdOffset; i < this.loader.buffers.length; i ++ ){
          let numSound = this.loader.buffers.length - srcIdOffset;
          let initAzim = (180 / (numSound - 1) ) * (i - srcIdOffset) - 90; // equi in front
          if (initAzim < 0) initAzim = 360 + initAzim;
          console.log(i, initAzim);
          this.spatSourceHandler.startSource(i, initAzim, 0, true, 4);
        }     

        return
      }
      
        
        // play touch start sound
        this.simpleAudioPlayer.startSource(6);

        // start displacement sound
        // this.simpleAudioPlayer.startSource(1, 0.5, true);

        // select closest source
        this.beingMovedSrcId = this.spatSourceHandler.getNearestSource(this.currentOrientation.azim);
        console.log('source being moved:', this.beingMovedSrcId);
        
        // change bkg color
        this.view.$el.lastElementChild.className = "foreground phase-" + this.phaseId + "-screen-touched";
      
    });

    this.surface.addListener('touchend', (id, normX, normY) => {

        if( !this.isOrientationInitialized ){
          this.isOrientationInitialized = true;
          return
        }


        // play touch end sound
        // this.simpleAudioPlayer.startSource(2, 0, false);
        this.simpleAudioPlayer.startSource(6);
        
        // stop displacement sound
        // this.simpleAudioPlayer.stopSource(1);

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
