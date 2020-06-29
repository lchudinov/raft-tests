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
  killed?: boolean;
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
    ZLUX_MIN_WORKERS: '1',
    ZLUX_MAX_WORKERS: '1',
    ZLUX_NODE_LOG_DIR: logDir,
    CONFIG_FILE: configFile,
    ZLUX_NODE_LOG_FILE: logFile,
    NODE_PATH: nodePath,
  };
  //console.log(`start using env:\n${JSON.stringify(env, null, 2)}`);
  const options: child_process.SpawnOptions = {
    cwd: workDir,
    env,
    detached: true,
  };
  let log = fs.createWriteStream(logFile);
  //console.log(`options are ${JSON.stringify(options, null, 2)}`);
  const args = ['--harmony', 'zluxCluster.js', `--config=${configFile}`];
  //console.log(`args ${args.join(' ')}`);
  const child = child_process.spawn('node.exe', args, options);
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

export function stopZluxAppServer(instance: ZluxInstance): void {
  instance.process.kill();
  instance.killed = true;
}

export function findLeader(instances: ZluxInstance[]): ZluxInstance | undefined {
  let leader: ZluxInstance | undefined;
  let lastTerm: number = -1;
  for (const instance of instances) {
    if (instance.leaderOfTerm) {
      if (instance.leaderOfTerm > lastTerm) {
        lastTerm = instance.leaderOfTerm;
        leader = instance;
      } else if (instance.leaderOfTerm === lastTerm) {
        throw new Error(`more than one leader of term ${lastTerm}`);
      }
    }
  }
  return leader;
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createInstances(): ZluxInstance[] {
  const instancesDir = 'c:\\users\\lchudinov\\work\\zlux\\zlux-instances';
  const instances: ZluxInstance[] = [];
  for (let i = 0; i < 3; i++) {
    const num = i + 1;
    const params: ZluxLaunchParams = {
      index: num,
      instanceDir: path.join(instancesDir, `instance${num}`),
    };
    const instance = runZluxAppServer(params);
    instances.push(instance);
  }
  return instances;
}

export function stopZluxAppServers(instances: ZluxInstance[]): void {
  instances.forEach(instance => {
    if (!instance.killed) {
      stopZluxAppServer(instance);
    }
  });
}

const RECOVERY_TIME_IN_MINUTES = 2;
const RECOVERY_TIME_IN_MS = 60 * 1000 * RECOVERY_TIME_IN_MINUTES;

const STARTUP_TIME_IN_MINUTES = 2;
const STARTUP_TIME_IN_MS = 60 * 1000 * RECOVERY_TIME_IN_MINUTES;

export async function waitForRecovery(): Promise<void> {
  console.log(`waiting for ${RECOVERY_TIME_IN_MINUTES} minutes`);
  await sleep(RECOVERY_TIME_IN_MS);
}

export async function waitForStartup(): Promise<void> {
  console.log(`waiting for ${STARTUP_TIME_IN_MINUTES} minutes`);
  await sleep(STARTUP_TIME_IN_MS);
}