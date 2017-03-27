import * as soundworks from 'soundworks/client';

import SpatSourcesHandler from './SpatSourcesHandler';
import SimpleAudioPlayer from './SimpleAudioPlayer';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

const viewTemplate = `
  <canvas class="background"></canvas>
  <div class="foreground phase-2">

    <div class="section-top flex-middle">
      <p class="big"> Maestro </p>
    </div>

    <div class="section-center flex-center">
      <p class="small"> touch to start! <br /> <br /> then touch to grab instrument <br /> <br /> aim up/down: volume <br /> <br /> rotate wrist: effect </p>
    </div>

    <div class="section-bottom flex-middle">
      <p id="value0" class="small"><%= 'NaN' %></p>
      <p id="value1" class="small"><%= 'NaN' %></p>
      <p id="value2" class="small"><%= 'NaN' %></p>      
      <p id="sourceId" class="small"> </p>
    </div>

  </div>
`;

/** 
* Control the instrument of a virtual orchestra in front of you. 
Player can grasp instruments to change their position / volume / filter effect
**/
export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain, standalone, audioFiles) {
    super(!standalone);

    // services
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.motionInput = this.require('motion-input', { descriptors: ['deviceorientation', 'accelerationIncludingGravity'] });
    this.loader = this.require('loader', { files: audioFiles });

    // local attributes
    this.hasStarted = false;
    this.beingMovedSrcId = -1;
    this.currentOrientation = {azim:0, elev:0};

    this.isOrientationInitialized = false;
    this.savedAzim = 0;
    this.offsetAzim = 0;
  }

  init() {
    // init view
    this.viewTemplate = viewTemplate;
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();
  }

  start() {
    super.start();

    if (!this.hasStarted){
      this.init();
      this.hasStarted = true;
    }

    this.show();

    // disable text selection and magnifier on ios
    document.getElementsByTagName("body")[0].addEventListener("touchstart",
    function(e) { e.returnValue = false });

    // init simple audio player, start intro sound
    this.simpleAudioPlayer = new SimpleAudioPlayer(this.loader.buffers);
    this.simpleAudioPlayer.startSource(1, 10, true);
    
    // init audio source spatializer
    let roomReverb = false;
    let ambiOrder = 2;
    this.spatSourceHandler = new SpatSourcesHandler(this.loader.buffers, roomReverb, ambiOrder);

   // setup motion input listener (update audio listener aim based on device orientation)
    if (this.motionInput.isAvailable('deviceorientation')) {
      this.motionInput.addListener('deviceorientation', (data) => {

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

    // touch surface
    const surface = new soundworks.TouchSurface(this.view.$el);
    const srcIdOffset = 3; // offset from which to fetch sound sources in audio buffer array
    // setup touch listeners (grab source to be moved / filtered on touchstart)
    surface.addListener('touchstart', (id, normX, normY) => {
      if( !this.isOrientationInitialized ){
        // init ori
        this.offsetAzim = this.currentOrientation.azim;
        // stop tunning sound
        this.simpleAudioPlayer.stopSource(1, 0);
        // play sound init ok
        this.simpleAudioPlayer.startSource(0);

        // start spat sources
        for( let i = srcIdOffset; i < this.loader.buffers.length; i ++ ){
          let numSound = this.loader.buffers.length - srcIdOffset;
          let initAzim = (180 / (numSound - 1) ) * (i - srcIdOffset) - 90; // equi in front
          if (initAzim < 0){ initAzim = 360 + initAzim };
          this.spatSourceHandler.startSource(i, initAzim, 0, true, 4);
        }
      }
      else{        
        // play touch start sound
        this.simpleAudioPlayer.startSource(2);
        // select closest source
        this.beingMovedSrcId = this.spatSourceHandler.getNearestSource(this.currentOrientation.azim);
        // display src id on screen
        document.getElementById("sourceId").innerHTML = this.beingMovedSrcId - srcIdOffset;
        // change bkg color
        this.view.$el.lastElementChild.className = "foreground phase-2-screen-touched";
      }
    });
  
    // setup touch listeners (drop source at position on touchend)
    surface.addListener('touchend', (id, normX, normY) => {
      // init orientation for first touch end
      if( !this.isOrientationInitialized ){
        this.isOrientationInitialized = true;
        return;
      }

      // play touch end sound
      this.simpleAudioPlayer.startSource(2);
      // disable source motion
      this.beingMovedSrcId = -1;
      // change bkg color
      this.view.$el.lastElementChild.className = "foreground phase-2";

    });    

  }
}
