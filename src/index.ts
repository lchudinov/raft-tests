import { runZluxAppServer, ZluxLaunchParams, ZluxInstance, findLeader, sleep } from "./zlux-utils";
import path from "path";

async function run() {
  console.log('it works');
  const instancesDir = 'c:\\users\\lchudinov\\work\\zlux\\zlux-instances';
  const instances: ZluxInstance[] = [];
  for (let i = 0; i < 3; i++) {
    const num = i + 1;
    const params: ZluxLaunchParams = {
      index: num,
      instanceDir: path.join(instancesDir, `instance${num}`),
    };
    console.log(params.instanceDir);
    const instance = runZluxAppServer(params);
    instances.push(instance);
  }

  const n = 10000;
  console.log(`sleep ${n / 1000} seconds`);
  await sleep(n);
  const leader = findLeader(instances);
  console.log(`there is ${leader ? 'leader' : 'no leader'}`);
  
  await sleep(n*10);
  for (const instance of instances) {
    try {
      console.log(`about to kill process pid = ${instance.process.pid}`);
      instance.process.kill();
    } catch (e) {
      console.log(`error ${e.message}`);
    }
  }
}
run();
