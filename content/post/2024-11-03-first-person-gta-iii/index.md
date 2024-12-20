---
layout: post
categories: games
date:   2024-03-11 12:00:00 +0200
tags: [games, gta3]
title: "Adding a first-person mode to GTA III"
image: re3.png

---
# Adding a first-person mode to GTA III

A couple of years ago the re3 (reverse-engineered GTA 3) project received [some publicity](https://www.eurogamer.net/articles/2021-02-17-how-a-small-group-of-gta-fanatics-reverse-engineered-gta-3-and-vice-city-without-so-far-getting-shut-down-by-take-two) as got published on GitHub (and since taken down by Take Two).

I played a lot of GTA 3 and having the source code with build instructions available, I decided to hack in a first person mode, similar to what we received in GTA V PC version.

### Build setup

I started by cloning the repository, setting up a Visual Studio solution and attempting to build.

Following the build instructions for Windows was straightforward, it was easiest to go with the DX9 verison (`win-x86-librw_d3d9-mss` configuration) as the other configurations had dependencies either on OpenGL or OpenAL, neither of which I wanted to set up. 

Then I copied the files from my Steam version of GTA 3 over to the build folder and launched the binary, which worked :).

Build instructions for Windows - built dx9 version

There seems to be a mode in Camera.h: MODE_1STPERSON

Tried a couple of cameras, here's a list of problems with each candidate:

MODE_1STPERSON:
	- Mouse look doesn't work
	- Can only run forward
M16:
	- Arrow keys move the cursor
	- Forward / back also moves the player a bit
MODE_M16_1STPERSON
	- Mouse look works OK, actually turns the player around
	- Can run forward and strafe, can't go backwards
MODE_FIGHT_CAM_RUNABOUT:
	- Mouse look is very weird - probably because the target stays fixed

Walk backwards doesn't exist there

Functions of interest:
CWeapon::DoDoomAiming

CCam::Process_FollowPed_Rotation

Why can't I go sideways or backwards when in first person?
Controls disabled? - file Camera::CamControl

```cpp
if(!FindPlayerPed()->IsPedInControl() || FindPlayerPed()->m_fMoveSpeed > 0.0f)
	m_bFirstPersonBeingUsed = false;
if(m_bFirstPersonBeingUsed){
	ReqMode = CCam::MODE_1STPERSON;
	CPad::GetPad(0)->SetDisablePlayerControls(PLAYERCONTROL_CAMERA);
}
//disable controls BY camera

## Camera switching in pedestrian mode:
PedZoomIndicator (either CAM_ZOOM_1 or CAM_ZOOM_TOPDOWN)

//first person zoom mode set there too
```

## Setting player rotation and heading to the camera:

```cpp
float Heading = Front.Heading();
((CPed*)TheCamera.pTargetEntity)->m_fRotationCur = Heading;
((CPed*)TheCamera.pTargetEntity)->m_fRotationDest = Heading;
TheCamera.pTargetEntity->SetHeading(Heading);
TheCamera.pTargetEntity->GetMatrix().UpdateRW();
```

This helped the camera control by keys: (in Process_M16_1stPerson

    LookLeftRight  = 0;
    LookUpDown = 0;

## now we have to figure out how to make the character run backwards and strafe

Let's find out where the controls actually move the player. We can start using the CPad::GetPad(0)->SetDisablePlayerControls(PLAYERCONTROL_CAMERA); as a reference.

It gets read by `CPad::ArePlayerControlsDisabled`

We can read the pad direction by:

	float leftRight = padUsed->GetPedWalkLeftRight();
	float upDown = padUsed->GetPedWalkUpDown();

see CPlayerPed::PlayerControlZelda for reference

Looking for more PlayerControl* methods we find 

PlayerControlM16 and PlayerControl1stPersonRunAround

PlayerControlM16 handles weapon firing at the target (which is good), but it doesn't handle the movement well. However, we could try swapping the movement with another one.

Player is controlled by CPlayerPed::ProcessControl. It contains a big switch based on the player's state, we need to figure out somehow what the current state is when we use the first person mode. 

Adding debug output is done by `CDebug::PrintAt(char * buffer, int x, int y)` - shows us the mode is 1 - PLAYER_IDLE, so we need to look into `PlayerControlZelda`.

The code there checks the gamepad state and tries to calculate the required rotation of the player in case we try to move in a different direction compared to the current one. 

Unfortunately it all boils down to a `m_fMoveSpeed` variable, which points forward. (It also explains why we only moved forward, as the move speed is set to a  magnitute of the pad movement)

```c
padMoveInGameUnit = CVector2D(leftRight, upDown).Magnitude() / PAD_MOVE_TO_GAME_WORLD_MOVE;
...
m_fMoveSpeed = Min(padMoveInGameUnit, m_fMoveSpeed + maxAcc);
```

Checking for m_fMoveSpeed references shows 40 results across many files, however, many of those are assignments and we need to dig out where it's read. 

Visual Studio 2019 includes a nifty Read/Write filter in the `Find all references` result list so we can filter down to reads only.

We can also look at `m_vecMoveSpeed` as it also could 

Printing out the x,y,z values shows the coordinates are (from the game starting position) X - left, right; Y: up/down; Z: forward/backward

Let's try hacking the move speed and inverting Z to make the character walk backwards.

Also m_fMoveSpeed *must be* translated into m_vecMoveSpeed *somewhere*.

I started experimenting right near the end of the CPlayerPed::ProcessControl(), and got a rudimentary walking (correct for a single camera orientation :) ) done by:

```c
	// v0.1 - most crude
	m_vecMoveSpeed.x = upDownInGameUnit * 0.1f; //-m_vecMoveSpeed.x;
	m_vecMoveSpeed.y = leftRightInGameUnit * 0.1f;
```

The player character also didn't clip through the buildings or the car, so this looked like a step in the right direction. A normal control mode was also supposed to handle acceleration, we can lift that directly from the `CPlayerPed::PlayerControlZelda` method.

The second crude version took into account the camera orientatation and the stick orientation as subtracting the two angles, building back a vector from the resulting angle and multiplying by a magnitude of the movement (useful for the gamepads):


```c
	float leftRight = padUsed->GetPedWalkLeftRight();
	float upDown = padUsed->GetPedWalkUpDown();
	float padHeading = (CGeneral::GetRadianAngleBetweenPoints(0.0f, 0.0f, -leftRight, upDown);
	float destinationAngle = CGeneral::LimitRadianAngle(padHeading - TheCamera.Orientation + (PI/2));
	//vector back from angle
	float neededY = Sin(destinationAngle);
	float neededX = Cos(destinationAngle);

    float padMoveInGameUnit = CVector2D(leftRight, upDown).Magnitude() / PAD_MOVE_TO_GAME_WORLD_MOVE;
	m_vecMoveSpeed.x = neededX * 0.1f * padMoveInGameUnit;
	m_vecMoveSpeed.y = neededY * 0.1f * padMoveInGameUnit;
```

What's still missing is some acceleration - right now we directly manipulate the m_vecMoveSpeed and probably should be tapping into less direct game variables.

There's a CPed::UpdatePosition() what deals with some velocityChange vector, which is probably what seems like a good target, as it handles velocity change according to the time step.

### Why don't jump and enter car work in 1st person mode?

Printing out button state in the 1st person camera mode showed that some controls don't get triggered at all (jump, enter car, etc).

Turns out that using directly the camera mode CCam::MODE_M16_1STPERSON is not the best idea as it participates in various control checks.

The treacherous one was in `CControllerConfigManager::AffectControllerStateOn_ButtonDown` that sets the `firstPerson` flag:

```c
int16 mode = TheCamera.Cams[TheCamera.ActiveCam].Mode;
		if (   mode == CCam::MODE_1STPERSON
			|| mode == CCam::MODE_SNIPER
			|| mode == CCam::MODE_ROCKETLAUNCHER
			|| mode == CCam::MODE_M16_1STPERSON)
		{
			firstPerson = true;
		}
```

This flag ends up affecting which control handler gets called, which, in this case was 
`AffectControllerStateOn_ButtonDown_FirstPersonOnly`, that only accepts zoom in and zoom out and no other actions. 

Let's patch it to 3rd person controls by calling `AffectControllerStateOn_ButtonDown_ThirdPersonOnly(button, type, *state);` instead. I also had to call `AffectControllerStateOn_ButtonDown_VehicleAndThirdPersonOnly` that handles car enter/exit buttons.

It just seems better to trick the game into thinking we're in a 3rd person mode to avoid a log of traps and checks.

### Seeing weapons and player feet

I abandoned using `CCam::MODE_M16_1STPERSON` and switched to a new mode `CCam::MODE_1STPERSON_NEW`. This made the game draw everything as usual, including the player character and the weapon! However, the camera position looks a bit unnatural and it changed as I rotated the camera.

It turned out the original 1st person code referenced an _initial_ player rotation rather than the _current_ one. I guess this made sense in sniper / rocket launcher view somehow, but it was easily fixed as we can retrieve current player rotation with `((CPed *)CamTargetEntity)->m_fRotationCur + HALFPI`.


It also works in the car - too bad we have low-res dashboard

The camera was originally set _inside_ player's head - I changed this to the approximate eyes position by _adding_ rather than _subtracting_ the forward vector from the head position.

```c
    ((CPed *)CamTargetEntity)->m_pedIK.GetComponentPosition(HeadPos, PED_HEAD);
    Source = HeadPos;
    Source.x += 0.19f * Cos(currentPlayerOrientation);
	Source.y += 0.19f * Sin(currentPlayerOrientation);
```

### What's next?

Rockstar issued a DMCA takedown to the `re3` repository, including my fork, so the code is unfortunately not available. Boo.