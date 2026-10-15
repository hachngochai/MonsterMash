# Character artwork · 3.0.1

The dragon, lion warrior, Medusa, Goatman and Chimera designs come from artwork supplied by the game's author in this update. Game-ready PNGs preserve their block-art shapes, weapons and details. Background extraction and dragon palette variants used the built-in imagegen tool; the original references remain untouched.

- `dragons/fire.png`: crimson fire dragon, without the baked-in fireball or crown.
- `dragons/ice.png`: blue/cyan ice variant.
- `dragons/wind.png`: teal/jade wind variant.
- `dragons/earth.png`: basalt brown/ochre earth variant.
- `dragons/lightning.png`: indigo/violet with gold lightning accents.
- `dragons/ancient.png`: obsidian/ivory Yin-Yang boss, retaining the gold crown.
- `mythic/lion.png`, `medusa.png`, `goatman.png`: the three supplied character designs, extracted individually.
- `mythic/chimera.png`: the supplied Chimera, extracted from its background without the incoming bullet streak.

All sprites have real alpha transparency. Lossless PNG packaging reduces their dimensions for browser use. Combat data, hitboxes, level pools, damage and boss phases are unchanged by this art update.

## Dragon edit prompt set

Base extraction: "Preserve the exact angular chunky body, oversized square head, ivory horns and teeth, ribbed bat wings, curling spiked tail, clawed arms/feet, faceted shading and dark outlines. Remove the baked checkerboard into real alpha transparency. Remove the fireball, breath stream and detached particles in front of the mouth. Keep the whole subject visible with compact transparent padding. Do not redesign the user's artwork; no ground, backdrop, text or checkerboard."

Regular fire: retain crimson membranes, charcoal-maroon scales, tan belly, red fissures and eyes; remove the small crown while retaining both horns.

Other regular variants use the cleaned fire sprite with the same pose and proportions, no crown:

- Ice: midnight-blue scales, cyan membranes/fissures, silver-blue belly and pale-blue eyes.
- Wind: deep teal scales, jade/mint membranes/fissures, ivory-green belly and mint eyes.
- Earth: basalt-brown scales, ochre/copper membranes, amber fissures, sandstone belly and amber eyes.
- Lightning: indigo-purple scales, violet/lavender membranes, gold fissures, ivory-gold belly and pale-yellow eyes.

Ancient boss: use the original crowned reference; preserve the crown and all body details, remove the fireball/checkerboard, use obsidian-black and ivory-white body/cheek/belly panels, one charcoal wing and one ivory/silver wing, white fissures and pale-gold eyes.

The individual mythic extraction prompts are recorded in [mythic/prompts.md](mythic/prompts.md).
