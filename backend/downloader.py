import os
import yt_dlp

def get_cookie_file():
    cookie_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")
    if os.path.exists(cookie_path):
        return cookie_path
    return None

def get_video_info(url: str) -> dict:
    """Get video metadata without downloading."""
    cookie_file = get_cookie_file()
    opts = {
        "quiet": True,
        "skip_download": True,
    }
    if cookie_file:
        opts["cookiefile"] = cookie_file

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return {
            "title": info.get("title"),
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
            "channel": info.get("uploader"),
        }

def download_video(url: str, format: str, quality: str) -> str:
    """Download video/audio and return the file path."""
    output_path = "/tmp/downloads"
    os.makedirs(output_path, exist_ok=True)

    cookie_file = get_cookie_file()

    opts = {
        "outtmpl": f"{output_path}/%(title)s.%(ext)s",
        "quiet": True,
        "ffmpeg_location": "/usr/bin/ffmpeg",  # explicit ffmpeg path
    }

    if cookie_file:
        opts["cookiefile"] = cookie_file

    if format == "mp3":
        opts["format"] = "bestaudio/best"
        opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }]
    else:
        # Use a single format that doesn't need merging
        if quality == "best":
            opts["format"] = "best"
        else:
            opts["format"] = f"best[height<={quality}]"

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filepath = ydl.prepare_filename(info)

        if format == "mp3":
            filepath = os.path.splitext(filepath)[0] + ".mp3"

        return filepath
