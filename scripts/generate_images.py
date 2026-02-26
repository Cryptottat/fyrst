"""
FYRST Phase 2: 마스코트/브랜드 이미지 생성 스크립트
fal.ai Flux Pro + Telegram 전송
"""

import os
import sys
import json
import time
import requests
import fal_client

# ─── Credentials ─────────────────────────────────────────────────────────────
FAL_KEY = "d3d6ca9e-45ee-4215-9f78-bc1101c8d47f:a7c5379c742cf6312cc09e80d82a51de"
BOT_TOKEN = "8728084719:AAGOSNWr7_A2XXHfU2GTpP7uDSaNDPpxvqk"
CHAT_ID = "408042692"

os.environ["FAL_KEY"] = FAL_KEY

# ─── Output directory ────────────────────────────────────────────────────────
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "산출물", "이미지")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Brand constants ─────────────────────────────────────────────────────────
NEGATIVE_PROMPT = (
    "cute, kawaii, hyper-realistic, photorealistic, cartoon, anime, childish, "
    "bright colors, white background, neon, cyberpunk, text, watermark, signature, "
    "blurry, low quality, anthropomorphic, clothing on animal, standing upright"
)

STYLE_PREFIX = (
    "minimalist vector style, flat design with subtle shadows, high quality, "
    "professional brand design, dark background #0F172A, "
    "steel blue #2563EB accent lighting, amber gold #D97706 secondary accents"
)

# ─── Asset definitions ───────────────────────────────────────────────────────
ASSETS = [
    {
        "name": "logo",
        "filename": "logo.png",
        "prompt": (
            f"{STYLE_PREFIX}, steel-gray doberman pinscher guard dog, sitting pose facing forward, "
            "alert and watchful expression, one ear folded, subtle blue glow in eyes, "
            "$FYRST tag collar around neck, metallic steel-gray blue skin tone, "
            "centered composition, icon design, clean lines, "
            "dark charcoal navy background, suitable as app icon and brand logo"
        ),
        "size": "square_hd",
        "num_images": 4,
    },
    {
        "name": "twitter-profile",
        "filename": "twitter-profile.png",
        "prompt": (
            f"{STYLE_PREFIX}, steel-gray doberman guard dog head portrait, "
            "alert intense expression, one ear folded, blue glowing eyes, "
            "$FYRST tag collar, metallic steel texture, "
            "centered close-up, circular crop friendly composition, "
            "dark charcoal navy #0F172A background"
        ),
        "size": "square_hd",
        "num_images": 3,
    },
    {
        "name": "twitter-banner",
        "filename": "twitter-banner.png",
        "prompt": (
            f"{STYLE_PREFIX}, wide panoramic banner, steel vault door partially open with light leaking out, "
            "steel-gray doberman guard dog sitting beside the vault, vigilant pose, "
            "blueprint grid pattern in background, brushed metal texture, "
            "subtle gear and bolt details on vault surface, "
            "cinematic wide composition, dark atmosphere, "
            "institutional and fortified aesthetic, 3:1 aspect ratio"
        ),
        "size": "landscape_16_9",
        "num_images": 3,
    },
    {
        "name": "github-banner",
        "filename": "github-banner.png",
        "prompt": (
            f"{STYLE_PREFIX}, wide banner design, steel vault with shield emblem, "
            "steel-gray doberman guard dog in corner, watchful pose, "
            "text area on right side, blueprint grid subtle background, "
            "metallic textures, institutional design, "
            "dark charcoal navy background, 2:1 aspect ratio"
        ),
        "size": "landscape_16_9",
        "num_images": 3,
    },
    {
        "name": "community-banner",
        "filename": "community-banner.png",
        "prompt": (
            f"{STYLE_PREFIX}, community banner illustration, "
            "steel fortress wall with open gate, warm amber gold light from inside, "
            "steel-gray doberman guard dog at the gate entrance, welcoming but vigilant, "
            "blueprint grid background, dark atmosphere with inviting warmth, "
            "institutional yet approachable design"
        ),
        "size": "landscape_16_9",
        "num_images": 3,
    },
    {
        "name": "article-banner-1",
        "filename": "article-banner-1.png",
        "prompt": (
            f"{STYLE_PREFIX}, article header illustration, "
            "steel shield protecting a glowing token/coin, "
            "defense and protection theme, geometric formations, "
            "steel-gray doberman silhouette in background, "
            "dark charcoal navy background, cinematic lighting"
        ),
        "size": "landscape_16_9",
        "num_images": 2,
    },
    {
        "name": "article-banner-2",
        "filename": "article-banner-2.png",
        "prompt": (
            f"{STYLE_PREFIX}, article header illustration, "
            "abstract representation of blockchain trust and security, "
            "steel vault door mechanism with intricate gears, "
            "data visualization overlay, amber gold accent highlights, "
            "dark charcoal navy background, institutional aesthetic"
        ),
        "size": "landscape_16_9",
        "num_images": 2,
    },
]


def generate_image(prompt: str, negative_prompt: str, size: str, num_images: int = 1):
    """fal.ai Flux Pro로 이미지 생성"""
    print(f"  Generating {num_images} image(s)...")

    result = fal_client.subscribe(
        "fal-ai/flux-pro/v1.1",
        arguments={
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "image_size": size,
            "num_inference_steps": 28,
            "guidance_scale": 3.5,
            "num_images": num_images,
            "safety_tolerance": "5",
        },
    )

    urls = [img["url"] for img in result["images"]]
    return urls


def download_image(url: str, output_path: str):
    """이미지 다운로드"""
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(response.content)
    print(f"  Downloaded: {output_path}")


def send_telegram_message(text: str):
    """텔레그램 메시지 전송"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    requests.post(url, data={"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML"})


def send_telegram_photo(photo_path: str, caption: str = ""):
    """텔레그램 단일 이미지 전송"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
    with open(photo_path, "rb") as f:
        requests.post(
            url,
            data={"chat_id": CHAT_ID, "caption": caption},
            files={"photo": f},
        )


def send_telegram_media_group(photo_paths: list, caption: str = ""):
    """텔레그램 여러 이미지 한번에 전송"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMediaGroup"
    media = []
    files = {}
    for i, path in enumerate(photo_paths):
        file_key = f"photo{i}"
        media.append({
            "type": "photo",
            "media": f"attach://{file_key}",
            "caption": caption if i == 0 else "",
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
    print("FYRST Phase 2: Image Generation")
    print("=" * 60)

    send_telegram_message(
        "<b>[FYRST] Phase 2: Image Generation Started</b>\n\n"
        "Generating brand assets using fal.ai Flux Pro.\n"
        "Each asset will be sent here for review.\n"
        "Reply with feedback or 'OK' to confirm."
    )

    all_results = {}

    for asset in ASSETS:
        print(f"\n--- Generating: {asset['name']} ---")

        try:
            urls = generate_image(
                prompt=asset["prompt"],
                negative_prompt=NEGATIVE_PROMPT,
                size=asset["size"],
                num_images=asset["num_images"],
            )

            # Download all variants
            variant_paths = []
            for i, url in enumerate(urls):
                if asset["num_images"] > 1:
                    path = os.path.join(OUTPUT_DIR, f"{asset['name']}_v{i+1}.png")
                else:
                    path = os.path.join(OUTPUT_DIR, asset["filename"])
                download_image(url, path)
                variant_paths.append(path)

            all_results[asset["name"]] = variant_paths

            # Send to Telegram
            caption = f"[FYRST] {asset['name']} ({len(variant_paths)} variants)"
            if len(variant_paths) == 1:
                send_telegram_photo(variant_paths[0], caption)
            else:
                send_telegram_media_group(variant_paths, caption)

            print(f"  Sent to Telegram: {asset['name']}")
            time.sleep(2)  # Rate limit buffer

        except Exception as e:
            print(f"  ERROR generating {asset['name']}: {e}")
            send_telegram_message(f"[FYRST] Error generating {asset['name']}: {str(e)[:200]}")
            # Continue with other assets
            continue

    # Summary
    print("\n" + "=" * 60)
    print("Generation complete. Results:")
    for name, paths in all_results.items():
        print(f"  {name}: {len(paths)} variants")
    print("=" * 60)

    send_telegram_message(
        "<b>[FYRST] Phase 2: Image Generation Complete</b>\n\n"
        f"Generated {sum(len(p) for p in all_results.values())} images across {len(all_results)} assets.\n"
        "All images saved to 산출물/이미지/.\n\n"
        "Please review the images above and reply with:\n"
        "- 'OK' to confirm all\n"
        "- Specific feedback for changes"
    )

    # Select best variant for each asset (first one as default)
    print("\nSelecting best variants (using first variant as default)...")
    for asset in ASSETS:
        name = asset["name"]
        if name in all_results and len(all_results[name]) > 1:
            # Copy first variant as the canonical file
            import shutil
            src = all_results[name][0]
            dst = os.path.join(OUTPUT_DIR, asset["filename"])
            if src != dst:
                shutil.copy2(src, dst)
                print(f"  Selected: {asset['filename']} (from v1)")


if __name__ == "__main__":
    main()
