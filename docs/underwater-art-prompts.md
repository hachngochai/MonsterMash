# Hải Vực Quên Lãng — hồ sơ tạo hình

Các PNG được tạo bằng công cụ imagegen tích hợp từ ảnh tham chiếu người dùng cung cấp, có nền alpha riêng cho từng sinh vật. Ảnh bối cảnh không có quái hoặc HUD. Giữ nguyên file đầu ra; không cắt từng mảng cơ thể.

Nguồn tham chiếu: `codex-clipboard-c4feba56-923e-4705-b7f1-18e19eb68247.png`.

## piranha

Đích: `assets/sprites/underwater/piranha.png`

Prompt chính xác:

```text
Use case: background-extraction. Asset type: transparent 2D side-view game enemy sprite. Input image is the user's creature reference. Isolate ONLY the upper-left piranha, recreating its exact blocky silhouette and teal-blue rectangular armor plates, red fins, huge square open jaw, ivory teeth and angry red eye. One creature only, complete tail/fins/teeth, facing RIGHT, centered with a generous transparent margin on all sides. Keep flat 2D painted cubic game art; simplify tiny triangular facets to chunky rectangular planes, no photorealism or realistic 3D. Remove ALL ocean, bubbles, columns, shadows, split-panel lines and other creatures. Genuine alpha transparency, no checkerboard, no text, no cropped extremities. No attack projectile.
```

## pufferfish

Đích: `assets/sprites/underwater/pufferfish.png`

Prompt chính xác:

```text
Use case: background-extraction. Asset type: transparent 2D side-view game sprite. Use the user's upper-right pufferfish as exact visual reference. Isolate that ONE pufferfish, full body centered with generous empty transparent margin. Teal/navy chunky square-plated round body, ivory rectangular belly, angular gold spikes and tail, bulging square white eyes with navy pupils and small orange square mouth. Face RIGHT. Preserve the lovable nervous expression and style, but use thick cubic planes rather than tiny triangular lowpoly facets. No other creatures, scenery, water, bubbles, glow field or cast shadow. Genuine clean alpha transparency; no checkerboard, no background, no text. Complete all spikes and fins with no edge clipping.
```

## seahorse

Đích: `assets/sprites/underwater/seahorse.png`

Prompt chính xác:

```text
Use case: background-extraction. Asset type: transparent 2D side-view game sprite. Isolate ONLY the lower-left seahorse from the user's reference. One complete teal-blue armored blocky seahorse, full curled segmented angular tail and long square tubular muzzle facing RIGHT, gold crownlike dorsal spikes, ivory plated belly, angry small eye. Match original cuboid illustrated-game design. Center with generous transparent margin all sides, complete all extremities. Do not include the water projectile: empty mouth, no firing effect. Remove all ocean background, bubbles, ruins, floor and other creatures. Actual transparent alpha, no checkerboard, no glow field, no shadow, no text. Flat 2D painted rectangular block planes, no photorealistic3D or dense triangular lowpoly.
```

## twin-claw-fish

Đích: `assets/sprites/underwater/twin-claw-fish.png`

Prompt chính xác:

```text
Use case: background-extraction. Asset type: transparent 2D side-view boss sprite. Recreate and isolate ONLY the user's lower-right giant mutant fish boss: one monstrous heavy teal/navy blue rectangular armored fish with huge squared open maw, ivory angular fangs, angry glowing red eye, big tail, magenta-red dorsal fins and TWO muscular articulated fish arms each ending in three long curved block-jointed ivory claws. Face RIGHT. Match reference character faithfully and keep chunky cubic2D game illustration rather than realism or triangular lowpoly. Pose neutral swimming with two claw hands clearly separated and visible. Full creature centered, generous transparent margin, all tail/fins/claws intact, no cropped parts. Remove ocean, bubbles, projectile, other creatures and shadows. Genuine alpha transparency, no checkerboard, no scenery, no text.
```

## shallow-ruins

Đích: `assets/backgrounds/underwater/shallow-ruins.png`

Prompt chính xác:

```text
Use case: stylized-concept. Asset type: wide 16:9 2D side-view underwater action-game background, 1920x1080 composition. Use only the ocean setting from the user's reference: forgotten submerged blocky stone temple and tall squared ruin pillars, teal turquoise shallow sea, sunlight shafts from rippling surface above, distant layered blue ruins, modest pink-purple angular coral clusters and rectangular rocks at lower left/right, segmented seaweed. Crucially keep middle 65 percent of image clear open blue swimming water for gameplay; no big foreground pillars crossing action area, no actual enemies, no fish, no player, no UI, no text. Seabed near bottom 12 percent, side-view horizontal camera, cuboid hand-painted 2D style, not photorealistic or triangulated lowpoly, cinematic but readable at small game size. All detail fades into blue distance. No baked large bubbles; these will animate in code.
```
