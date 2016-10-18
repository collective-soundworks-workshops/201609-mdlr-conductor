import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.params = this.require('shared-params');
    this.sync = this.require('sync');

    this.phaseId = 0;
    this.playerMap = new Map();
  }

  // if anything needs to append when the experience starts
  start() {

    // param listener
    this.params.addParamListener('phaseId', (value) => {  this.phaseId = value; });
    this.params.addParamListener('switchPhase', (value) => {  
      let newPhaseId = 1 + (this.phaseId) % 2;
      console.log(newPhaseId);
      this.params.update('phaseId', newPhaseId );
    });

  }

  // if anything needs to happen when a client enters the performance (*i.e.*
  // starts the experience on the client side), write it in the `enter` method
  enter(client) {
    super.enter(client);


    switch (client.type) {
      case 'player':
        this.playerMap.set( client.index, client );
        this.params.update('numPlayers', this.playerMap.size);
        break
    }
    
    // send a message to all the other clients of the same type
    // this.broadcast(client.type, client, 'play');
  }

  exit(client) {
    super.exit(client);

    switch (client.type) {
      case 'player':
        this.playerMap.delete( client.index );
        this.params.update('numPlayers', this.playerMap.size);
        break
    }
    
  }
}
