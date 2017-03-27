import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.params = this.require('shared-params');
    this.sync = this.require('sync');
  }

  // if anything needs to append when the experience starts
  start() {}

  // if anything needs to happen when a client enters the performance
  enter(client) {
    super.enter(client);
  }

  // if anything needs to happen when a client exits the performance
  exit(client) {
    super.exit(client);
  }
}
