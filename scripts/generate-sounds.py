"""Generate the bundled original train sounds (requires numpy, scipy and ffmpeg/flite)."""
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

RATE = 24000
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio"
OUT.mkdir(exist_ok=True)
RNG = np.random.default_rng(814)


def blank(seconds):
    return np.zeros(round(RATE * seconds), dtype=np.float64)


def add(track, start, sound, volume=1):
    pos = round(start * RATE)
    count = min(len(sound), len(track) - pos)
    if count > 0:
        track[pos:pos + count] += sound[:count] * volume


def envelope(length, attack=0.04, release=0.15):
    t = np.arange(length) / RATE
    duration = length / RATE
    return np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, duration - t) / release)


def horn(duration, base=315):
    t = np.arange(round(RATE * duration)) / RATE
    bend = 1 - 0.045 * np.exp(-t * 11)
    tone = sum(weight * np.sin(2 * np.pi * frequency * t * bend + phase)
               for frequency, weight, phase in [(base, .44, 0), (base * 1.25, .29, .5), (base * 1.5, .2, .9), (base * 2, .07, .3)])
    air = sosfilt(butter(3, [220, 1700], btype="bandpass", fs=RATE, output="sos"), RNG.standard_normal(len(t)))
    tremolo = .92 + .08 * np.sin(2 * np.pi * 5.2 * t)
    return (tone * tremolo + air * .055) * envelope(len(t), .055, .18)


def chug(duration=.3):
    t = np.arange(round(RATE * duration)) / RATE
    noise = sosfilt(butter(3, [80, 2400], btype="bandpass", fs=RATE, output="sos"), RNG.standard_normal(len(t)))
    steam = noise * np.exp(-t * 9)
    engine = np.sin(2 * np.pi * (90 * t - 35 * t * t)) * np.exp(-t * 17)
    return (steam * .55 + engine * .35) * envelope(len(t), .012, .08)


def save(name, data):
    peak = max(np.max(np.abs(data)), 0.01)
    data = np.clip(data * (.82 / peak), -1, 1)
    with tempfile.TemporaryDirectory() as folder:
        source = Path(folder) / "sound.wav"
        wavfile.write(source, RATE, (data * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(source),
                        "-codec:a", "libmp3lame", "-b:a", "96k", str(OUT / f"{name}.mp3")], check=True)


turn = blank(1.0)
add(turn, 0, horn(.25, 360), .7)
add(turn, .42, horn(.27, 360), .7)
save("turn-toot", turn)

normal = blank(2.75)
for start in [0, .34]:
    add(normal, start, chug(), .7)
add(normal, .72, horn(.42, 300), .7)
add(normal, 1.42, horn(.55, 300), .7)
save("train-chug", normal)

with tempfile.TemporaryDirectory() as folder:
    speech = Path(folder) / "aboard.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
                    "flite=text='All aboard!':voice=rms", "-af", "atempo=0.82", "-ar", str(RATE), "-ac", "1", str(speech)], check=True)
    rate, spoken = wavfile.read(speech)
    assert rate == RATE
    spoken = spoken.astype(np.float64) / 32768
    extra = blank(9.6)
    add(extra, .2, spoken, .9)
    for start in [.05, .75, 1.42]:
        add(extra, start, chug(.42), .16)
    for start in [2.25, 2.68, 3.08, 3.44]:
        add(extra, start, chug(.34), .8)
    add(extra, 4.05, horn(1.65, 245), .85)
    add(extra, 6.2, horn(2.0, 235), .85)
    save("all-aboard", extra)
