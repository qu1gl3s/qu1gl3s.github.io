---
title: Matter-over-Thread on a Self-Hosted Home Assistant, Without HAOS
date: 2026-08-23
excerpt: Getting Matter-over-Thread working across VLANs with Docker-based Home Assistant and an SMLIGHT SMHUB Nano, without an mDNS reflector.
tags: home-assistant, matter, self-hosting
---

I run Home Assistant as a plain Docker container, not Home Assistant OS, no Supervisor, no Add-on Store. That's a deliberate choice: it fits into the same Docker Compose stack as everything else I self-host, and I don't want a second, semi-walled-off way of managing software on the same box. It's worked well for years. It also means every "just install the official Add-on" answer on the Home Assistant forums doesn't apply to me, and Matter-over-Thread turned out to be the feature that made that cost the most obvious.

This is the story of getting real Matter-over-Thread devices working end-to-end (commissioned and controlled from Home Assistant) on a Docker Core install, using a small standalone Thread border router (an SMLIGHT SMHUB Nano MG24) sitting on a different VLAN than Home Assistant itself, without standing up mDNS reflectors to bridge the two. It took a few wrong turns to get there, including one that turned out to be completely unnecessary. I'm writing it up because most of what I found while researching this was either HAOS-specific or assumed a much flatter network than mine.

## The starting problem: VLANs

Home Assistant's Matter integration needs two things: a Thread Border Router to bridge the Thread mesh onto your LAN, and a Matter Server (the actual Matter controller software) that Home Assistant talks to over a WebSocket.

On HAOS, both of those are typically Add-ons running on the same box as Home Assistant itself, often using a USB radio dongle like a Nabu Casa SkyConnect plugged directly into the server. That's fine if everything sits on one flat network. Mine doesn't: Home Assistant runs on my main server VLAN, and the actual smart home devices live on a separate, more locked-down IoT VLAN, reachable only by routing, not by broadcast or multicast.

That matters a lot here, because Matter and Thread both lean heavily on IPv6 multicast and mDNS for device discovery, and routers generally don't forward multicast across VLAN boundaries. The standard fix is an mDNS reflector, something that sits with a leg on each VLAN and relays that traffic back and forth. I didn't want to stand one up. It's another always-on service to maintain, another thing that can silently break, and another piece of infrastructure whose only job is working around a network design I put in place on purpose.

So the first real question wasn't "how do I set up Matter," it was "how do I get Matter working across a VLAN boundary without building a bridge for it."

## Solving the border router half

An OpenThread Border Router is just software: `otbr-agent` exposing a REST API, same protocol regardless of what hardware it's running on. That part turned out to already be solved for me: an **SMLIGHT SMHUB Nano MG24**, a genuinely tiny ($43), Ethernet/PoE-powered Linux box with an onboard EFR32MG24 radio, running its own OTBR, sitting on the IoT VLAN, reachable from the Home Assistant host over ordinary routed TCP. Home Assistant's `otbr` integration doesn't care that the border router isn't on the same VLAN; it just needs `tcp://<ip>:8081`, and that worked immediately, because it's a plain routed connection, not multicast.

The remaining problem was the Matter Server itself.

## The architectural insight that made this tractable

Everywhere I looked, the guidance for a Matter Server split across a VLAN boundary was some version of: *don't*, or *set up an mDNS reflector*. Multicast generally doesn't cross VLANs without real work: dedicated reflectors, careful router-advertisement and firewall rules, none of which I wanted to take on just for this.

The thing that actually mattered, though: **Home Assistant's connection to the Matter Server is just a plain WebSocket over ordinary unicast TCP.** No multicast, no mDNS, nothing IPv6-multicast-specific about that particular hop. It's the *Matter Server's* connection to the actual Thread devices, and to the border router, that needs the rich local multicast environment, and that connection only has to happen locally, not across the VLAN boundary at all.

Which means the fix isn't "get multicast across the VLAN boundary." It's: **don't make it cross the boundary in the first place.** Run the Matter Server on the same VLAN as the border router (ideally the same box) and let Home Assistant reach it from wherever it lives over a completely ordinary routed WebSocket connection, the same way it already reached the OTBR's REST API.

## Running the Matter Server directly on the border router

Home Assistant's Matter backend also happens to have gone through a complete rewrite recently: as of the 2026.7 release (July 2026), the old Python-based `python-matter-server` was replaced by a new TypeScript implementation, `matterjs-server`, built on the matter.js SDK. It's described as a drop-in replacement, and it's what any current Home Assistant version now expects to talk to. Most existing blog posts and Docker Hub images you'll find still reference the deprecated Python one.

Since I'd already decided the Matter Server needed to live next to the border router rather than next to Home Assistant, the next question was whether the Nano could actually run it. A few checks later, it turned out to be more capable than I expected: it's not a dumb radio stick, it's a real embedded Linux box, with its own OS, a web-based app store with things like Node-RED and Zigbee2MQTT, a built-in web terminal, ~512MB RAM, and (critically) **Node.js 22.22.0 already installed**, comfortably meeting `matterjs-server`'s `>=22.13.0` requirement.

The one genuine unknown was the CPU architecture: the Nano's main SoC is **RISC-V** (an SG2000), not ARM or x86. That matters because several of `matterjs-server`'s dependencies (serial port bindings, USB bindings, BLE bindings) are native compiled modules, and there was no C compiler on the device to build them from source if no prebuilt binary existed for riscv64.

```
smlight@smhub-nano:~$ uname -a
Linux smhub-nano 6.18.17-patch21 riscv64 GNU/Linux
smlight@smhub-nano:~$ node -p process.arch
riscv64
```

A `npm install matter-server --dry-run` resolved the full 199-package dependency tree cleanly. The real install (`npm install matter-server`) took about 8 minutes on the Nano's modest hardware, but completed with zero errors and zero vulnerabilities: the native modules all found riscv64 prebuilds. No Docker, no compiler, no drama.

`matter-server` (the npm package) doesn't ship a CLI binary, it's meant to be run from its compiled entry point directly:

```bash
node --enable-source-maps node_modules/matter-server/dist/esm/MatterServer.js \
  --storage-path ~/matter-test/data \
  --primary-interface eth0
```

Each piece there is doing something specific:

- `node ... dist/esm/MatterServer.js` runs the compiled entry point directly, since there's no published CLI binary to call instead
- `--enable-source-maps` points any stack traces back at the original TypeScript rather than the compiled JS, which matters if you ever need to actually debug a crash
- `--storage-path ~/matter-test/data` is where the server keeps its fabric data, certificates, and the Thread dataset. It defaults to `~/.matter_server` if you leave it out, but being explicit keeps everything self-contained under one directory I can find and back up later
- `--primary-interface eth0` tells it which network interface to bind its link-local and mDNS-adjacent operations to. The Nano only has the one wired interface, but leaving this unset means the server has to guess, and I'd rather it not

The first run came up cleanly, BLE disabled (not needed, more on that below), WebSocket API listening on `0.0.0.0:5580`. The one line in the startup log that made the whole architecture click:

```
INFO  ConfigStorage  Set config key threadDataset to <redacted>
```

Because it's running on the same box as the Thread radio, it read the Thread network's operational dataset straight off the local interface, no round-trip through the OTBR's REST API needed, no separate credential-provisioning step. From the Home Assistant host, across the VLAN boundary:

```
$ curl -I http://<nano-ip>:5580/
HTTP/1.1 200 OK
```

Plain routed reachability. Exactly as predicted.

**Making it stick**: no passwordless sudo on the Nano, so no systemd unit. The pragmatic fix was a user crontab `@reboot` entry:

```bash
(crontab -l 2>/dev/null; echo "@reboot cd ~/matter-test && node --enable-source-maps node_modules/matter-server/dist/esm/MatterServer.js --storage-path ~/matter-test/data --primary-interface eth0 >> ~/matter-test/server.log 2>&1 &") | crontab -
```

That's more than it looks like at first glance:

- `crontab -l 2>/dev/null` dumps whatever's already in the crontab, with the error suppressed if there's nothing there yet
- `echo "@reboot ..."` is the new line being added; `@reboot` means "run this once, right after cron starts following a boot", which is exactly the persistence behavior I wanted
- both of those get piped into `crontab -`, which reads a complete crontab from stdin and installs it, replacing whatever was there. Combining the old contents with the new line first is what keeps this additive instead of wiping anything out
- piping into `crontab -` also means `crontab -e` (which opens an interactive editor, `vi` by default) never comes into it at all. That mattered here because the Nano's web-based terminal wasn't passing the Escape key through, which makes `vi` nearly unusable
- inside the cron line itself, the trailing `&` backgrounds the `node` process so cron doesn't sit there waiting on it forever, and `>> ~/matter-test/server.log 2>&1` redirects both stdout and stderr to a log file, since a `@reboot` job has no terminal attached to print to if something goes wrong

(Worth knowing if you try this yourself: cold boot to the WebSocket actually answering takes about 2 minutes on this hardware, not a hang, just genuinely that slow to get through certificate/vendor-database initialization.)

## Wiring up Home Assistant

With the server reachable, adding the Matter integration in Home Assistant was the easy part: `ws://<nano-ip>:5580/ws`, pointed straight across the VLAN boundary. Confirmation that it actually worked didn't come from Home Assistant's own logs (which, at default verbosity, log almost nothing for a routine successful connection) but from the Matter Server's side:

```
INFO  WebSocketControllerHandler  [0] WebSocket connection established
INFO  ConfigStorage  Set config key fabricLabel to Home
```

Home Assistant renaming the fabric label to match its own instance name is the tell that the handshake genuinely completed. It even reconnected cleanly on its own after a Home Assistant restart a few minutes later.

## The detour that turned out to be unnecessary

Here's the part I'd do differently if I started over: I spent a while trying to get Thread credentials synced to an iPhone via Home Assistant's Companion app (Settings → Devices & Services → Thread → Configure → "Send credentials to phone"), on the theory that commissioning a new device would need the phone to independently know the Thread network.

My network here has three VLANs: a Client VLAN for phones and laptops, a Server VLAN where the Docker host and Home Assistant live, and the IoT VLAN where the Nano and the smart home devices sit. Day to day, my phone lives on the Client VLAN, which has no visibility into the IoT VLAN at all, on purpose. So the credential sync failed for an unsurprising reason once I thought about it: Home Assistant's Thread integration recognized the network by name, but reported "No border routers were found," because the phone had no way to discover the Nano on a VLAN it can't see into. iOS's native Thread credential-sharing needs to independently discover the border router on the *local* network, a different requirement from the WebSocket link that already worked fine over routing. (There's also a documented, currently-open Home Assistant bug where this specific flow silently fails on iPhone regardless, so it may not have worked even on a flat network.)

The real fix for that, if I'd needed it, was one I was happy to put in place: a firewall rule permitting the IoT VLAN to reach the Server VLAN, scoped specifically to the Home Assistant container rather than opened broadly. With that rule sitting there, adding a new device becomes: move the phone onto the IoT VLAN so it shares a broadcast domain with the Nano and can find it locally, do the commissioning, then move the phone back to the Client VLAN afterward for normal use. That's a fine trade-off for something done occasionally, and nowhere near the same thing as leaving the IoT VLAN generally reachable.

Except it turned out I didn't need any of it. Skipping the whole "sync credentials to phone" step entirely and going straight to **Settings → Devices & Services → Add Integration → Matter → scan the QR code** worked first try. The BLE handshake handles device pairing directly, and because the Matter Server already had the Thread dataset loaded (remember that log line from startup), it could hand the new device onto the mesh itself, with no dependency on the phone's own Thread credential store at all. The entire cross-VLAN mDNS discovery problem I'd been trying to solve was for a code path the actual commissioning flow doesn't use.

## Where it landed

This has grown a fair bit since the first four test devices. The current tally, all commissioned and fully controlled from Home Assistant:

- Eleven **GRILLPLATS** smart plugs, running lights, the dishwasher, the washing machine, and a few other odds and ends
- Three **KLIPPBOK** water leak sensors, two in the kitchen and one in the bathroom
- One **ALPSTUGA** (air quality sensor, clock) in the study
- One **TIMMERFLOTTE** (temperature and humidity sensor) in the bathroom

All of it working as expected, through a Matter Server that costs nothing extra to run and lives on the same VLAN as the radio, not on the same VLAN as the Home Assistant host.

A few things worth calling out for anyone in a similar spot:

- **The Matter Server ↔ Home Assistant link is just a WebSocket.** If your network topology is the blocker, look hard at whether you actually need multicast to cross it, or just that one connection: those are different problems with very different amounts of effort to solve, and only one of them needs an mDNS reflector.
- **Check whether `python-matter-server` guidance is stale before following it.** As of Home Assistant 2026.7, it's EOL, the current implementation is `matterjs-server`, and a lot of still-circulating guides haven't caught up.
- **A device that "isn't Docker-capable" might still run Node directly**, if it's a real embedded Linux box rather than a single-purpose microcontroller. Worth checking before assuming you need a whole extra machine.
- **Test the shortest path before building the complicated one.** The phone-credential-sync problem I spent the most time on didn't need solving at all.

It's been running solidly since.
