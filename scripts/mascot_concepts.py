"""
FYRST Mascot Concept Art: 센트리(도베르만) 5가지 스타일 예시안
fal.ai Flux Pro → Telegram 전송
"""

import os
import json
import time
import requests
import fal_client

# ─── Credentials ─────────────────────────────────────────────────────────────
FAL_KEY = "d3d6ca9e-45ee-4215-9f78-bc1101c8d47f:a7c5379c742cf6312cc09e80d82a51de"
BOT_TOKEN = "8728084719:AAGOSNWr7_A2XXHfU2GTpP7uDSaNDPpxvqk"
CHAT_ID = "408042692"

os.environ["FAL_KEY"] = FAL_KEY

# ─── Output ──────────────────────────────────────────────────────────────────
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "산출물", "마스코트")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Negative prompts ────────────────────────────────────────────────────────
NEGATIVE = (
    "hyper-realistic, photorealistic, 3d render, "
    "blurry, low quality, watermark, signature, text, "
    "scary, aggressive, violent, blood, teeth showing aggressively"
)

# ─── 5 Style Concepts ────────────────────────────────────────────────────────
CONCEPTS = [
    {
        "name": "1_pixel_retro",
        "title": "Pixel Art / Retro 8-bit",
        "desc": "레트로 8비트 픽셀아트. 펌프펀/봉크 바이브. 귀엽고 장난스러운 도트 도베르만.",
        "prompt": (
            "pixel art style, 16-bit retro game character, cute doberman pinscher dog, "
            "sitting pose facing forward, one ear perked up one ear folded, "
            "wearing a small purple glowing collar with tag, "
            "mischievous playful expression with tongue slightly out, "
            "lavender purple #A78BFA glow effects, "
            "dark background #0C0C0F, pixel grid visible, "
            "game sprite aesthetic, nostalgic retro feel, "
            "simple bold shapes, limited color palette, charming and fun, "
            "suitable as crypto mascot icon, memecoin energy"
        ),
        "num_images": 3,
    },
    {
        "name": "2_doodle_sketch",
        "title": "Hand-drawn Doodle / Sketch",
        "desc": "손그림 느낌. 러프한 펜 스케치 스타일. 인디 감성 극대화. 노트에 끄적인 느낌.",
        "prompt": (
            "hand-drawn sketch style, rough pen doodle on dark paper, "
            "cute doberman pinscher dog character, sitting with head tilted, "
            "messy expressive line work, scratchy ink pen strokes, "
            "one ear up one down, big expressive eyes, "
            "wearing a collar with a small shield tag, "
            "purple and orange accent colors on dark charcoal background, "
            "notebook margin doodle aesthetic, lo-fi indie vibes, "
            "imperfect charming hand-drawn feel, sticker-like composition, "
            "whimsical personality, punk zine aesthetic"
        ),
        "num_images": 3,
    },
    {
        "name": "3_flat_bold",
        "title": "Flat Bold Vector / Sticker",
        "desc": "굵은 아웃라인의 플랫 벡터. 스티커/이모지처럼 어디든 붙일 수 있는 스타일.",
        "prompt": (
            "flat vector illustration, bold thick black outlines, sticker design, "
            "cute doberman pinscher dog character, front-facing sitting pose, "
            "simplified geometric shapes, big round eyes, "
            "one ear up one down giving it personality, "
            "small purple shield badge on collar, "
            "limited color palette: dark gray body, lavender #A78BFA accents, coral #FB923C highlights, "
            "dark background #0C0C0F, "
            "die-cut sticker aesthetic, emoji-like simplicity, "
            "mascot logo suitable for crypto project, fun approachable friendly, "
            "clean but with character, indie brand mascot"
        ),
        "num_images": 3,
    },
    {
        "name": "4_graffiti_street",
        "title": "Graffiti / Street Art",
        "desc": "스트릿아트 그래피티. 거칠고 에너지 넘치는 도베르만. 반항적 인디 에너지.",
        "prompt": (
            "street art graffiti style, spray paint texture, urban wall mural, "
            "cool doberman pinscher dog character, confident sitting pose, "
            "stylized with dripping paint effects, bold strokes, "
            "one ear up one floppy, wearing a chain collar with shield pendant, "
            "purple #A78BFA and orange #FB923C spray paint accents, "
            "dark wall background #0C0C0F, paint splatter textures, "
            "rebellious indie energy, underground crypto vibes, "
            "raw authentic street art aesthetic, tag-style elements, "
            "edgy but still approachable and fun"
        ),
        "num_images": 3,
    },
    {
        "name": "5_chibi_kawaii",
        "title": "Chibi / Kawaii Minimal",
        "desc": "초 심플 치비. 머리 크고 몸 작은 2등신. 귀엽지만 도베르만 특유의 날카로움 유지.",
        "prompt": (
            "chibi style character design, super deformed proportions, big head tiny body, "
            "cute doberman pinscher dog, sitting with slight head tilt, "
            "large expressive eyes with determined look, "
            "one pointed ear up one flopped, sharp facial features but cute overall, "
            "wearing a small glowing purple collar with shield charm, "
            "minimal flat coloring, dark steel gray fur, "
            "lavender #A78BFA and emerald #34D399 accent glows, "
            "dark background #0C0C0F, "
            "simple clean lines, mascot character sheet feel, "
            "crypto mascot design, memecoin friendly but trustworthy, "
            "multiple expressions possible from this base design"
        ),
        "num_images": 3,
    },
]


def generate_image(prompt: str, num_images: int = 1):
    """fal.ai Flux Pro로 이미지 생성"""
    result = fal_client.subscribe(
        "fal-ai/flux-pro/v1.1",
        arguments={
            "prompt": prompt,
            "negative_prompt": NEGATIVE,
            "image_size": "square_hd",
            "num_inference_steps": 28,
            "guidance_scale": 3.5,
            "num_images": num_images,
            "safety_tolerance": "5",
        },
    )
    return [img["url"] for img in result["images"]]


def download_image(url: str, output_path: str):
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(response.content)


def send_telegram_message(text: str):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    requests.post(url, data={"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML"})


def send_telegram_media_group(photo_paths: list, caption: str = ""):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMediaGroup"
    media = []
    files = {}
    for i, path in enumerate(photo_paths):
        file_key = f"photo{i}"
        media.append({
            "type": "photo",
            "media": f"attach://{file_key}",
            "caption": caption if i == 0 else "",
            "parse_mode": "HTML" if i == 0 else None,
        })
        files[file_key] = open(path, "rb")

    requests.post(
        url,
        data={"chat_id": CHAT_ID, "media": json.dumps(media)},
        files=files,
    )
    for f in files.values():
        f.close()


def main():
    print("=" * 60)
    print("FYRST Mascot Concepts: 5 Styles x 3 Variants")
    print("=" * 60)

    send_telegram_message(
        "<b>🐕 [FYRST] 센트리 마스코트 예시안 5종</b>\n\n"
        "5가지 스타일로 도베르만 마스코트 생성 중...\n"
        "각 스타일별 3개 변형을 보내드립니다.\n\n"
        "맘에 드는 스타일 번호로 답해주세요!"
    )

    for concept in CONCEPTS:
        print(f"\n--- {concept['title']} ---")
        print(f"  {concept['desc']}")

        try:
            urls = generate_image(concept["prompt"], concept["num_images"])

            paths = []
            for i, url in enumerate(urls):
                path = os.path.join(OUTPUT_DIR, f"{concept['name']}_v{i+1}.png")
                download_image(url, path)
                paths.append(path)
                print(f"  Downloaded: v{i+1}")

            caption = (
                f"<b>#{concept['name'].split('_')[0]} {concept['title']}</b>\n"
                f"{concept['desc']}"
            )
            send_telegram_media_group(paths, caption)
            print(f"  Sent to Telegram!")

            time.sleep(3)

        except Exception as e:
            print(f"  ERROR: {e}")
            send_telegram_message(f"❌ Error generating {concept['title']}: {str(e)[:200]}")
            continue

    send_telegram_message(
        "<b>🐕 [FYRST] 마스코트 예시안 완료!</b>\n\n"
        "5가지 스타일:\n"
        "1️⃣ Pixel Art / Retro 8-bit\n"
        "2️⃣ Hand-drawn Doodle / Sketch\n"
        "3️⃣ Flat Bold Vector / Sticker\n"
        "4️⃣ Graffiti / Street Art\n"
        "5️⃣ Chibi / Kawaii Minimal\n\n"
        "번호로 골라주세요! 믹스도 OK (예: '3번 베이스 + 1번 느낌')"
    )

    print("\nDone!")


if __name__ == "__main__":
    main()
