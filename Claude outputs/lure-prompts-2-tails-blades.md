# 루어 이미지 요청 2차 — 테일 3종 + 블레이드 2종

1차(메탈·미노우·웜·지그헤드·트레블·어시스트)는 전부 들어갔습니다.
지금 비어 있는 건 **웜 테일 3종**과 **블레이드**입니다.

테일 칩은 이미 4개(섀드·스트레이트·컬리·트윈)가 붙어 있고 **움직임은 네 가지가 다 다르게 구현돼 있습니다.**
그런데 사진은 섀드테일 한 장뿐이라, 스트레이트를 눌러도 떠는 방식만 바뀌고 그림은 섀드 그대로입니다.
아래 세 장이 오면 칩이 진짜가 됩니다.

블레이드는 지금 **달면 떨림·기포·후류가 1.55배씩 세지는 것까지만** 들어가 있고 그림이 없습니다.

---

## 0. 공통 규칙 — 1차와 동일합니다. 프롬프트 끝에 그대로 붙이세요

```
Solid flat magenta background (#FF00FF), completely uniform, no gradient.
Strict side view, subject perfectly horizontal, head facing RIGHT.
Subject centered with even margin on all sides, fully inside the frame.
No drop shadow, no ground, no table, no reflection surface.
No text, no watermark, no logo, no brand name, no packaging, no hands.
Soft even studio light from above with a thin rim highlight along the top edge.
Sharp focus, high detail, product photography. PNG, at least 1536 x 1024.
```

- **"transparent background" 라고 쓰지 마세요.** 체커무늬가 그래서 생깁니다.
- 색은 **펄 화이트 한 가지만**. 나머지 색은 제가 변환합니다.
- 웜 3종은 **섀드테일과 몸통 굵기·길이를 맞춰 주세요.** 같은 지그헤드에 꽂혀야 합니다.

---

## 1. 스트레이트 웜 — `worm_straight`

```
A 3 inch soft plastic straight tail worm for fishing, translucent pearl white
body with fine silver glitter flakes suspended inside the plastic, slender
cylindrical body tapering to a thin pointed straight tail, ribbed segments
along the body, soft wet rubbery surface with subtle subsurface light scatter,
NO hook, no jighead, no lead, body alone.
```
+ 공통 규칙

> 꼬리가 **가늘고 곧게** 끝나야 합니다. 좌우로 흔들리는 걸 옆에서 보면
> 길이가 줄었다 늘었다 하는 식으로 구현해 뒀습니다.

## 2. 컬리테일 웜 — `worm_curly`

```
A 3 inch soft plastic curly tail grub for fishing, translucent pearl white
body with fine silver glitter flakes, short fat ribbed body with a long thin
flat ribbon tail curled into a single hook-shaped curve at the rear, soft wet
rubbery surface, NO hook, no jighead, no lead, body alone.
```
+ 공통 규칙

> 말린 꼬리가 **옆에서 보이게 한 번만** 감겨야 합니다. 돌아가는 움직임으로 구현돼 있습니다.

## 3. 트윈테일 웜 — `worm_twin`

```
A 3 inch soft plastic twin tail grub for fishing, translucent pearl white body
with fine silver glitter flakes, ribbed body splitting at the rear into TWO
separate thin flat curly tails, one curving up and one curving down, soft wet
rubbery surface, NO hook, no jighead, no lead, body alone.
```
+ 공통 규칙

---

## 4. 윌로우리프 블레이드 — `blade_willow`

```
A single willow leaf spinner blade for fishing lures, polished silver nickel
finish, long narrow pointed leaf shape about 4 cm long, slightly concave with
a curved highlight down the centre, attached at its narrow top end to a small
barrel swivel and a split ring, the blade hanging free below the swivel,
blade and swivel only, NO hook, no lure body, no wire shaft.
```
+ 공통 규칙, 단 **방향만 다릅니다** — 아래 줄로 바꿔 주세요

```
Strict side view, the blade hanging straight DOWN from the swivel at the top,
swivel at the very top of the frame, blade tip at the bottom.
```

> 블레이드는 **스위벨이 위, 날이 아래**여야 합니다. 제가 그 스위벨 지점을 중심으로
> 돌립니다. 바늘처럼 링 위치를 픽셀로 찾아 붙이기 때문에 방향이 중요합니다.

## 5. 콜로라도 블레이드 — `blade_colorado`

```
A single Colorado spinner blade for fishing lures, polished brass gold finish,
wide rounded almost circular deeply cupped blade about 3 cm across, strong
curved highlight across the cup, attached at its narrow top end to a small
barrel swivel and a split ring, the blade hanging free below the swivel,
blade and swivel only, NO hook, no lure body, no wire shaft.
```
+ 공통 규칙 + 위의 "방향만 다릅니다" 줄

> 윌로우는 **빠르게 돌며 반짝이고**, 콜로라도는 **느리게 돌며 물을 세게 때립니다.**
> 두 장이 오면 블레이드 종류도 칩으로 나눠서 진동·기포·후류 세기를 다르게 줍니다.
> 한 장만 주실 거면 **윌로우**를 주세요.

---

## 받으면 제가 하는 일

| 사진 | 들어가는 곳 |
|---|---|
| `worm_straight` | `TAILS.STRAIGHT` — 좌우 흔들림, 파장 20·진폭 3.2 |
| `worm_curly` | `TAILS.CURLY` — 회전, 파장 36·진폭 6 |
| `worm_twin` | `TAILS.TWIN` — 회전, 파장 32·진폭 5.4 |
| `blade_willow` | 지그헤드 목 또는 꼬리에 달고 스위벨 중심으로 회전 |
| `blade_colorado` | 같은 자리, 느린 회전 + 큰 후류 |

블레이드는 돌아가는 걸 2D로 보여야 해서, 회전각에 따라 **가로폭을 눌렀다 폈다** 합니다
(옆에서 보면 날이 섰을 때 얇고 누웠을 때 넓습니다). 그 타이밍에 맞춰 **반짝임**도 터뜨립니다.
사진은 한 장이면 충분합니다.

## 지금 상태

- 웜 몸통은 세로 12개 띠로 잘라 **물결이 머리에서 꼬리로 흘러가게** 돼 있습니다.
  테일 사진이 바뀌어도 같은 방식이 그대로 적용됩니다.
- 그래서 위 세 장은 **몸통 굵기·길이만 섀드테일과 맞으면** 바로 갈아끼워집니다.
