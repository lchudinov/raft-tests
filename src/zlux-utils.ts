import * as child_process from 'child_process';
import path from 'path';
import * as fs from 'fs';

export interface ZluxLaunchParams {
  index: number;
  instanceDir: string;
}

export interface ZluxInstance {
  process: child_process.ChildProcess,
  launchParams: ZluxLaunchParams,
  leaderOfTerm?: number;
}

export function runZluxAppServer(params: ZluxLaunchParams): ZluxInstance {
  const desktopDir: string = process.env.MVD_DESKTOP_DIR!;
  const workDir = path.join(desktopDir, '..', '..', 'zlux-app-server', 'lib');
  const configFile = path.join(params.instanceDir, 'workspace', 'app-server', 'serverConfig', 'server.json');
  const logDir = path.join(params.instanceDir, 'logs');
  const logFile = path.join(logDir, 'appServer.log');
  const nodePath = [
    path.join(workDir, '..', '..'),
    path.join(workDir, '..', '..', 'zlux-server-framework', 'node_modules'),
    process.env.NODE_PATH,
  ].join(';');
  const env = {
    ZOWE_INSTANCE: 'my-instance',
    ZOWE_SESSION_SECRET: 'my-secret',
    ZLUX_RAFT_CLUSTER_ENABLED: 'TRUE',
    INSTANCE_DIR: params.instanceDir,
    ZLUX_MIN_WORKERS: '2',
    ZLUX_MAX_WORKERS: '2',
    ZLUX_NODE_LOG_DIR: logDir,
    CONFIG_FILE: configFile,
    ZLUX_NODE_LOG_FILE: logFile,
    NODE_PATH: nodePath,
  };
  console.log(`start using env:\n${JSON.stringify(env, null, 2)}`);
  const options: child_process.SpawnOptions = {
    cwd: workDir,
    env,
    detached: true,
  };
  let log = fs.createWriteStream(logFile);
  console.log(`options are ${JSON.stringify(options, null, 2)}`);
  const args = ['--harmony', 'zluxCluster.js', `--config="${configFile}"`];
  console.log(`args ${args.join(' ')}`);
  const child = child_process.spawn('node.exe', ['--harmony', 'zluxCluster.js', `--config=${configFile}`], options);
  const instance: ZluxInstance = {
    process: child,
    launchParams: params,
  };
  child.stdout!.on('data', (data) => {
    const line: string = data.toString();
    if (line.indexOf(`became leader of term`) !== -1) {
      const index = line.indexOf('term');
      const rest = line.substr(index + 5);
      const term = parseInt(rest, 10);
      console.log(`${instance.launchParams.index} is leader of term ${term}`);
      instance.leaderOfTerm = term;
    }
    log.write(data);
  });
  child.stderr!.on('data', (data) => {
    log.write(data);
  });
  child.on('exit', () => log.close());
  return instance;
}

export function findLeaders(instances: ZluxInstance[]): ZluxInstance[] {
  let leaders: ZluxInstance[] = [];
  let lastTerm: number = -1;
  for (const instance of instances) {
    if (instance.leaderOfTerm) {
      if (instance.leaderOfTerm > lastTerm) {
        lastTerm = instance.leaderOfTerm;
        leaders = [instance];
      } else if (instance.leaderOfTerm === lastTerm) {
        leaders.push(instance);
      }
    }
  }
  return leaders;
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createInstances(): ZluxInstance[] {
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
  return instances;
}