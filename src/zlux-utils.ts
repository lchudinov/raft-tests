import * as child_process from 'child_process';
import path from 'path';

export interface ZluxLaunchParams {
  instanceDir: string;
}

export interface ZluxInstance {
  process: child_process.ChildProcess,
  launchParams: ZluxLaunchParams,
}

export async function runZluxAppServer(params: ZluxLaunchParams): Promise<ZluxInstance> {
  const desktopDir: string = process.env.MVD_DESKTOP_DIR!;
  const workDir = path.join(desktopDir, '..', '..', 'zlux-app-server', 'bin');
  const appServerBat = path.join(workDir, 'app-server.bat');
  const env = {
    ZLUX_RAFT_CLUSTER_ENABLED: 'YES',
    INSTANCE_DIR: params.instanceDir,
  };
  const options: child_process.SpawnOptions = {
    cwd: workDir,
    env,
    detached: true,
    shell: true,
  };

  const child = child_process.spawn('cmd.exe', ['/c', appServerBat], options);
  console.log(`app server bat ${appServerBat}`);
  return {
    process: child,
    launchParams: params,
  };
}