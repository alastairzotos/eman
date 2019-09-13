import * as child_process from 'child_process';

type IVersionUpdateType = "major"|"minor"|"patch"|null;


export class VersionChecker {
    private _update: IVersionUpdateType = null;

    constructor() {
    }

    performVersionCheck = () => {
        this.checkForUpdates(update => {
            this._update = update;
        });
    }

    getUpdate = () => this._update;


    private checkForUpdates = (cb: (update: IVersionUpdateType)=>void) => {
        const versions = {
            local: null,
            remote: null
        };
        
        const setVersion = (location: 'local'|'remote', ver: number[]) => {
            versions[location] = ver;
    
            if (versions.local !== null && versions.remote !== null) {
                cb(this.getVersionUpdate(versions.local, versions.remote));
            }
        };
    
        this.runCommand('npm', 'list -g --depth=0'.split(' '), output => {
            const found = output.match(/eman-script@[0-9]+\.[0-9]+\.[0-9]+/);
            if (found) {
                const foundString = found[0];
    
                const ver = foundString.split('@')[1].split('.').map(part => parseInt(part));
                setVersion('local', ver);
            }
        });
    
        this.runCommand('npm', 'show eman-script version'.split(' '), output => {
            const ver = output.split('.').map(part => parseInt(part));
            setVersion('remote', ver);
        });
    }

    private runCommand = (cmd: string, args: string[], cb: (output: string)=>void) => {
        const command = child_process.spawn(cmd, args);
    
        let result = '';
        command.stdout.on('data', function(data) {
             result += data.toString();
        });
        command.on('close', function(code) {
            return cb(result);
        });
    }

    private getVersionUpdate = (curVer: number[], remoteVer: number[]): IVersionUpdateType => {

        const [curMajor, curMinor, curPatch] = curVer;
        const [remMajor, remMinor, remPatch] = remoteVer;
    
        if (curMajor == remMajor) {
            if (curMinor == remMinor) {
                if (curPatch == remPatch) {
                    return null;
                } else {
                    return "patch";
                }
            } else {
                return "minor";
            }
        } else {
            return "major";
        }
    }
}
