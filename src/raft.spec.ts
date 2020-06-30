import { expect } from 'chai';
import request from 'supertest';
import {
  createInstances,
  findLeader,
  runZluxAppServer,
  setRecoveryTime,
  setStartupTime,
  stopZluxAppServer,
  stopZluxAppServers,
  waitForRecovery,
  waitForStartup,
  ZluxInstance
} from './zlux-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SWITCH_OVER_COUNT = 20;

describe('Leader Election', function () {
  this.timeout(0);
  this.bail(true);
  const req = request('https://localhost:10010');
  let cookie: string[];
  const key = '123';
  const value = '456';
  let instances: ZluxInstance[];
  let leader: ZluxInstance;
  let previousLeader: ZluxInstance;

  before('should start all instances', async function () {
    setRecoveryTime(1 * 18);
    setStartupTime(1 * 18);
    instances = createInstances();
    await waitForStartup();
  });

  it('should find a leader', async () => {
    const leaderFound = findLeader(instances);
    expect(leaderFound, 'leader must be elected').to.be.instanceOf(Object);
    leader = leaderFound!;
  });

  it('should get main page', async function () {
    const res = await req.get('/ui/v1/zlux/ZLUX/plugins/org.zowe.zlux.bootstrap/web/').send();
    expect(res.status, JSON.stringify(res.body)).to.equal(200);
  });

  it('should authenticate', async () => {
    const res = await req.post('/ui/v1/zlux/auth').send({
      username: "1",
      password: ""
    });
    cookie = res.header['set-cookie'];
    expect(res.status, JSON.stringify(res.body)).to.equal(200);
  });

  it('should put a key/value into cluster storage', async () => {

    const res = await req
      .put(`/ui/v1/zlux/ZLUX/plugins/org.zowe.zlux.sample.angular/services/hello/_current/${key}`)
      .set('Cookie', cookie)
      .send({ value });
    expect(res.status, JSON.stringify(res.body)).to.equal(200);
  });

  it('should get correct value from cluster storage', async () => {
    const res = await req
      .get(`/ui/v1/zlux/ZLUX/plugins/org.zowe.zlux.sample.angular/services/hello/_current/${key}`)
      .set('Cookie', cookie)
      .send();
    expect(res.status).to.equal(200);
    expect(res.body.value, JSON.stringify(res.body)).to.equal(value);
  });

  for (let i = 0; i < SWITCH_OVER_COUNT; i++) {
    it('should stop leader', async function () {
      if (leader) {
        previousLeader = leader;
        stopZluxAppServer(leader);
      }
      await waitForRecovery();
    });

    it('should find a new leader', async () => {
      const leaderFound = findLeader(instances);
      expect(leaderFound, 'new leader must be elected').to.be.instanceOf(Object);
      expect(leaderFound?.leaderOfTerm).greaterThan(previousLeader?.leaderOfTerm!);
      leader = leaderFound!;
    });

    it('should get main page again', async function () {
      const res = await req.get('/ui/v1/zlux/ZLUX/plugins/org.zowe.zlux.bootstrap/web/')
        .set('Cookie', cookie)
        .send();
      expect(res.status, JSON.stringify(res.body)).to.equal(200);
    });

    it('should get correct value from cluster storage again', async () => {
      const res = await req
        .get(`/ui/v1/zlux/ZLUX/plugins/org.zowe.zlux.sample.angular/services/hello/_current/${key}`)
        .set('Cookie', cookie)
        .send();
      expect(res.status).to.equal(200);
      expect(res.body.value, JSON.stringify(res.body)).to.equal(value);
    });

    it('should re-start previous leader', async function () {
      const params = previousLeader.launchParams;
      const newInstance = runZluxAppServer(params);
      instances[instances.indexOf(previousLeader)] = newInstance;
    });
  }

  after('should stop all instances', () => {
    stopZluxAppServers(instances);
  });

});
