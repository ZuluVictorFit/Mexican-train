const TRACKS = {
  turn: "/audio/turn-toot.mp3",
  normal: "/audio/train-chug.mp3",
  station: "/audio/all-aboard.mp3",
  realLong: "/audio/real-all-aboard-long.mp3",
};

// Sound files and their playback are independent of the rules and the theme.
export function createSoundPlayer() {
  let context = null;
  const buffers = new Map();
  const active = new Map();
  const versions = new Map();
  const volumes = new Map();
  function unlock() {
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return false;
        context = new Audio();
      }
      if (context.state === "suspended") context.resume().catch(() => {});
      return context.state !== "closed";
    } catch {
      return false;
    }
  }
  function bufferFor(name) {
    if (!TRACKS[name] || !context) throw new Error("Sound unavailable");
    if (!buffers.has(name)) {
      const promise = fetch(TRACKS[name])
        .then((response) => {
          if (!response.ok) throw new Error("Sound unavailable");
          return response.arrayBuffer();
        })
        .then((data) => context.decodeAudioData(data))
        .catch((error) => {
          buffers.delete(name);
          throw error;
        });
      buffers.set(name, promise);
    }
    return buffers.get(name);
  }
  function preload() {
    if (!context) return;
    for (const name of Object.keys(TRACKS)) bufferFor(name).catch(() => {});
  }
  async function play(name, volume, manual = false, delay = 0) {
    if (!context && (!manual || !unlock())) return false;
    const version = versions.get(name) || 0;
    try {
      if (context.state === "suspended") await context.resume();
      if (context.state !== "running") return false;
      const buffer = await bufferFor(name);
      if ((versions.get(name) || 0) !== version) return false;
      const source = context.createBufferSource(),
        gain = context.createGain();
      gain.gain.value = Math.max(
        0,
        Math.min(1, (volumes.get(name) ?? volume) / 100),
      );
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(context.destination);
      const entries = active.get(name) || new Set();
      const entry = { source, gain };
      entries.add(entry);
      active.set(name, entries);
      source.onended = () => entries.delete(entry);
      source.start(context.currentTime + delay);
      return true;
    } catch {
      return false;
    }
  }
  function stop(name) {
    versions.set(name, (versions.get(name) || 0) + 1);
    for (const entry of active.get(name) || []) {
      try {
        entry.source.stop();
      } catch {}
    }
    active.delete(name);
  }
  function setVolume(name, value) {
    volumes.set(name, value);
    for (const entry of active.get(name) || [])
      entry.gain.gain.value = Math.max(0, Math.min(1, value / 100));
  }
  return { unlock, preload, play, stop, setVolume };
}
