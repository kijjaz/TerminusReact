/**
 * Sampler Channel
 * Represents a single monophonic voice.
 */
export default class Sampler {
    constructor(ctx, dest) {
        this.ctx = ctx;
        this.dest = dest;
        this.source = null;
        this.isPlaying = false;
        this.priority = 0;
        this.startTime = 0;
    }

    play(buffer, priority, pitch) {
        this.stop();

        this.source = this.ctx.createBufferSource();
        this.source.buffer = buffer;
        this.source.playbackRate.value = pitch;
        this.source.connect(this.dest);

        this.source.onended = () => {
            this.isPlaying = false;
            this.priority = 0;
        };

        this.source.start(0);
        this.isPlaying = true;
        this.priority = priority;
        this.startTime = this.ctx.currentTime;
    }

    stop() {
        if (this.source) {
            try {
                this.source.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
            this.source.disconnect();
            this.source = null;
        }
        this.isPlaying = false;
        this.priority = 0;
    }
}
