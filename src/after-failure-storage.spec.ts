import request from 'supertest';
import { expect } from 'chai';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


describe('Storage After Failure', () => {
  const req = request('https://localhost:10010');
  let cookie: string[];
  const key = '123';
  const value = '456';

  it('should get main page', async () => {
    const res = await req.get('/ui/v1/zlux/ZLUX/plugins/org.zowe.zlux.bootstrap/web/').send();
    expect(res.status).to.equal(200);
  });
  
  it('should authenticate', async () => {
    const res = await req.post('/ui/v1/zlux/auth').send({
      username: "1",
      password: ""
    });
    cookie = res.header['set-cookie'];
    expect(res.status).to.equal(200);
  });
  
  it('should get correct value from cluster storage', async () => {
    const res = await req
    .get(`/ui/v1/zlux/ZLUX/plugins/org.zowe.zlux.sample.angular/services/hello/_current/${key}`)
    .set('Cookie', cookie)
    .send();
    expect(res.status).to.equal(200);
    expect(res.body.value).to.equal(value);
  });
 

});
