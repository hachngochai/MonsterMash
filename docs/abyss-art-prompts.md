# Bộ prompt hình ảnh chương III

Dùng skill `imagegen`, built-in image tool, không dùng CLI/API key. Nguồn là năm ảnh concept người chơi cung cấp trong cuộc trò chuyện. Assets đã chép vào repo; runtime không đọc thư mục ảnh sinh bên ngoài.

## Sprite nền trong suốt

Prompt chung: “Use case: background-extraction. Production 2D game sprite. Input image is the edit target, not a vague style reference. Change only background and extraction framing. Preserve the exact elaborate silhouette, proportions, richly faceted shading and color. Do not redesign or simplify into flat vector/Canvas shapes. Real transparent alpha, no checkerboard, no contact shadow, full subject with safe padding.”

| File trong `assets/sprites/abyss/` | Yêu cầu riêng |
| --- | --- |
| `minotaur.png` | Extract only the large lower-right Minotaur. Keep ivory horns, squared black muzzle, red eyes, black armor with red cracks, skull belt, red cloth and giant red-crystal double axe. Remove small Minotaur, cave and floor. |
| `flower.png` | Extract only the upper large skeletal quadruped. Keep ribcage, four bone feet, tangled roots, magenta flowers and giant purple crystal flower head. Remove the three lower duplicates and scenery. |
| `turtle.png` | Extract only the upper-left crystal turtle. Keep charcoal rock body, cyan cracks, layered white mirror shell, blue eyes, spikes and right-facing pose. Remove other three examples and water. |
| `fossil-roc.png` | Extract the left skeletal phoenix. Keep white skull/beak, purple crystal feather wings, ribcage, chest crystal, stone limbs and fossil feet. Remove all text, pedestal, ruins and every opaque gradient/cloud, including spaces between feathers and legs. |
| `roc-knight.png` | Extract the far-right scythe knight. Keep avian skull, purple spiny armor, folded crystal wings, pale chest/knee plates, feet and entire tall scythe blade. Remove all other objects, text and background. |
| `thousand-hands.png` | Four equal-width cells in one row: gold Joy, red Rage, pink Love, purple Hate. Keep each complete one-headed many-armed statue, expression, crown, detailed hands, armor, cloth and jewelry. Separate cells with transparent padding; remove architecture, floor and reflections. |

## Năm bối cảnh

Prompt chung: “Use case: precise-object-edit. Asset: 16:9 background for a 2D side-view platform combat arena. Edit the supplied concept image, preserve the elaborate richly faceted blocky painted environment style, material, palette and architectural details. Remove all creatures, bosses, people, boss-shaped statues, duplicate action examples, labels, titles and interface. Reconstruct the environment. Full-width coherent single scene, not collage. Continuous safe horizontal rocky foreground ledge; tall platforms and traps belong behind the play area. Strong layered depth and atmospheric lighting like the reference, not flat vector shapes. No characters or text.”

| File trong `assets/backgrounds/abyss/` | Yêu cầu riêng |
| --- | --- |
| `labyrinth.png` | Volcanic cave, red lava streams, distant skull gate, chains/bridges, sharp black ceiling and luminous red mushrooms. |
| `parasite.png` | Ancient purple ruins, skeletal fossils, winding roots, magenta crystal flowers and spores. |
| `lake.png` | Sapphire underground lake, blue crystal stalagmites, cyan portal/waterfall, reflective water and wet rock. |
| `echo.png` | Fossil cliff temple, broken columns and chains, arches, violet crystal flames and atmospheric depth. |
| `tomb.png` | Reincarnation tomb, terracotta columns, stairs, rune gate, chains, coffins, amber light and deep shadows. |

Prompt yêu cầu sàn ở 81% chiều cao; kết quả có sai lệch nên renderer đo riêng sàn từng ảnh và căn y=438 bằng co giãn đồng nhất/cắt khung. Không thay đổi vật lý theo ảnh. Độ trung thành tạo hình đã đối chiếu bằng mắt; ảnh dẫn xuất AI không được mô tả là bản sao giống từng pixel.
