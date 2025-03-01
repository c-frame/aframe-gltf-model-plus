# Components

## billboard

Rotate plane towards the camera:

```html
<a-plane
  width="1.5"
  height="0.5"
  material="color: black"
  text="value: hello world; width: 4; align: center"
  position="-2.5 -3.5 -1"
  billboard
></a-plane>
```

By default it rotates only on the vertical axis (`onlyY: true`).
To rotate on all axes: `billboard="onlyY: false"`

## move-to-spawn-point

Move camera rig to the first spawn point after the scene glb is loaded.

```html
<a-entity id="rig" move-to-spawn-point></a-entity>
```

## move-to-unoccupied-waypoint

After 3s delay on naf connected event:

```html
<a-entity id="rig" move-to-unoccupied-waypoint="on: connected; delay: 3"></a-entity>
```

A delay is needed so we have the waypoints isOccupied information from the other participants.
With `on: connected`, if the url includes a hash to spawn on a specific waypoint, then the component doesn't do anything.

or on a plane on click (default):

```html
<a-plane
  class="clickable"
  width="1.5"
  height="0.5"
  material="color: black"
  text="value: sit on a\nnearby seat; width: 4; align: center"
  position="-2.5 -3.5 -1"
  billboard
  move-to-unoccupied-waypoint
></a-plane>
```

Filter waypoints with a regular expression:

```html
<a-plane move-to-unoccupied-waypoint="filterRegExp:seat[0-9]+row[23]"></a-plane>
```

## a-waypoint primitive

Seated waypoint:

```html
<a-cylinder radius="0.25" height="0.5" position="-3.5 -4.74 -3" rotation="0 -150 0">
  <a-waypoint
    id="seat1"
    position="0 0.27 0"
    can-be-clicked="true"
    can-be-occupied="true"
    will-disable-motion="true"
  ></a-waypoint>
</a-cylinder>
```

Spawn point:

```html
<a-waypoint id="spawnpoint" can-be-spawn-point="true" position="-25 0 0" rotation="0 90 0"></a-waypoint>
```

## open-link

Example of a clickable button to move to a specific waypoint:

```html
<a-waypoint id="entrance" position="4.5 0 46" rotation="0 180 0"></a-waypoint>
<a-plane
  class="clickable"
  width="2"
  height="0.6"
  material="color:black"
  text="value: exit the meeting room; width: 4; align: center"
  position="-5 2 150"
  billboard
  open-link="href:#entrance"
></a-plane>
```

Example of opening a link:

```html
<a-plane
  class="clickable"
  width="2"
  height="0.6"
  material="color:black"
  text="value: go to aframe website; width: 4; align: center"
  position="-5 2 150"
  billboard
  open-link="href:https://aframe.io"
></a-plane>
```

## media-image

Load an image, this creates a plane geometry and adjust its width to keep the
image aspect ratio.

```html
<a-entity
  position="0 1.6 -3"
  scale="2 2 2"
  rotation="0 20 0"
  media-image="src: ./rainbow.jpg"
></a-entity>
```

For a 360 image:

```html
<a-entity
  position="0 1.6 0"
  media-image="projection: 360-equirectangular; src: ./360.jpg"
></a-entity>
```

If you're using a ktx2 image, be sure to set `basisTranscoderPath`:

```html
<a-scene
  gltf-model="basisTranscoderPath:https://cdn.jsdelivr.net/npm/three@0.173.0/examples/jsm/libs/basis/">
```

## media-video

Load a video, autoplay muted without controls by default:

```html
<a-entity
  position="0 1.6 -3"
  scale="2 2 2"
  rotation="0 20 0"
  media-video="src: ./video.mp4"
></a-entity>
```

If you want a video with sound, you need to set autoplay to false and controls to
true. Currently controls true only add the clickable class to the entity so that you can
play or pause the video, the sound is not spatial.

```html
<a-entity
  position="0 1.6 -3"
  scale="2 2 2"
  rotation="0 20 0"
  media-video="src: ./video.mp4; autoPlay: false; controls: true"
></a-entity>
```

For a 360 video:

```html
<a-entity
  position="0 1.6 0"
  media-video="projection: 360-equirectangular; src: ./video.mp4"
></a-entity>
```
