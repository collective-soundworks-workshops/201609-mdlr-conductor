import * as ambisonics from 'ambisonics';
import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

/**
* Spherical coordinate system
* azim stands for azimuth, horizontal angle (eyes plane), 0 is facing forward, clockwise +
* elev stands for elevation, vertical angle (mouth-nose plane), 0 is facing forward, + is up
**/

export default class SpatSourcesHandler {
    constructor(bufferSources, roomReverb = false) {
        
        // master gain out
        this.gainOut = audioContext.createGain();
        this.gainOut.gain.value = 0.5;

        // create ambisonic decoder (common to all sources)
        this.ambisonicOrder = 3;
        this.decoder = new ambisonics.binDecoder(audioContext, this.ambisonicOrder);

        // load HOA to binaural filters in decoder
        var irUrl = 'IRs/HOA3_filters_virtual.wav';
        if( roomReverb ){
            // different IR for reverb (+ gain adjust for iso-loudness)
            irUrl = 'IRs/room-medium-1-furnished-src-20-Set1_16b.wav';
            this.gainOut.gain.value *= 0.5;
        }

        var loader_filters = new ambisonics.HOAloader(audioContext, this.ambisonicOrder, irUrl, (bufferIr) => { this.decoder.updateFilters(bufferIr); } );
        loader_filters.load();
        
        // rotator is used to rotate the ambisonic scene (listener aim)
        this.rotator = new ambisonics.sceneRotator(audioContext, this.ambisonicOrder);

        // connect graph
        this.rotator.out.connect(this.decoder.in);
        this.decoder.out.connect(this.gainOut);
        this.gainOut.connect(audioContext.destination);

        // local attributes
        this.sourceMap = new Map();
        this.listenerAimOffset = {azim:0, elev:0};
        this.lastListenerAim = {azim:0, elev:0};
        this.buffers = bufferSources;

        // bind
        this.getNearestSource = this.getNearestSource.bind(this);

    }

    // start all sources
    start(){
        for( let i = 0; i < this.buffers.length; i ++ ){
          let initAzim = (360 / this.buffers.length) * i * 0; // equi on circle
          this.startSource(i, initAzim);
        }        
    }

    // stop all sources
    stop(){
        this.sourceMap.forEach((spatSrc, key) => {
            spatSrc.src.stop();
        });
    }

    // init and start spat source. id is audio buffer id in loader service
    startSource(id, initAzim = 0, initElev = 0, loop = true) {
        
        // check for valid audio buffer
        if( this.buffers[id] === undefined ){
            console.warn('spat source id', id, 'corresponds to empty loader.buffer, source creation aborted');
            return
        }

        // create audio source
        var src = audioContext.createBufferSource();
        src.buffer = this.buffers[id];
        src.loop = loop;

        // create source gain
        let gain = audioContext.createGain();
        gain.gain.value = 1.0;

        // create / init encoder (source-specific to be able to set source-specific position latter)
        let encoder = new ambisonics.monoEncoder(audioContext, this.ambisonicOrder);
        encoder.azim = initAzim;
        encoder.elev = initElev;
        encoder.updateGains();

        // create / init effect (source specific)
        let filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 22050;
        let effect = {filter:filter};
        
        // connect graph
        src.connect(gain);
        gain.connect(filter);
        filter.connect(encoder.in);
        encoder.out.connect(this.rotator.in);

        // play source
        src.start(0);

        // store new spat source
        this.sourceMap.set(id, {src:src, enc:encoder, gain:gain, effect:effect});
    }

    // set source id position
    setSourcePos(id, azim, elev) {

        // check if source has been initialized (added to local map)
        if( this.sourceMap.has(id) ){

            // get spat source
            let spatSrc = this.sourceMap.get(id);
            
            // set spat source encoder azim / elev values
            let needUpdate = false;
            if( Math.abs(azim - spatSrc.enc.azim) > 3 ){
                spatSrc.enc.azim = azim;    
                needUpdate = true;
            }
            if( Math.abs(elev - spatSrc.enc.elev) > 3 ){
                spatSrc.enc.elev = elev;
                needUpdate = true;
            }
            
            // update encoder gains (apply azim / elev mod)
            if( needUpdate )
                spatSrc.enc.updateGains();
        }
    }

    // set source id effect value (value in [0, 1])
    setSourceEffect(id, value) {

        // check if source has been initialized (added to local map)
        if( this.sourceMap.has(id) ){

            // get spat source
            let spatSrc = this.sourceMap.get(id);

            // mapping to effect value
            let cutoffFreq = 11000*(Math.exp( Math.pow(value, 3) ) - 1);
            // console.log(value, cutoffFreq);
            spatSrc.effect.filter.frequency.value = cutoffFreq;
        }
    }

    // set source id volume value (value in [0, 1])
    setSourceVolume(id, value) {

        // check if source has been initialized (added to local map)
        if( this.sourceMap.has(id) ){

            // get spat source
            let spatSrc = this.sourceMap.get(id);

            // mapping to gain value
            let gain = 4 * value;

            // apply
            // spatSrc.gain.cancelScheduledValues(audioContext.currentTime);
            // spatSrc.gain.setValueAtTime(spatSrc.gain.gain.value, audioContext.currentTime);
            // spatSrc.gain.linearRampToValueAtTime(gain, audioContext.currentTime + 0.1);
            spatSrc.gain.gain.value = gain;
        }
    }

    // set listener aim / orientation (i.e. rotate ambisonic field)
    setListenerAim(azim, elev = undefined){

        // update rotator yaw / pitch
        this.rotator.yaw = azim - this.listenerAimOffset.azim;
        this.lastListenerAim.azim = azim;
        if( elev !== undefined ){
            this.rotator.pitch = elev - this.listenerAimOffset.elev;
            this.lastListenerAim.elev = elev;
        }

        // update rotator coefficients (take into account new yaw / pitch)
        this.rotator.updateRotMtx();
    }

    // set listener aim offset (e.g. to "reset" orientation)
    resetListenerAim(azimOnly = true){

        // save new aim values
        this.listenerAimOffset.azim = this.lastListenerAim.azim;
        if( ! azimOnly ){
            this.listenerAimOffset.elev = this.lastListenerAim.azim;
        }

        // update listener aim (update encoder gains, useless when player constantly stream deviceorientation data)
        this.setListenerAim(this.lastListenerAim.azim, this.lastListenerAim.elev);
    }

    getNearestSource(azim){
        let srcId = -1;
        let dist = Infinity;
        this.sourceMap.forEach( (spatSrc, index) => {
            let newDist = Math.abs( spatSrc.enc.azim - azim );
            if( newDist < dist ){
                srcId = index;
                dist = newDist;
            }
        });
        return srcId;
    }

}
