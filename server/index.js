// Import Soundworks library modules (server side)
'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

var _soundworksServer = require('soundworks/server');

var _soundworksServer2 = _interopRequireDefault(_soundworksServer);

// Import server side performance module

var _PlayerPerformance = require('./PlayerPerformance');

var _PlayerPerformance2 = _interopRequireDefault(_PlayerPerformance);

var server = _soundworksServer2['default'].server;
var ServerCheckin = _soundworksServer2['default'].ServerCheckin;

// Launch server
server.start();

// Instantiate the modules
var checkin = new ServerCheckin({ capacity: 100 });
var performance = new _PlayerPerformance2['default']();

// Map modules to client types:
// - the `'player'` clients (who take part in the scenario by connecting to the
//   server through the root URL) need to communicate with the `checkin` and the
//   `performance` on the server side;
// - we could also map other modules to additional client types (who would take
//   part in the scenario by connecting to the server through the '/clientType'
//   URL).
server.map('player', checkin, performance);
// server.map('soloist', soloistPerformance);
// server.map('conductor', control, conductorPerformance);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9zZXJ2ZXIvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Z0NBQ3VCLG1CQUFtQjs7Ozs7O2lDQUVaLHFCQUFxQjs7OztBQUVuRCxJQUFNLE1BQU0sR0FBRyw4QkFBVyxNQUFNLENBQUM7QUFDakMsSUFBTSxhQUFhLEdBQUcsOEJBQVcsYUFBYSxDQUFDOzs7QUFHL0MsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDOzs7QUFHZixJQUFNLE9BQU8sR0FBRyxJQUFJLGFBQWEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ3JELElBQU0sV0FBVyxHQUFHLG9DQUF1QixDQUFDOzs7Ozs7Ozs7QUFTNUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDIiwiZmlsZSI6InNyYy9zZXJ2ZXIvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBJbXBvcnQgU291bmR3b3JrcyBsaWJyYXJ5IG1vZHVsZXMgKHNlcnZlciBzaWRlKVxuaW1wb3J0IHNvdW5kd29ya3MgZnJvbSAnc291bmR3b3Jrcy9zZXJ2ZXInO1xuLy8gSW1wb3J0IHNlcnZlciBzaWRlIHBlcmZvcm1hbmNlIG1vZHVsZVxuaW1wb3J0IFBsYXllclBlcmZvcm1hbmNlIGZyb20gJy4vUGxheWVyUGVyZm9ybWFuY2UnO1xuXG5jb25zdCBzZXJ2ZXIgPSBzb3VuZHdvcmtzLnNlcnZlcjtcbmNvbnN0IFNlcnZlckNoZWNraW4gPSBzb3VuZHdvcmtzLlNlcnZlckNoZWNraW47XG5cbi8vIExhdW5jaCBzZXJ2ZXJcbnNlcnZlci5zdGFydCgpO1xuXG4vLyBJbnN0YW50aWF0ZSB0aGUgbW9kdWxlc1xuY29uc3QgY2hlY2tpbiA9IG5ldyBTZXJ2ZXJDaGVja2luKHsgY2FwYWNpdHk6IDEwMCB9KTtcbmNvbnN0IHBlcmZvcm1hbmNlID0gbmV3IFBsYXllclBlcmZvcm1hbmNlKCk7XG5cbi8vIE1hcCBtb2R1bGVzIHRvIGNsaWVudCB0eXBlczpcbi8vIC0gdGhlIGAncGxheWVyJ2AgY2xpZW50cyAod2hvIHRha2UgcGFydCBpbiB0aGUgc2NlbmFyaW8gYnkgY29ubmVjdGluZyB0byB0aGVcbi8vICAgc2VydmVyIHRocm91Z2ggdGhlIHJvb3QgVVJMKSBuZWVkIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIGBjaGVja2luYCBhbmQgdGhlXG4vLyAgIGBwZXJmb3JtYW5jZWAgb24gdGhlIHNlcnZlciBzaWRlO1xuLy8gLSB3ZSBjb3VsZCBhbHNvIG1hcCBvdGhlciBtb2R1bGVzIHRvIGFkZGl0aW9uYWwgY2xpZW50IHR5cGVzICh3aG8gd291bGQgdGFrZVxuLy8gICBwYXJ0IGluIHRoZSBzY2VuYXJpbyBieSBjb25uZWN0aW5nIHRvIHRoZSBzZXJ2ZXIgdGhyb3VnaCB0aGUgJy9jbGllbnRUeXBlJ1xuLy8gICBVUkwpLlxuc2VydmVyLm1hcCgncGxheWVyJywgY2hlY2tpbiwgcGVyZm9ybWFuY2UpO1xuLy8gc2VydmVyLm1hcCgnc29sb2lzdCcsIHNvbG9pc3RQZXJmb3JtYW5jZSk7XG4vLyBzZXJ2ZXIubWFwKCdjb25kdWN0b3InLCBjb250cm9sLCBjb25kdWN0b3JQZXJmb3JtYW5jZSk7XG4iXX0=