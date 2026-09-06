---
title: Manually Updating an Aqara FP300 over Matter-over-Thread
date: 2026-09-06
excerpt: Serving an archived Aqara FP300 firmware image from matterjs-server 1.4.0 on an SMLIGHT SMHUB Nano, and fixing the misleading NotAvailable response.
tags: home-assistant, matter, self-hosting
---

My Aqara Presence Multi-Sensor FP300 was working perfectly well as a Matter-over-Thread device in Home Assistant, but it had stopped at firmware **1.1.0.1**. Aqara had released **1.1.3.8**, with changes to radar detection, response speed, Thread reconnection and the absence-detection logic, but that version was not being offered through the normal Matter update path.

I also don't own an Aqara hub, and buying one solely to update one sensor felt like the wrong answer.

The setup here is slightly unusual, but turned out to be ideal for solving this. As described in [my original Matter-over-Thread write-up](/writing/matter-over-thread-home-assistant-without-haos/), both the OpenThread Border Router and `matterjs-server` run directly on an SMLIGHT SMHUB Nano MG24:

```text
Aqara FP300
    ↕ Matter over Thread
SMHUB Nano MG24
    ├─ OpenThread Border Router
    └─ matterjs-server + OTA provider
         ↕ WebSocket
Home Assistant
```

That means the Nano is not merely passing Thread traffic to a Matter Server somewhere else. It is the Thread border router, Matter controller and, for this update, the OTA provider. The firmware transfer stays local to the Thread network; Home Assistant is not hosting or forwarding the image.

The other useful coincidence was timing. [`matterjs-server` 1.4.0](https://github.com/matter-js/matterjs-server/blob/v1.4.0/CHANGELOG.md) added a local `.ota` uploader to its built-in dashboard. The final process was pleasantly short: download the correct firmware, upload it on the FP300's node page, enable one server option, and click **Start Update**. Finding that one option was the part that took some digging.

## Prerequisites

This exact procedure assumes:

- the FP300 is already commissioned in Matter/Thread mode and visible in `matterjs-server`
- `matterjs-server` and OTBR are both running on the SMHUB Nano MG24
- the Matter Server dashboard is reachable at `http://<nano-ip>:5580/`
- the server is started by the OpenRC service from my earlier post
- `matter-server` is version 1.4.0 or newer, so the dashboard has local OTA upload support
- the FP300 is currently on an older version than 1.1.3.8; mine reported software version `1101`, displayed as `1.1.0.1`

On the Nano, confirm the installed server version:

```bash
cd /home/smlight/matter-test
npm list matter-server
```

Mine returned:

```text
matter-test@1.0.0 /home/smlight/matter-test
`-- matter-server@1.4.0
```

Before changing anything, back up the server's persistent state and its OpenRC service definition:

```bash
sudo tar -czf /home/smlight/matter-server-pre-fp300-ota.tar.gz \
  /etc/init.d/matter-server \
  /home/smlight/matter-test/data
```

Copy that archive off the Nano. `/home/smlight/matter-test/data` contains the Matter controller's fabric and node state, so it is much more important than the npm install itself.

## Getting the FP300 firmware

I used the `1.1.3.8` Matter image from [absent42's Aqara Firmware Archive](https://github.com/absent42/Aqara-Firmware-Archive/tree/main/Presence%20Multi-Sensor%20FP300/aqara.matter.4447_8197/1.1.3.8). The relevant model identifier is:

```text
aqara.matter.4447_8197
```

Those decimal numbers are the vendor and product IDs the FP300 reports to Matter Server:

```text
vendorId:  4447  (0x115f)
productId: 8197  (0x2005)
```

The archive's `release.json` records the image as 1,183,324 bytes with this MD5 checksum:

```text
dc0bea9e3c94149b3fa5e37a43d9d9ae
```

After downloading the `.ota` file to my Mac, I checked it before uploading:

```bash
md5 -q 20260515152513_rel_enc_ota_app_smi_aqara.matter.4447_8197_1.1.3.8_202605150709_dc0bea.ota
```

On Linux, the equivalent is:

```bash
md5sum 20260515152513_rel_enc_ota_app_smi_aqara.matter.4447_8197_1.1.3.8_202605150709_dc0bea.ota
```

This is a community-maintained archive, not a firmware download handed to me directly by Aqara, so using it carries some risk. With the model, version, size and checksum all matching, it was a risk I was willing to take.

## Uploading the image

Open the Matter Server dashboard at:

```text
http://<nano-ip>:5580/
```

Open the FP300 node, use its local OTA upload control, and select the downloaded `.ota` file. Version 1.4.0 sends the file to the server and imports it into the server's internal OTA store. There is no need to put it on the Nano manually, run `chip-tool`, or configure `--ota-provider-dir` when using this dashboard uploader.

The log should show that the file was parsed and indexed against the correct Matter identifiers:

```text
Storing OTA image from .../data/ota-uploads/<id>.ota: vendorId=0x115f, productId=0x2005, version=1138 (1.1.3.8)
```

At this point the dashboard correctly showed the FP300 at 1.1.0.1 and the local 1.1.3.8 image as available. I clicked **Start Update**, the FP300 accepted the OTA-provider announcement, and then apparently nothing happened.

## The failure: `queryImage status: 2`

Watching the log made the failure much clearer:

```bash
sudo tail -f /var/log/matter-server.log
```

The important part of the first attempt was:

```text
announceOtaProvider status: Success (0)
otaSoftwareUpdateProvider.queryImage ...
vendorId: 4447 productId: 8197 softwareVersion: 1101 hardwareVersion: 1000
otaSoftwareUpdateProvider.queryImage ... status: 2
```

This ruled out several possible problems at once. The FP300 was awake, reachable over Thread, had accepted the Nano as its OTA provider, and was asking for an image using the expected vendor ID, product ID and current software version.

The `2` is not a generic failure or a percentage. In the Matter OTA Provider cluster, `QueryImageResponse.status` has these values:

```text
0  UpdateAvailable
1  Busy
2  NotAvailable
3  DownloadProtocolNotSupported
```

So Matter Server was answering, in effect: **I have no update I am allowed to offer this device.** The return to the idle state immediately afterwards was expected, because no image URI or target version had been supplied and no BDX transfer had begun.

The confusing bit was that the dashboard already knew about the uploaded file and displayed it as an available local update. Uploading and indexing an image is not the same as making local/test images eligible for the OTA provider. In `matterjs-server` 1.4.0, the `--enable-test-net-dcl` option sets the underlying update manager's `allowTestOtaImages` state. Without it, the dashboard upload could be stored and matched while the provider still filtered that local image out when the physical device sent `queryImage`.

That split explains the otherwise contradictory result: the web UI could say “1.1.3.8 is available,” but the protocol-level answer to the FP300 could still be `NotAvailable`.

## The fix: enable local/test OTA images

My OpenRC service lives at:

```text
/etc/init.d/matter-server
```

Edit it:

```bash
sudo nano /etc/init.d/matter-server
```

The existing `command_args` line was:

```sh
command_args="--enable-source-maps /home/smlight/matter-test/node_modules/matter-server/dist/esm/MatterServer.js --storage-path /home/smlight/matter-test/data --primary-interface eth0"
```

Add `--enable-test-net-dcl` to the end:

```sh
command_args="--enable-source-maps /home/smlight/matter-test/node_modules/matter-server/dist/esm/MatterServer.js --storage-path /home/smlight/matter-test/data --primary-interface eth0 --enable-test-net-dcl"
```

For context, the complete service now looks like this:

```sh
#!/sbin/openrc-run
# matter-server (matterjs-server) - Matter Controller for Home Assistant

description="Matter Server (matterjs-server)"

supervisor="supervise-daemon"
command="/opt/bin/node"
command_args="--enable-source-maps /home/smlight/matter-test/node_modules/matter-server/dist/esm/MatterServer.js --storage-path /home/smlight/matter-test/data --primary-interface eth0 --enable-test-net-dcl"
command_user="smlight:smlight"
pidfile="/var/run/matter-server.pid"
output_log="/var/log/matter-server.log"
error_log="/var/log/matter-server.log"

depend() {
        need localmount net
        after openthread
        provide matter-server
}
```

Restart the service and confirm that it came back:

```bash
sudo rc-service matter-server restart
sudo rc-service matter-server status
```

Then confirm that OpenRC really passed the new argument to the running process:

```bash
ps auxww | grep '[M]atterServer.js'
```

The command line in that output should include:

```text
--enable-test-net-dcl
```

I also checked the startup log:

```bash
grep -iE 'test|dcl|ota' /var/log/matter-server.log | tail -50
```

The relevant server-side confirmation is:

```text
Enabled test OTA images (test-net DCL)
```

The flag's name is broader than “allow my uploaded file” because it also enables OTA images from the CSA test DCL in addition to the production DCL. It does not turn off production update checks. It does mean that test-net and locally supplied firmware are now eligible, so I would not leave the dashboard exposed to an untrusted network.

## Retrying the update

The uploaded image survived the service restart because Matter Server had already moved it into its persistent OTA store. There was no need to upload it again. I returned to the FP300's node page and clicked **Start Update** once more.

This time the whole sequence changed:

```text
Existing OTA image validated successfully vid: 4447 pid: 8197 v: 1138 (1.1.3.8) mode: local
OTA update available for vendorId: 4447 productId: 8197 softwareVersion: 1101 file: ota/115f.2005.local.1138
Update available for node ... softwareVersion: 1138, softwareVersionString: "1.1.3.8", source: "local"
Starting update for node ... to version 1138
Announcing OTA provider to node ...
announceOtaProvider status: Success (0)
otaSoftwareUpdateProvider.queryImage ... vendorId: 4447 productId: 8197 softwareVersion: 1101 hardwareVersion: 1000
OTA Update to version 1138 ... is now Querying
otaSoftwareUpdateProvider.queryImage ... status: 0 imageUri: bdx://.../ota/115f.2005.local.1138 softwareVersion: 1138 softwareVersionString: 1.1.3.8
OTA Update to version 1138 ... is now Downloading (formerly Querying)
Starting BDX session ... isSender: true ... blobName: ota/115f.2005.local.1138
```

There are three especially useful success markers here:

- `queryImage ... status: 0` means the provider is offering the image
- `softwareVersion: 1138` and the `bdx://` URI mean it offered the intended local file
- `Starting BDX session` means the actual firmware transfer has begun

After the download, the requestor should move from `Downloading` to `Applying`, reboot, and eventually return to `Idle`. Depending on timing and the device's sleep behaviour, every transition may not appear neatly in a short log tail. The final check is the Basic Information software version in the dashboard or Home Assistant: it should change from `1101` / `1.1.0.1` to `1138` / `1.1.3.8`.

## Where it landed

The working path ended up being entirely contained on the Nano:

```text
Download and verify the FP300 1.1.3.8 Matter OTA image
        ↓
Upload it on the matterjs-server 1.4.0 dashboard
        ↓
Enable --enable-test-net-dcl in the OpenRC service
        ↓
Restart matter-server and confirm the running argument
        ↓
Click Start Update again
        ↓
queryImage status: 0 → BDX download → apply → reboot
```

No Aqara hub, separate OTA provider, `chip-tool`, Docker container or Home Assistant add-on was needed. The useful architectural decision had already been made: because OTBR and `matterjs-server` live together on the SMHUB Nano, the same tiny box that gives the FP300 its Thread path can serve the firmware directly over Matter as well.
