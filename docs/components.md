# Components

## move-to-spawn-point

Move camera rig to the first spawn point after the scene glb is loaded.

```html
<a-entity
  id="rig"
  move-to-spawn-point
></a-entity>
```

## move-to-unoccupied-waypoint

After 3s delay on naf connected event:

```html
<a-entity
  id="rig"
  move-to-unoccupied-waypoint="on: connected; delay: 3"
></a-entity>
```

A delay is needed so we have the waypoints isOccupied information from the other participants.

or on a plane on click (default):

```html
<a-plane
  class="clickable"
  width="1.5"
  height="0.5"
  material="color:black"
  text="value: sit on a\nnearby seat; width: 4; align: center"
  position="-2.5 -3.5 -1"
  rotation="0 180 0"
  move-to-unoccupied-waypoint
></a-plane>
```

