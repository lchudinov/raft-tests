import { runZluxAppServer, ZluxLaunchParams } from "./zlux-utils";

console.log('it works');
const params: ZluxLaunchParams = {
  instanceDir: `D:\rocket\zlux-instances\instance-1`,
};
runZluxAppServer(params);